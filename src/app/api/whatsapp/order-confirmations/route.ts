import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { requireStore, requireWrite } from "@/lib/auth/tenant";
import { describeCallbackProblem, publicAppUrl } from "@/lib/woo/app-url";
import { WooApiError, WooClient } from "@/lib/woo/client";
import type { WooWebhook } from "@/lib/woo/types";
import { generateWebhookSecret } from "@/lib/woo/webhook-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WhatsApp order confirmations: the on/off toggle and the recent history.
 *
 * Unlike abandoned-checkout recovery's toggle (a plain flag flip — the work
 * happens on an unrelated cron schedule), turning this on here actually
 * registers a WooCommerce webhook, and turning it off removes it. See
 * src/app/api/webhooks/woo/[storeId]/order-created/route.ts for the delivery
 * side.
 *
 * No phone number is returned here, matching the rest of this API: a row
 * says what happened to an order, not who it happened to.
 */

interface Row {
  woo_order_id: string;
  status: "sent" | "skipped";
  skip_reason: string | null;
  sent_at: Date | null;
  created_at: Date;
}

export async function GET(request: Request) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;
  const { store } = resolved.value;

  const rows = await db()<Row[]>`
    select woo_order_id, status, skip_reason, sent_at, created_at
    from whatsapp_order_confirmations
    where store_id = ${store.id}
    order by created_at desc
    limit 100
  `;

  return NextResponse.json({
    enabled: store.orderConfirmationEnabled,
    storeUrl: store.url,
    items: rows.map((row) => ({
      orderId: Number(row.woo_order_id),
      status: row.status,
      skipReason: row.skip_reason,
      sentAt: row.sent_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
    })),
  });
}

const patchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(request: Request) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;

  const denied = requireWrite(resolved.value.tenant);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A boolean `enabled` is required." }, { status: 422 });
  }

  const { store } = resolved.value;

  if (parsed.data.enabled) {
    const appUrl = publicAppUrl(request);
    const problem = describeCallbackProblem(appUrl);
    if (problem) {
      return NextResponse.json({ error: describeProblem(problem, appUrl) }, { status: 422 });
    }

    const woo = new WooClient({
      url: store.url,
      consumerKey: store.consumerKey,
      consumerSecret: store.consumerSecret,
    });
    const secret = generateWebhookSecret();
    const deliveryUrl = `${appUrl}/api/webhooks/woo/${store.id}/order-created`;

    // Two webhooks, one shared secret and delivery URL: order.created alone
    // fires before an off-site payment gateway has confirmed anything, so
    // order.updated is what actually delivers the status transition into
    // "paid" for any order that didn't start out that way (see the webhook
    // route for the status gate this pair exists to feed).
    let createdWebhook: WooWebhook;
    try {
      createdWebhook = await woo.createWebhook({
        name: "PulseCommerce — order confirmation (created)",
        topic: "order.created",
        deliveryUrl,
        secret,
      });
    } catch (error) {
      // Don't flip the flag on failure — an "enabled" store with no live
      // webhook behind it would be a silent no-op.
      return NextResponse.json(
        {
          error:
            error instanceof WooApiError
              ? error.message
              : "Could not register the webhook with WooCommerce.",
        },
        { status: 502 },
      );
    }

    let updatedWebhook: WooWebhook;
    try {
      updatedWebhook = await woo.createWebhook({
        name: "PulseCommerce — order confirmation (updated)",
        topic: "order.updated",
        deliveryUrl,
        secret,
      });
    } catch (error) {
      // The pair is all-or-nothing: an order.created webhook with no
      // order.updated behind it would send confirmations for COD-style
      // orders (already "processing" on creation) but silently never send
      // for any gateway order that starts "pending" — worse than not
      // enabling at all, because it looks like it's working.
      await woo.deleteWebhook(createdWebhook.id).catch(() => {});
      return NextResponse.json(
        {
          error:
            error instanceof WooApiError
              ? error.message
              : "Could not register the second webhook with WooCommerce.",
        },
        { status: 502 },
      );
    }

    await db()`
      update stores
         set order_confirmation_enabled = true,
             order_confirmation_enabled_at = now(),
             order_confirmation_webhook_id = ${createdWebhook.id},
             order_confirmation_update_webhook_id = ${updatedWebhook.id},
             order_confirmation_webhook_secret = ${secret}
       where id = ${store.id}
    `;
    return NextResponse.json({ enabled: true });
  }

  // Disable: flip the flag off locally regardless of whether the
  // WooCommerce-side cleanup below succeeds — a merchant must be able to
  // stop this even if their store has become unreachable.
  const [row] = await db()<{
    order_confirmation_webhook_id: number | null;
    order_confirmation_update_webhook_id: number | null;
  }[]>`
    select order_confirmation_webhook_id, order_confirmation_update_webhook_id
    from stores where id = ${store.id}
  `;

  let warning: string | undefined;
  const webhookIds = [row?.order_confirmation_webhook_id, row?.order_confirmation_update_webhook_id].filter(
    (id): id is number => id !== null && id !== undefined,
  );
  if (webhookIds.length > 0) {
    const woo = new WooClient({
      url: store.url,
      consumerKey: store.consumerKey,
      consumerSecret: store.consumerSecret,
    });
    const results = await Promise.allSettled(webhookIds.map((id) => woo.deleteWebhook(id)));
    if (results.some((r) => r.status === "rejected")) {
      warning =
        "Turned off, but at least one webhook could not be removed from WooCommerce — " +
        "remove it manually under WooCommerce → Settings → Advanced → Webhooks.";
    }
  }

  await db()`
    update stores
       set order_confirmation_enabled = false,
           order_confirmation_webhook_id = null,
           order_confirmation_update_webhook_id = null,
           order_confirmation_webhook_secret = null
     where id = ${store.id}
  `;

  return NextResponse.json({ enabled: false, warning });
}

function describeProblem(code: string, appUrl: string): string {
  switch (code) {
    case "https_required":
      return "WooCommerce refuses to deliver webhooks to a plain-HTTP address. Set APP_URL to your public HTTPS address and try again.";
    case "not_reachable":
      return `WooCommerce delivers this webhook by calling ${appUrl} from your store's own server, so a localhost or private-network address can never receive it. Set APP_URL to a public HTTPS address and try again.`;
    case "bad_app_url":
      return "APP_URL could not be parsed. Set it to a full address including the scheme, for example https://analytics.example.com.";
    default:
      return "This app is not reachable from your WooCommerce store yet.";
  }
}
