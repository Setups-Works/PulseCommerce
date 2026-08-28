import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { checkSendAllowance, recordSend } from "@/lib/billing/usage";
import { isSessionSendable, WhatsAppClient } from "@/lib/whatsapp/client";
import { readWhatsAppConfig } from "@/lib/whatsapp/config";
import { readOptOutSet } from "@/lib/whatsapp/opt-out";
import { normalisePhone } from "@/lib/whatsapp/phone";
import { WooClient } from "@/lib/woo/client";
import type { WooOrder } from "@/lib/woo/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MIN_AGE_MS = 30 * 60 * 1000;
/** Past this, a still-pending order is stuck rather than freshly abandoned — stop reconsidering it. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Recovers checkouts left pending, over WhatsApp.
 *
 * Called by Supabase's scheduler every five minutes (see the `abandoned-
 * checkouts` cron.job in supabase/migrations/20260828124357_abandoned_
 * checkouts.sql) — the same CRON_SECRET mechanism as sync-stores and
 * advance-flows, just far more often, because a 30-minute window is far
 * tighter than either of those need.
 *
 * Reads WooCommerce live, not the mirror: the regular sync runs every two
 * hours, which is far too infrequent for this, and every-five-minutes syncs
 * for every tenant would be real load on stores that never asked for this
 * feature. Only stores with abandoned_checkout_enabled make this call at all.
 */
