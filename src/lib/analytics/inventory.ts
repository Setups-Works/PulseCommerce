import { round2, safeDiv } from "./helpers";
import type { InventoryAnalytics, InventoryRecord, ProductRecord } from "./types";

/**
 * Restock planning from sales velocity and current stock.
 *
 * Everything here is arithmetic on numbers WooCommerce already holds; the only
 * judgement is the cover thresholds and the lead-time assumption, both of which
 * are stated in the UI rather than hidden.
 */

/** Days of supplier lead time assumed when computing a reorder point. */
export const ASSUMED_LEAD_TIME_DAYS = 14;
/** Days of stock to hold as a buffer beyond lead time. */
export const SAFETY_STOCK_DAYS = 7;

/** Anything at or below this many days of cover needs action now. */
const CRITICAL_DAYS = 7;
const LOW_DAYS = 21;
/** Above this, capital is sitting still. */
const OVERSTOCKED_DAYS = 180;

function classify(daysOfCover: number | null, velocity: number): InventoryRecord["status"] {
  if (velocity === 0) return "no-sales";
  if (daysOfCover === null) return "untracked";
  if (daysOfCover <= 0) return "out-of-stock";
  if (daysOfCover <= CRITICAL_DAYS) return "critical";
  if (daysOfCover <= LOW_DAYS) return "low";
  if (daysOfCover >= OVERSTOCKED_DAYS) return "overstocked";
  return "healthy";
}

export function buildInventoryAnalytics(products: ProductRecord[]): InventoryAnalytics {
  const records: InventoryRecord[] = products.map((p) => {
    const velocity = p.velocity;
    const stock = p.stockQuantity;
    const daysOfCover = p.daysOfCover;

    // Reorder when stock would run out before a replenishment could land.
    const reorderPoint = velocity > 0 ? Math.ceil(velocity * (ASSUMED_LEAD_TIME_DAYS + SAFETY_STOCK_DAYS)) : 0;

    // Order enough to cover lead time, the safety buffer and a further 30 days.
    const suggestedOrder =
      velocity > 0 && stock !== null
        ? Math.max(0, Math.ceil(velocity * (ASSUMED_LEAD_TIME_DAYS + SAFETY_STOCK_DAYS + 30)) - stock)
        : 0;

    const status = classify(daysOfCover, velocity);

    // Revenue that would be lost if the SKU stayed out until replenishment.
    const revenueAtRisk =
      status === "critical" || status === "out-of-stock"
        ? round2(velocity * p.averagePrice * ASSUMED_LEAD_TIME_DAYS)
        : 0;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      stockQuantity: stock,
      stockStatus: p.stockStatus,
      velocity,
      daysOfCover,
      reorderPoint,
      suggestedOrder,
      status,
      revenue: p.revenue,
      units: p.units,
      averagePrice: p.averagePrice,
      revenueAtRisk,
      /** Capital tied up at selling price; a cost proxy, not a margin figure. */
      stockValue: stock !== null ? round2(stock * p.averagePrice) : 0,
    } satisfies InventoryRecord;
  });

  const tracked = records.filter((r) => r.stockQuantity !== null);
  const needsReorder = records
    .filter((r) => r.status === "critical" || r.status === "out-of-stock" || r.status === "low")
    .sort((a, b) => (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0));

  const counts = {
    outOfStock: records.filter((r) => r.status === "out-of-stock").length,
    critical: records.filter((r) => r.status === "critical").length,
    low: records.filter((r) => r.status === "low").length,
    healthy: records.filter((r) => r.status === "healthy").length,
    overstocked: records.filter((r) => r.status === "overstocked").length,
    untracked: records.filter((r) => r.status === "untracked").length,
    noSales: records.filter((r) => r.status === "no-sales").length,
  };

  return {
    records: records.sort((a, b) => {
      // Most urgent first: anything with cover, ascending; the rest after.
      const aKey = a.daysOfCover ?? Number.MAX_SAFE_INTEGER;
      const bKey = b.daysOfCover ?? Number.MAX_SAFE_INTEGER;
      return aKey - bKey;
    }),
    needsReorder,
    overstocked: records
      .filter((r) => r.status === "overstocked")
      .sort((a, b) => b.stockValue - a.stockValue),
    counts,
    totals: {
      trackedSkus: tracked.length,
      unitsOnHand: tracked.reduce((s, r) => s + (r.stockQuantity ?? 0), 0),
      stockValue: round2(tracked.reduce((s, r) => s + r.stockValue, 0)),
      revenueAtRisk: round2(records.reduce((s, r) => s + r.revenueAtRisk, 0)),
      suggestedUnits: needsReorder.reduce((s, r) => s + r.suggestedOrder, 0),
      averageDaysOfCover: round2(
        safeDiv(
          tracked.filter((r) => r.daysOfCover !== null).reduce((s, r) => s + (r.daysOfCover ?? 0), 0),
          tracked.filter((r) => r.daysOfCover !== null).length,
        ),
      ),
    },
    assumptions: { leadTimeDays: ASSUMED_LEAD_TIME_DAYS, safetyStockDays: SAFETY_STOCK_DAYS },
  };
}
