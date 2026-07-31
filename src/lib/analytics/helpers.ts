import type { WooOrder, WooOrderStatus } from "@/lib/woo/types";
import type { DateRange, Granularity, Metric } from "./types";

/**
 * Statuses that count toward realised revenue. Matches WooCommerce Analytics'
 * default "actual" definition: paid-or-committed orders only. Refunds are
 * tracked separately and netted out rather than dropped.
 */
export const REVENUE_STATUSES: WooOrderStatus[] = ["completed", "processing", "on-hold"];
export const REFUND_STATUSES: WooOrderStatus[] = ["refunded"];
export const CANCELLED_STATUSES: WooOrderStatus[] = ["cancelled", "failed"];

export const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  processing: "Processing",
  "on-hold": "On hold",
  pending: "Pending payment",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Failed",
  trash: "Trashed",
  "checkout-draft": "Draft",
};

export const countsAsRevenue = (o: WooOrder) => REVENUE_STATUSES.includes(o.status);
export const isRefunded = (o: WooOrder) => REFUND_STATUSES.includes(o.status);
export const isCancelled = (o: WooOrder) => CANCELLED_STATUSES.includes(o.status);
/** Orders that represent a real purchase attempt that succeeded, incl. refunded ones. */
export const isTransactional = (o: WooOrder) => countsAsRevenue(o) || isRefunded(o);

export const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "number" ? v : Number.parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function metric(value: number, previous: number): Metric {
  const change = previous === 0 ? (value === 0 ? 0 : null) : (value - previous) / Math.abs(previous);
  return { value: round2(value), previous: round2(previous), change };
}

// ---------------------------------------------------------------------------
// Dates. All bucketing is done on the store's local calendar day, using the
// order's date_created string, so a day boundary means the same thing here as
// it does in the WooCommerce admin.
// ---------------------------------------------------------------------------

export function toDate(value: string): Date {
  return new Date(value);
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** ISO-ish week key anchored on Monday. */
export function weekKey(d: Date): string {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - offset);
  return dayKey(base);
}

export function bucketKey(d: Date, granularity: Granularity): string {
  if (granularity === "month") return monthKey(d);
  if (granularity === "week") return weekKey(d);
  return dayKey(d);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return `${MONTH_NAMES[Number(m) - 1]} ${y.slice(2)}`;
  }
  const [y, m, d] = key.split("-");
  const label = `${Number(d)} ${MONTH_NAMES[Number(m) - 1]}`;
  return granularity === "week" ? `w/c ${label}` : `${label} ${y.slice(2)}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

export const DAY_MS = 86_400_000;

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** The equal-length window immediately before `range`, for period comparison. */
export function previousRange(range: DateRange): DateRange {
  const from = startOfDay(new Date(range.from));
  const to = endOfDay(new Date(range.to));
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  return { from: dayKey(prevFrom), to: dayKey(prevTo) };
}

/** Picks a bucket size that keeps a chart readable regardless of range length. */
export function inferGranularity(range: DateRange): Granularity {
  const days = daysBetween(new Date(range.from), new Date(range.to)) + 1;
  if (days <= 62) return "day";
  if (days <= 400) return "week";
  return "month";
}

export function enumerateBuckets(range: DateRange, granularity: Granularity): string[] {
  const keys: string[] = [];
  const cursor = startOfDay(new Date(range.from));
  const end = endOfDay(new Date(range.to));

  if (granularity === "month") {
    const c = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    while (c <= end) {
      keys.push(monthKey(c));
      c.setMonth(c.getMonth() + 1);
    }
    return keys;
  }

  const step = granularity === "week" ? 7 : 1;
  if (granularity === "week") {
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  }
  while (cursor <= end) {
    keys.push(bucketKey(cursor, granularity));
    cursor.setDate(cursor.getDate() + step);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Order-level derived values
// ---------------------------------------------------------------------------

export function orderRefundTotal(o: WooOrder): number {
  if (!o.refunds?.length) return isRefunded(o) ? num(o.total) : 0;
  return Math.abs(o.refunds.reduce((s, r) => s + num(r.total), 0));
}

export function orderUnits(o: WooOrder): number {
  return o.line_items.reduce((s, li) => s + (li.quantity || 0), 0);
}

/** Revenue excluding tax and shipping — the number a merchant thinks of as "sales". */
export function orderNet(o: WooOrder): number {
  return num(o.total) - num(o.total_tax) - num(o.shipping_total) - orderRefundTotal(o);
}

/**
 * Stable identity for a buyer. Guest orders have customer_id 0, so we fall back
 * to the billing email — otherwise every guest checkout looks like one giant
 * customer with thousands of orders.
 */
export function customerKey(o: WooOrder): string {
  if (o.customer_id && o.customer_id > 0) return `id:${o.customer_id}`;
  const email = (o.billing?.email ?? "").trim().toLowerCase();
  return email ? `email:${email}` : `order:${o.id}`;
}

export function customerName(o: WooOrder): string {
  const first = o.billing?.first_name?.trim() ?? "";
  const last = o.billing?.last_name?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || o.billing?.email || `Guest #${o.id}`;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

/** 0 = perfectly even revenue spread, 1 = one customer holds everything. */
export function gini(values: number[]): number {
  const sorted = [...values].filter((v) => v > 0).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  const total = sorted.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  let weighted = 0;
  for (let i = 0; i < n; i++) weighted += (i + 1) * sorted[i];
  return round2((2 * weighted) / (n * total) - (n + 1) / n);
}

/** Ordinary least squares over (index, value) pairs. */
export function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    const dy = values[i] - meanY;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;
  const r2 = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string): string {
  if (!code) return "Unknown";
  try {
    return REGION_NAMES.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
