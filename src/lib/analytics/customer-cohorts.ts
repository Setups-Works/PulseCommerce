import type { CustomerRecord } from "./types";

/**
 * The customer cohorts the Customers page offers as tabs.
 *
 * These are pure views over the full record set, so they are derived where
 * they are used rather than shipped as four extra arrays. Sending them
 * pre-sliced duplicated a fifth of the customer payload and, worse, silently
 * capped every tab at 50 rows: the ledger claimed to show "high value
 * customers" while hiding all but the first fifty.
 */

/** Highest spenders first. */
export function topCustomers(records: CustomerRecord[]): CustomerRecord[] {
  return [...records].sort((a, b) => b.netRevenue - a.netRevenue);
}

/** Lowest spenders who still bought something. */
export function lowValueCustomers(records: CustomerRecord[]): CustomerRecord[] {
  return records.filter((r) => r.netRevenue > 0).sort((a, b) => a.netRevenue - b.netRevenue);
}

/**
 * Gone quiet well past their own reorder cadence, ordered by how much revenue
 * is actually at stake rather than by risk alone.
 */
export function atRiskCustomers(records: CustomerRecord[]): CustomerRecord[] {
  return records
    .filter((r) => r.churnRisk >= 0.6 && r.netRevenue > 0)
    .sort((a, b) => b.netRevenue * b.churnRisk - a.netRevenue * a.churnRisk);
}

/** Bought recently, more than once, and building momentum. */
export function risingCustomers(records: CustomerRecord[]): CustomerRecord[] {
  return records
    .filter((r) => r.orders >= 2 && r.recencyDays <= 45 && r.frequencyScore >= 3)
    .sort((a, b) => b.predictedClv - a.predictedClv);
}
