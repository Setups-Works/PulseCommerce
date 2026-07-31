import type { WooOrder } from "@/lib/woo/types";
import { customerKey, isTransactional, monthKey, monthLabel, orderNet, round2, safeDiv } from "./helpers";
import type { CohortAnalytics, CohortRow } from "./types";

/**
 * Monthly acquisition cohorts. Built from the *full* order history rather than
 * the selected range — a retention matrix that only sees a 30-day window is
 * meaningless.
 */
export function buildCohortAnalytics(allOrders: WooOrder[], maxPeriods = 12): CohortAnalytics {
  const transactional = allOrders.filter(isTransactional);
  if (transactional.length === 0) {
    return { rows: [], periods: 0, averageRetention: [], ltvCurve: [] };
  }

  const firstOrderMonth = new Map<string, string>();
  const firstOrderTime = new Map<string, number>();

  for (const order of transactional) {
    const key = customerKey(order);
    const time = new Date(order.date_created).getTime();
    const existing = firstOrderTime.get(key);
    if (existing === undefined || time < existing) {
      firstOrderTime.set(key, time);
      firstOrderMonth.set(key, monthKey(new Date(order.date_created)));
    }
  }

  // cohort -> period index -> { customers, revenue }
  const grid = new Map<string, Map<number, { customers: Set<string>; revenue: number }>>();
  const cohortSizes = new Map<string, Set<string>>();

  for (const order of transactional) {
    const key = customerKey(order);
    const cohort = firstOrderMonth.get(key);
    if (!cohort) continue;

    const orderMonth = monthKey(new Date(order.date_created));
    const period = monthDiff(cohort, orderMonth);
    if (period < 0 || period >= maxPeriods) continue;

    if (!cohortSizes.has(cohort)) cohortSizes.set(cohort, new Set());
    if (period === 0) cohortSizes.get(cohort)!.add(key);

    let row = grid.get(cohort);
    if (!row) {
      row = new Map();
      grid.set(cohort, row);
    }
    const cell = row.get(period) ?? { customers: new Set<string>(), revenue: 0 };
    cell.customers.add(key);
    cell.revenue += Math.max(0, orderNet(order));
    row.set(period, cell);
  }

  const latestMonth = monthKey(new Date(Math.max(...transactional.map((o) => new Date(o.date_created).getTime()))));

  const rows: CohortRow[] = [...grid.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohort, periods]) => {
      const size = cohortSizes.get(cohort)?.size ?? periods.get(0)?.customers.size ?? 0;
      // Periods that haven't elapsed yet stay null so the heatmap shows a gap,
      // not a misleading 0%.
      const elapsed = monthDiff(cohort, latestMonth) + 1;

      const retention: (number | null)[] = [];
      const revenue: (number | null)[] = [];
      const cumulativeRevenuePerCustomer: number[] = [];
      let cumulative = 0;

      for (let p = 0; p < maxPeriods; p++) {
        if (p >= elapsed) {
          retention.push(null);
          revenue.push(null);
          continue;
        }
        const cell = periods.get(p);
        const active = cell?.customers.size ?? 0;
        const rev = cell?.revenue ?? 0;
        retention.push(size === 0 ? 0 : round2((active / size) * 100));
        revenue.push(round2(rev));
        cumulative += rev;
        cumulativeRevenuePerCustomer.push(round2(safeDiv(cumulative, size)));
      }

      return {
        cohort,
        label: monthLabel(cohort),
        size,
        retention,
        revenue,
        cumulativeRevenuePerCustomer,
        totalRevenue: round2(cumulative),
      };
    })
    .filter((r) => r.size > 0);

  const averageRetention: (number | null)[] = [];
  for (let p = 0; p < maxPeriods; p++) {
    const values = rows.map((r) => r.retention[p]).filter((v): v is number => v !== null);
    averageRetention.push(values.length ? round2(values.reduce((s, v) => s + v, 0) / values.length) : null);
  }

  const ltvCurve = Array.from({ length: maxPeriods }, (_, p) => {
    const values = rows.map((r) => r.cumulativeRevenuePerCustomer[p]).filter((v): v is number => v !== undefined);
    return { month: p, value: values.length ? round2(values.reduce((s, v) => s + v, 0) / values.length) : 0 };
  }).filter((v) => v.value > 0);

  return { rows, periods: maxPeriods, averageRetention, ltvCurve };
}

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}
