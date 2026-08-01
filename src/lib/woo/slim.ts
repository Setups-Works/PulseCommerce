import type { StoreSnapshot, WooOrder } from "./types";

/**
 * Strips everything the analytics engine never reads.
 *
 * WooCommerce's `_fields` parameter does not reach into nested arrays, so every
 * line item still arrives carrying its tax breakdown, meta_data and a full
 * image object. On a real store that was 81% of the payload: 429KB per 100
 * orders became 83KB, and the whole 20,500-order history gzips to under 2MB,
 * which is the difference between a cacheable snapshot and one that has to be
 * re-pulled on every cold start.
 */
export function slimSnapshot(snapshot: StoreSnapshot): StoreSnapshot {
  snapshot.orders = snapshot.orders.map(slimOrder);

  // Products are few, but the same reasoning applies to their heaviest fields.
  for (const product of snapshot.products) {
    product.images = [];
  }

  return snapshot;
}

function slimOrder(order: WooOrder): WooOrder {
  const billing = order.billing ?? {};

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    currency: order.currency,
    date_created: order.date_created,
    date_created_gmt: order.date_created_gmt,
    date_paid: order.date_paid,
    date_completed: order.date_completed,
    discount_total: order.discount_total,
    shipping_total: order.shipping_total,
    total_tax: order.total_tax,
    total: order.total,
    customer_id: order.customer_id,
    // Only billing is read; the shipping address is never grouped or displayed.
    billing: {
      first_name: billing.first_name,
      last_name: billing.last_name,
      company: billing.company,
      city: billing.city,
      state: billing.state,
      country: billing.country,
      email: billing.email,
      // Kept for WhatsApp sending. It stays server-side: the analytics payload
      // carries only whether a customer is reachable, never the number, and a
      // send resolves numbers from the snapshot at the moment it runs.
      phone: billing.phone,
    },
    shipping: {},
    payment_method: order.payment_method,
    payment_method_title: order.payment_method_title,
    line_items: (order.line_items ?? []).map((li) => ({
      id: li.id,
      name: li.name,
      product_id: li.product_id,
      variation_id: li.variation_id,
      quantity: li.quantity,
      subtotal: li.subtotal,
      total: li.total,
      total_tax: li.total_tax,
      sku: li.sku,
      price: li.price,
    })),
    coupon_lines: (order.coupon_lines ?? []).map((c) => ({
      id: c.id,
      code: c.code,
      discount: c.discount,
    })),
    refunds: (order.refunds ?? []).map((r) => ({ id: r.id, reason: r.reason, total: r.total })),
    // Attribution is already normalised onto the order by this point.
    attribution: order.attribution,
  };
}
