import type { OrderAttribution, WooOrder } from "./types";

/**
 * WooCommerce Order Attribution lives in `_wc_order_attribution_*` meta.
 * Everything else on an order's meta is plugin bookkeeping (invoice numbers,
 * tracking flags) that would triple the cache size for no analytical value, so
 * we normalise these keys and drop the rest at ingest.
 */
const PREFIX = "_wc_order_attribution_";

export const ATTRIBUTION_META_KEYS = [
  "source_type",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "referrer",
  "device_type",
  "session_pages",
  "session_count",
].map((k) => `${PREFIX}${k}`);

const KEEP = new Set(ATTRIBUTION_META_KEYS);

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function int(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Human-readable channel name for a source/medium pair. */
export function channelLabel(a: OrderAttribution): string {
  const source = a.source || a.referrer || "";
  switch (a.sourceType) {
    case "utm":
      return a.campaign ? `Campaign: ${a.campaign}` : `Paid / UTM: ${source || "unknown"}`;
    case "organic":
      return `Organic search${source ? ` (${cleanHost(source)})` : ""}`;
    case "referral":
      return `Referral${source ? ` (${cleanHost(source)})` : ""}`;
    case "typein":
      return "Direct";
    case "admin":
      return "Created in admin";
    case "mobile_app":
      return "Mobile app";
    default:
      return source ? cleanHost(source) : "Unknown";
  }
}

/** Coarse channel bucket, for grouping where the full label is too granular. */
export function channelGroup(a: OrderAttribution): string {
  switch (a.sourceType) {
    case "utm":
      return "Paid & campaigns";
    case "organic":
      return "Organic search";
    case "referral":
      return "Referral";
    case "typein":
      return "Direct";
    case "admin":
      return "Admin / manual";
    case "mobile_app":
      return "Mobile app";
    default:
      return "Unknown";
  }
}

/** Strips scheme, www and app-scheme noise so hosts group sensibly. */
export function cleanHost(raw: string): string {
  let value = raw.trim();
  if (!value) return "";
  value = value.replace(/^android-app:\/\//, "").replace(/^https?:\/\//, "");
  value = value.split("/")[0];
  value = value.replace(/^www\./, "");
  // Android package names read better reversed: com.google.android.x → google
  if (/^[a-z]+(\.[a-z0-9-]+){2,}$/i.test(value) && !value.includes(":")) {
    const parts = value.split(".");
    if (parts[0] === "com" || parts[0] === "org" || parts[0] === "net") return parts[1] ?? value;
  }
  return value;
}

export function parseAttribution(order: WooOrder): OrderAttribution | undefined {
  const meta = order.meta_data;
  if (!meta?.length) return undefined;

  const map = new Map<string, unknown>();
  for (const entry of meta) {
    if (entry.key?.startsWith(PREFIX)) map.set(entry.key.slice(PREFIX.length), entry.value);
  }
  if (map.size === 0) return undefined;

  return {
    sourceType: str(map.get("source_type")) || "unknown",
    source: str(map.get("utm_source")),
    medium: str(map.get("utm_medium")),
    campaign: str(map.get("utm_campaign")),
    content: str(map.get("utm_content")),
    referrer: str(map.get("referrer")),
    deviceType: str(map.get("device_type")) || "Unknown",
    sessionPages: int(map.get("session_pages")),
    sessionCount: int(map.get("session_count")),
  };
}

/**
 * Normalises attribution onto the order and discards the rest of the meta.
 * Called once at ingest so the cached snapshot stays small.
 */
export function attachAttribution(orders: WooOrder[]): void {
  for (const order of orders) {
    const attribution = parseAttribution(order);
    if (attribution) order.attribution = attribution;
    // Everything we needed is normalised now; the raw meta is dead weight.
    if (order.meta_data) {
      order.meta_data = order.meta_data.filter((m) => KEEP.has(m.key));
      if (order.meta_data.length === 0) delete order.meta_data;
    }
  }
}