export async function POST(request: Request) {
  const denied = unauthorized(request);
  if (denied) return denied;

  const stores = await db()<StoreRow[]>`
    select id, user_id, url, consumer_key, consumer_secret, abandoned_checkout_enabled_at
    from stores
    where abandoned_checkout_enabled
  `;

  const results = [];
  for (const store of stores) {
    try {
      results.push(await checkStore(store));
    } catch (error) {
      // One store's WooCommerce being unreachable must not stop the rest.
      results.push({
        store: store.url,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ ran: results.length, results });
}

/** Manual runs and monitoring. Same work, same guard. */
export async function GET(request: Request) {
  return POST(request);
}

/** Same constant-time CRON_SECRET check as /api/cron/sync — a timing signal here is a way to guess the secret. */
function unauthorized(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set, so abandoned-checkout recovery is disabled." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (presented.length !== secret.length) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= presented.charCodeAt(i) ^ secret.charCodeAt(i);
  if (diff !== 0) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  return null;
}

interface StoreRow {
  id: string;
  user_id: string;
  url: string;
  consumer_key: string;
  consumer_secret: string;
  abandoned_checkout_enabled_at: Date | null;
}

async function checkStore(store: StoreRow) {
  const now = Date.now();
  const woo = new WooClient({
    url: store.url,
    consumerKey: store.consumer_key,
    consumerSecret: store.consumer_secret,
  });

  const orders = await woo.getAbandonedOrders(
    {
      status: "pending,on-hold,failed",
      after: isoSeconds(new Date(now - MAX_AGE_MS)),
      orderby: "date",
      order: "desc",
    },
    2,
  );

  /*
   * Never anything from before recovery was turned on for this store — a
   * store can have real pending orders that predate this feature existing
   * for it at all, and the point of the enabled_at boundary is that turning
   * the switch on never sweeps up that backlog as a batch. A missing
   * timestamp excludes every order rather than none, so a data gap fails
   * toward sending nothing instead of toward a surprise batch.
   */
  const enabledAt = store.abandoned_checkout_enabled_at?.getTime();

  const due = orders.filter((order) => {
    const createdAt = new Date(order.date_created_gmt || order.date_created).getTime();
    const age = now - createdAt;
    if (enabledAt === undefined || createdAt < enabledAt) return false;
    return age >= MIN_AGE_MS && age <= MAX_AGE_MS;
  });

  if (due.length === 0) {
    return { store: store.url, ok: true, checked: orders.length, messaged: 0, skipped: 0 };
  }

  // Recently-handled order ids for this tenant, bounded to the same window —
  // avoids re-messaging the same still-pending order on the next tick.
  const handledRows = await db()<{ woo_order_id: string }[]>`
    select woo_order_id from whatsapp_abandoned_checkouts
    where user_id = ${store.user_id} and created_at >= now() - interval '25 hours'
  `;
  const handled = new Set(handledRows.map((r) => Number(r.woo_order_id)));
  const candidates = due.filter((order) => !handled.has(order.id));

  if (candidates.length === 0) {
    return { store: store.url, ok: true, checked: orders.length, messaged: 0, skipped: 0 };
  }

  const config = await readWhatsAppConfig(store.user_id);
  const optedOut = await readOptOutSet(store.user_id);
  const client = config ? new WhatsAppClient(config) : null;

  let messaged = 0;
  let skipped = 0;

  for (const order of candidates) {
    if (!config || !client) {
      await recordSkip(store.user_id, order.id, "No WhatsApp gateway is connected.");
      skipped += 1;
      continue;
    }

    const normalised = normalisePhone(order.billing.phone, {
      defaultDialCode: config.defaultDialCode,
      country: order.billing.country,
    });
    if (!normalised) {
      await recordSkip(store.user_id, order.id, "Phone number could not be read.");
      skipped += 1;
      continue;
    }
    if (optedOut.has(normalised.e164)) {
      await recordSkip(store.user_id, order.id, "Number is on the opt-out list.");
      skipped += 1;
      continue;
    }

    /*
     * A limit reached here stops the whole tick rather than skipping this one
     * order: whatsapp_abandoned_checkouts suppresses retry on a recorded row
     * for ~25h, which outlives an order's own 24h eligibility window — a
     * limit-driven skip here would become a permanent miss, not a deferred
     * one. Leaving the order unrecorded means the next tick (once the month
     * rolls over or the plan is upgraded) can still try it.
     */
    const allowance = await checkSendAllowance(store.user_id);
    if (!allowance.allowed) break;

    try {
      const session = await client.ensureSendable();
      if (!isSessionSendable(session)) {
        await recordSkip(
          store.user_id,
          order.id,
          `WhatsApp session is not ready (status "${session.status}").`,
        );
        skipped += 1;
        continue;
      }

      await client.sendText(normalised.chatId, renderMessage(order, store.url));
      await recordMessaged(store.user_id, order.id);
      await recordSend(store.user_id);
      messaged += 1;
    } catch (error) {
      await recordSkip(
        store.user_id,
        order.id,
        error instanceof Error ? error.message : "The message could not be sent.",
      );
      skipped += 1;
    }
  }

  return { store: store.url, ok: true, checked: orders.length, messaged, skipped };
}

/** WooCommerce's own "resume checkout" URL — takes the customer straight back to paying for this order. */
function renderMessage(order: WooOrder, storeUrl: string): string {
  const items = order.line_items.map((item) => `${item.quantity}x ${item.name}`).join(", ");
  const greeting = order.billing.first_name ? `Hi ${order.billing.first_name}, ` : "Hi, ";
  const payUrl = order.order_key
    ? `${storeUrl.replace(/\/+$/, "")}/checkout/order-pay/${order.id}/?pay_for_order=true&key=${order.order_key}`
    : storeUrl;

  return (
    `${greeting}you left ${items} in your cart (${order.currency} ${order.total}).\n\n` +
    `Complete your order here:\n${payUrl}`
  );
}

async function recordMessaged(userId: string, orderId: number): Promise<void> {
  await db()`
    insert into whatsapp_abandoned_checkouts (user_id, woo_order_id, status, messaged_at)
    values (${userId}, ${orderId}, 'messaged', now())
    on conflict (user_id, woo_order_id) do nothing
  `;
}

async function recordSkip(userId: string, orderId: number, reason: string): Promise<void> {
  await db()`
    insert into whatsapp_abandoned_checkouts (user_id, woo_order_id, status, skip_reason)
    values (${userId}, ${orderId}, 'skipped', ${reason})
    on conflict (user_id, woo_order_id) do nothing
  `;
}

/** WooCommerce wants `YYYY-MM-DDTHH:MM:SS`, and rejects a trailing Z. */
function isoSeconds(date: Date): string {
  return date.toISOString().slice(0, 19);
}
