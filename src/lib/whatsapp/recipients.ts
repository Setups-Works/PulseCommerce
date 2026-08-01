import { computeAnalytics } from "@/lib/analytics/engine";
import { customerKey } from "@/lib/analytics/helpers";
import type { CustomerRecord } from "@/lib/analytics/types";
import { applyAudience, type AudienceFilter } from "@/lib/audience";
import { loadSnapshot } from "@/lib/store/snapshot";
import type { StoreSnapshot } from "@/lib/woo/types";
import { readWhatsAppConfig, type WhatsAppConfig } from "./config";
import { readOptOutSet } from "./opt-out";
import { resolveRecipients, type RecipientContext, type ResolveResult } from "./broadcast";

/**
 * Server-side audience resolution.
 *
 * The browser sends a filter and a date range, never a list of numbers. This
 * recomputes the same customer records the campaign page is showing, applies
 * the same filter, then attaches phone numbers from the snapshot. Nothing a
 * client sends can widen the audience beyond real customers of the connected
 * store, and the opt-out list is applied here rather than in the UI.
 */

export interface AudienceRequest {
  filter: AudienceFilter;
  range?: { from: string; to: string };
}

/** Maps customer key to their most recent billing phone. */
export function phoneMapFromSnapshot(snapshot: StoreSnapshot): Map<string, string> {
  const map = new Map<string, string>();
  // Orders arrive oldest-first, so a later write wins and the freshest number
  // is the one kept — matching how the customer record picks its phone.
  for (const order of snapshot.orders) {
    const phone = order.billing?.phone?.trim();
    if (phone) map.set(customerKey(order), phone);
  }
  return map;
}

export interface ResolvedAudience extends ResolveResult {
  config: WhatsAppConfig;
  audience: CustomerRecord[];
  currency: string;
}

export async function resolveAudience(request: AudienceRequest): Promise<ResolvedAudience> {
  const config = await readWhatsAppConfig();
  if (!config) {
    throw new Error("No WhatsApp gateway is connected. Add one in Settings first.");
  }

  const snapshot = await loadSnapshot();
  const analytics = computeAnalytics(snapshot, { range: request.range });

  const audience = applyAudience(analytics.customers.records, request.filter);
  const [phoneByKey, optedOut] = [phoneMapFromSnapshot(snapshot), await readOptOutSet()];

  return {
    ...resolveRecipients(audience, phoneByKey, optedOut, config, contextFrom(snapshot, analytics.meta.currency)),
    config,
    audience,
    currency: analytics.meta.currency,
  };
}

/**
 * Catalogue lookup for template variables.
 *
 * Keyed on the lowercased product name, because that is what an order line item
 * carries — the line item's product_id is unreliable once a product has been
 * replaced or a variation renamed.
 */
function contextFrom(snapshot: StoreSnapshot, currency: string): RecipientContext {
  const products = new Map<string, { url: string; image: string; category: string }>();
  for (const product of snapshot.products) {
    if (!product.name) continue;
    products.set(product.name.toLowerCase(), {
      url: product.permalink ?? "",
      image: product.images?.[0]?.src ?? "",
      category: product.categories?.[0]?.name ?? "",
    });
  }

  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  });

  return {
    products,
    storeName: snapshot.storeName,
    formatMoney: (value) => money.format(value),
  };
}

/** Short description of a filter, for the broadcast history list. */
export function describeAudience(filter: AudienceFilter, size: number): string {
  const parts: string[] = [];
  if (filter.segments.length) parts.push(filter.segments.join(", "));
  if (filter.tiers.length) parts.push(`${filter.tiers.join("/")} tier`);
  if (filter.minOrders !== null) parts.push(`${filter.minOrders}+ orders`);
  if (filter.minSpend !== null) parts.push(`spent ${filter.minSpend}+`);
  if (filter.churnRiskMin !== null) parts.push(`churn ≥ ${filter.churnRiskMin}`);
  if (filter.recencyMax !== null) parts.push(`seen in ${filter.recencyMax}d`);
  if (filter.recencyMin !== null) parts.push(`quiet ${filter.recencyMin}d+`);
  if (filter.countries.length) parts.push(filter.countries.join(", "));
  if (filter.boughtProduct) parts.push(`bought "${filter.boughtProduct}"`);
  if (filter.accountType !== "any") parts.push(filter.accountType);

  const label = parts.length ? parts.join(" · ") : "All customers";
  return `${label} (${size.toLocaleString()})`;
}
