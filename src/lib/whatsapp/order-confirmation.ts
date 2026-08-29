import { z } from "zod";
import { db } from "@/lib/db/client";
import { checkSendAllowance, recordSend } from "@/lib/billing/usage";
import { isSessionSendable, WhatsAppClient } from "@/lib/whatsapp/client";
import { readWhatsAppConfig } from "@/lib/whatsapp/config";
import { readOptOutSetStrict } from "@/lib/whatsapp/opt-out";
import { normalisePhone } from "@/lib/whatsapp/phone";
import { WooClient } from "@/lib/woo/client";
import type { WooProduct } from "@/lib/woo/types";

/**
 * The WhatsApp "thank you" message sent the moment a new order arrives via
 * the order.created webhook (see
 * src/app/api/webhooks/woo/[storeId]/order-created/route.ts). This is
 * WhatsApp send site #6 — it follows the same no-shared-middleware
 * discipline as the other five (src/lib/whatsapp/CLAUDE.md): allowance,
 * session sendability, and opt-out are all checked inline, here, not by a
 * wrapper.
 */

/**
 * A narrow, defensive schema for a webhook delivery — not the same shape as
 * src/lib/woo/types.ts's WooOrder, which is maintained against the
 * `_fields`-trimmed REST *fetch* response. A webhook delivery is
 * WooCommerce's own full, untrimmed order representation, and this has not
 * yet been checked against one real delivery (see the order-confirmations
 * plan's Verification section) — keep this defensive rather than assume
 * more fields are reliably present than confirmed.
 */
export const orderWebhookSchema = z
  .object({
    id: z.number(),
    number: z.string().optional(),
    currency: z.string().optional(),
    total: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    billing: z
      .object({
        first_name: z.string().optional(),
        phone: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
    line_items: z
      .array(
        z.object({
          product_id: z.number(),
          name: z.string().optional(),
          quantity: z.number().optional(),
        }),
      )
      .optional(),
  })
  .refine((order) => Boolean(order.date_created_gmt || order.date_created), {
    message: "An order webhook must carry a creation date.",
  });

export type OrderWebhookPayload = z.infer<typeof orderWebhookSchema>;

export interface OrderConfirmationStore {
  id: string;
  user_id: string;
  url: string;
  consumer_key: string;
  consumer_secret: string;
}

export type OrderConfirmationOutcome =
  | { status: "sent" }
  | { status: "skipped"; reason: string };

/**
 * The first line item's product photo.
 *
 * A direct by-id read against `woo_products` — not routed through
 * src/lib/woo/mirror.ts's readSnapshot(), which reassembles the entire
 * products/orders/customers snapshot and is documented as expensive on
 * nearly every cache miss. One row by primary key is the right-sized read
 * here. The live fallback only matters for a product created and ordered
 * inside one ~10-minute incremental-sync window.
 */
async function resolveLineItemImage(
  storeId: string,
  lineItems: { product_id: number }[],
  woo: WooClient,
): Promise<{ url: string; alt: string } | null> {
  const productId = lineItems[0]?.product_id;
  if (!productId) return null;

  const [mirrored] = await db()<{ raw: WooProduct }[]>`
    select raw from woo_products where store_id = ${storeId} and id = ${productId}
  `;
  const fromMirror = mirrored?.raw.images?.[0];
  if (fromMirror) return { url: fromMirror.src, alt: fromMirror.alt || mirrored.raw.name };

  const live = await woo.getProduct(productId).catch(() => null);
  const fromLive = live?.images?.[0];
  return fromLive ? { url: fromLive.src, alt: fromLive.alt || live.name } : null;
}

function composeThankYouMessage(order: OrderWebhookPayload, storeName: string): string {
  const greeting = order.billing?.first_name ? `Hi ${order.billing.first_name}, ` : "Hi, ";
  return (
    `${greeting}thank you for your order #${order.number || order.id} from ${storeName}!\n\n` +
    `We're getting it ready and will let you know as soon as it ships.`
  );
}

/**
 * Sends the confirmation, or reports why it didn't. Never throws for an
 * expected skip reason — only for something the caller genuinely can't
 * anticipate, and even the gateway send itself is wrapped so a delivery
 * failure comes back as a skip too.
 */
export async function sendOrderConfirmation(
  store: OrderConfirmationStore,
  order: OrderWebhookPayload,
): Promise<OrderConfirmationOutcome> {
  if (!order.line_items?.length) {
    return { status: "skipped", reason: "Order had no line items." };
  }

  const config = await readWhatsAppConfig(store.user_id);
  if (!config) return { status: "skipped", reason: "No WhatsApp gateway is connected." };

  const normalised = normalisePhone(order.billing?.phone, {
    defaultDialCode: config.defaultDialCode,
    country: order.billing?.country,
  });
  if (!normalised) return { status: "skipped", reason: "Phone number could not be read." };

  // Strict: "used by anything that is about to send" per opt-out.ts's own doc comment.
  const optedOut = await readOptOutSetStrict(store.user_id);
  if (optedOut.has(normalised.e164)) {
    return { status: "skipped", reason: "Number is on the opt-out list." };
  }

  const allowance = await checkSendAllowance(store.user_id);
  if (!allowance.allowed) {
    return { status: "skipped", reason: allowance.reason ?? "Monthly message limit reached." };
  }

  const client = new WhatsAppClient(config);
  const session = await client.ensureSendable();
  if (!isSessionSendable(session)) {
    return { status: "skipped", reason: `WhatsApp session is not ready (status "${session.status}").` };
  }

  const woo = new WooClient({
    url: store.url,
    consumerKey: store.consumer_key,
    consumerSecret: store.consumer_secret,
  });
  const image = await resolveLineItemImage(store.id, order.line_items, woo).catch(() => null);
  const caption = composeThankYouMessage(order, store.url);

  try {
    if (image) {
      await client.sendImage(normalised.chatId, image.url, caption);
    } else {
      // Graceful degradation: still confirm the order even with no product photo available.
      await client.sendText(normalised.chatId, caption);
    }
    await recordSend(store.user_id);
    return { status: "sent" };
  } catch (error) {
    return {
      status: "skipped",
      reason: error instanceof Error ? error.message : "The message could not be sent.",
    };
  }
}

/** Records what happened, for the settings page and for redelivery/dedupe. */
export async function recordOrderConfirmationOutcome(
  userId: string,
  storeId: string,
  wooOrderId: number,
  outcome: OrderConfirmationOutcome,
): Promise<void> {
  await db()`
    insert into whatsapp_order_confirmations (user_id, store_id, woo_order_id, status, skip_reason, sent_at)
    values (
      ${userId}, ${storeId}, ${wooOrderId}, ${outcome.status},
      ${outcome.status === "skipped" ? outcome.reason : null},
      ${outcome.status === "sent" ? new Date().toISOString() : null}
    )
    on conflict (store_id, woo_order_id) do nothing
  `;
}
