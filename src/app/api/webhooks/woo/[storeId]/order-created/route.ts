import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import {
  orderWebhookSchema,
  recordOrderConfirmationOutcome,
  sendOrderConfirmation,
} from "@/lib/whatsapp/order-confirmation";
import { verifyWooWebhookSignature } from "@/lib/woo/webhook-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-to-server from a merchant's own WooCommerce store: an order.created
 * event, registered per store from src/app/api/whatsapp/order-confirmations/
 * route.ts. Modelled on src/app/api/billing/webhook/route.ts's verify-raw-
 * body → dedupe → process shape — the other place in this codebase that
 * trusts an unauthenticated POST from a third party.
 *
 * The store id lives in the URL path rather than being inferred from a
 * source header, so lookup is one indexed query and the delivery_url
 * registered with WooCommerce is unique per store by construction.
 */
export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;

  const [store] = await db()<StoreRow[]>`
    select id, user_id, url, consumer_key, consumer_secret,
           order_confirmation_enabled, order_confirmation_enabled_at, order_confirmation_webhook_secret
    from stores
    where id = ${storeId}
  `;

  // Don't distinguish "no such store" from "never configured" to an unauthenticated caller.
  if (!store?.order_confirmation_webhook_secret) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Raw text, not JSON — the signature is over the exact bytes WooCommerce
  // sent, and re-serializing parsed JSON can change whitespace and silently
  // break verification (same reasoning as the Razorpay webhook).
  const rawBody = await request.text();
  const signature = request.headers.get("x-wc-webhook-signature") ?? "";
  if (!signature || !verifyWooWebhookSignature(rawBody, signature, store.order_confirmation_webhook_secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  // Defense in depth: the webhook should have been deleted from WooCommerce
  // the moment this was disabled, but a queued redelivery, or a race with
  // the disable toggle, must not send.
  if (!store.order_confirmation_enabled) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = orderWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    // Acknowledge rather than trigger WooCommerce's retry loop for a shape
    // this app doesn't recognise — some webhook topics fire on updates too,
    // and a ping/test delivery has no order body at all.
    return NextResponse.json({ ok: true, skipped: "unrecognised payload" });
  }
  const order = parsed.data;

  // WooCommerce delivers at-least-once and can redeliver after downtime;
  // this is the idempotency check.
  const [already] = await db()`
    select 1 from whatsapp_order_confirmations where store_id = ${storeId} and woo_order_id = ${order.id}
  `;
  if (already) return NextResponse.json({ ok: true, duplicate: true });

  /*
   * Never anything from before order confirmations were turned on for this
   * store — the same enabled_at boundary abandoned-checkout recovery uses,
   * applied here as insurance against a stale/queued redelivery rather than
   * a backlog-sweep concern (a webhook only ever fires on genuinely new
   * orders). A missing timestamp excludes the order rather than including
   * it, so a data gap fails toward not sending.
   */
  const enabledAt = store.order_confirmation_enabled_at?.getTime();
  const createdAt = new Date(order.date_created_gmt || order.date_created!).getTime();
  if (enabledAt === undefined || createdAt < enabledAt) {
    await recordOrderConfirmationOutcome(store.user_id, storeId, order.id, {
      status: "skipped",
      reason: "Predates order confirmations being enabled for this store.",
    });
    return NextResponse.json({ ok: true, skipped: "before enabled_at" });
  }

  const outcome = await sendOrderConfirmation(store, order);
  await recordOrderConfirmationOutcome(store.user_id, storeId, order.id, outcome);

  return NextResponse.json({ ok: true, ...outcome });
}

interface StoreRow {
  id: string;
  user_id: string;
  url: string;
  consumer_key: string;
  consumer_secret: string;
  order_confirmation_enabled: boolean;
  order_confirmation_enabled_at: Date | null;
  order_confirmation_webhook_secret: string | null;
}
