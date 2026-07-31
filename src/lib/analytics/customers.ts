import type { WooCustomer, WooOrder } from "@/lib/woo/types";
import {
  countryName,
  customerKey,
  customerName,
  DAY_MS,
  daysBetween,
  gini,
  isRefunded,
  isTransactional,
  monthKey,
  monthLabel,
  num,
  orderNet,
  orderRefundTotal,
  orderUnits,
  round2,
  safeDiv,
} from "./helpers";
import type { CustomerAnalytics, CustomerRecord, RfmSegment, ValueTier } from "./types";

interface Accumulator {
  key: string;
  id: number;
  name: string;
  email: string;
  company: string;
  country: string;
  state: string;
  city: string;
  orders: number;
  gross: number;
  net: number;
  refunded: number;
  discounts: number;
  units: number;
  dates: number[];
  products: Map<string, { units: number; revenue: number }>;
  payments: Set<string>;
}

export interface CustomerContext {
  /** First-ever order timestamp per customer, across all available history. */
  firstOrderByCustomer: Map<string, number>;
  /** Reference "today" — the end of the selected range, not wall-clock time. */
  asOf: Date;
  customerDirectory: Map<string, WooCustomer>;
}

/** Quintile rank (1..5) of `value` within an ascending-sorted population. */
function quintileScore(sortedAsc: number[], value: number, invert = false): number {
  if (sortedAsc.length === 0) return 3;
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  const pct = sortedAsc.length === 1 ? 0.5 : lo / (sortedAsc.length - 1);
  const raw = Math.min(5, Math.max(1, Math.floor(pct * 5) + 1));
  return invert ? 6 - raw : raw;
}

/**
 * Standard RFM segment matrix. Frequency and monetary are averaged into a
 * single "value" axis, which is the conventional 2-D simplification.
 */
function segmentFor(r: number, f: number, m: number): RfmSegment {
  const fm = Math.round((f + m) / 2);
  if (r >= 4 && fm >= 4) return "Champions";
  if (r >= 3 && fm >= 4) return "Loyal";
  if (r >= 4 && fm === 3) return "Potential Loyalist";
  if (r === 5 && fm <= 2) return "New Customers";
  if (r === 4 && fm <= 2) return "Promising";
  if (r === 3 && fm === 3) return "Need Attention";
  if (r === 2 && fm >= 3) return "At Risk";
  if (r === 1 && fm >= 4) return "Cannot Lose Them";
  if (r === 2 && fm <= 2) return "Hibernating";
  return "Lost";
}

function tierFor(percentile: number, orders: number): ValueTier {
  if (percentile >= 95) return "VIP";
  if (percentile >= 75) return "High";
  if (orders === 1) return "One-time";
  if (percentile >= 40) return "Mid";
  return "Low";
}

export function buildCustomerRecords(orders: WooOrder[], ctx: CustomerContext): CustomerRecord[] {
  const acc = new Map<string, Accumulator>();

  for (const order of orders) {
    if (!isTransactional(order)) continue;
    const key = customerKey(order);
    let entry = acc.get(key);
    if (!entry) {
      const directory = ctx.customerDirectory.get(key);
      entry = {
        key,
        id: order.customer_id || 0,
        name: customerName(order),
        email: (order.billing?.email ?? directory?.email ?? "").toLowerCase(),
        company: (order.billing?.company ?? directory?.billing?.company ?? "").trim(),
        country: order.billing?.country ?? "",
        state: order.billing?.state ?? "",
        city: order.billing?.city ?? "",
        orders: 0,
        gross: 0,
        net: 0,
        refunded: 0,
        discounts: 0,
        units: 0,
        dates: [],
        products: new Map(),
        payments: new Set(),
      };
      acc.set(key, entry);
    }

    const refunded = orderRefundTotal(order);
    entry.orders += 1;
    entry.gross += isRefunded(order) ? 0 : num(order.total);
    entry.net += Math.max(0, orderNet(order));
    entry.refunded += refunded;
    entry.discounts += num(order.discount_total);
    entry.units += orderUnits(order);
    entry.dates.push(new Date(order.date_created).getTime());
    if (order.payment_method_title) entry.payments.add(order.payment_method_title);
    // A customer's company can appear on a later order only — keep the latest non-empty.
    if (order.billing?.company?.trim()) entry.company = order.billing.company.trim();

    for (const li of order.line_items) {
      const p = entry.products.get(li.name) ?? { units: 0, revenue: 0 };
      p.units += li.quantity;
      p.revenue += num(li.total);
      entry.products.set(li.name, p);
    }
  }

  const entries = [...acc.values()];
  const revenues = entries.map((e) => e.net).sort((a, b) => a - b);
  const frequencies = entries.map((e) => e.orders).sort((a, b) => a - b);
  const recencies = entries
    .map((e) => daysBetween(new Date(Math.max(...e.dates)), ctx.asOf))
    .sort((a, b) => a - b);

  const totalRevenue = entries.reduce((s, e) => s + e.net, 0);

  // Median repeat cadence across the base — the yardstick for judging a
  // single-purchase customer's churn risk, since they have no cadence of their own.
  const cadences = entries
    .filter((e) => e.dates.length > 1)
    .map((e) => {
      const sorted = [...e.dates].sort((a, b) => a - b);
      return (sorted[sorted.length - 1] - sorted[0]) / (sorted.length - 1) / DAY_MS;
    })
    .sort((a, b) => a - b);
  const medianCadence = cadences.length ? cadences[Math.floor(cadences.length / 2)] : 90;

  return entries.map((e) => {
    const sortedDates = [...e.dates].sort((a, b) => a - b);
    const first = new Date(sortedDates[0]);
    const last = new Date(sortedDates[sortedDates.length - 1]);
    const lifetimeFirst = ctx.firstOrderByCustomer.get(e.key) ?? sortedDates[0];
    // Their first ever order is the one we saw first in this window: brand new.
    const isNewCustomer = Math.abs(lifetimeFirst - sortedDates[0]) < 1000;
    const lifespanDays = Math.max(0, daysBetween(first, last));
    const recencyDays = Math.max(0, daysBetween(last, ctx.asOf));
    const avgGap = sortedDates.length > 1 ? lifespanDays / (sortedDates.length - 1) : null;

    const r = quintileScore(recencies, recencyDays, true);
    const f = quintileScore(frequencies, e.orders);
    const m = quintileScore(revenues, e.net);

    // Percentile of this customer's revenue across the base.
    const below = binarySearchCount(revenues, e.net);
    const revenuePercentile = revenues.length <= 1 ? 100 : round2((below / (revenues.length - 1)) * 100);

    const cadence = avgGap ?? medianCadence;
    const churnRisk = round2(Math.min(1, Math.max(0, recencyDays / Math.max(14, cadence * 1.75))));

    // Naive forward CLV: keep buying at the observed rate for 12 more months,
    // discounted by how likely they look to have lapsed.
    const aov = safeDiv(e.net, e.orders);
    const monthlyFrequency = lifespanDays > 0 ? e.orders / (lifespanDays / 30.44) : safeDiv(e.orders, 1);
    const projected = aov * Math.min(monthlyFrequency, 8) * 12 * (1 - churnRisk);

    const topProducts = [...e.products.entries()]
      .map(([name, v]) => ({ name, units: v.units, revenue: round2(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      id: e.id,
      key: e.key,
      name: e.name,
      email: e.email,
      company: e.company,
      country: e.country,
      state: e.state,
      city: e.city,
      orders: e.orders,
      grossRevenue: round2(e.gross),
      netRevenue: round2(e.net),
      refunded: round2(e.refunded),
      discounts: round2(e.discounts),
      units: e.units,
      averageOrderValue: round2(aov),
      firstOrderDate: new Date(lifetimeFirst).toISOString(),
      lastOrderDate: last.toISOString(),
      lifespanDays,
      recencyDays,
      averageDaysBetweenOrders: avgGap === null ? null : round2(avgGap),
      purchaseFrequency: round2(monthlyFrequency),
      recencyScore: r,
      frequencyScore: f,
      monetaryScore: m,
      rfmScore: Number(`${r}${f}${m}`),
      segment: segmentFor(r, f, m),
      tier: tierFor(revenuePercentile, e.orders),
      predictedClv: round2(e.net + projected),
      churnRisk,
      topProducts,
      paymentMethods: [...e.payments],
      revenueShare: round2(safeDiv(e.net, totalRevenue) * 100),
      revenuePercentile,
      isNewCustomer,
    } satisfies CustomerRecord;
  });
}

function binarySearchCount(sortedAsc: number[], value: number): number {
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function buildCustomerAnalytics(
  records: CustomerRecord[],
  orders: WooOrder[],
  ctx: CustomerContext,
): CustomerAnalytics {
  const byRevenue = [...records].sort((a, b) => b.netRevenue - a.netRevenue);
  const totalRevenue = records.reduce((s, r) => s + r.netRevenue, 0);

  const share = (subset: CustomerRecord[]) =>
    round2(safeDiv(subset.reduce((s, r) => s + r.netRevenue, 0), totalRevenue) * 100);

  const headCount = (fraction: number) => Math.max(1, Math.ceil(records.length * fraction));

  // Deciles run best-first, so decile 1 is the top 10% of customers.
  const deciles = Array.from({ length: 10 }, (_, i) => {
    const start = Math.floor((byRevenue.length * i) / 10);
    const end = Math.floor((byRevenue.length * (i + 1)) / 10);
    const slice = byRevenue.slice(start, end);
    const revenue = slice.reduce((s, r) => s + r.netRevenue, 0);
    return {
      decile: i + 1,
      label: `Top ${i * 10}–${(i + 1) * 10}%`,
      customers: slice.length,
      revenue: round2(revenue),
      share: round2(safeDiv(revenue, totalRevenue) * 100),
      cumulativeShare: 0,
    };
  });
  let cumulative = 0;
  for (const d of deciles) {
    cumulative += d.share;
    d.cumulativeShare = round2(cumulative);
  }

  const segments = new Map<RfmSegment, CustomerRecord[]>();
  for (const r of records) {
    const list = segments.get(r.segment) ?? [];
    list.push(r);
    segments.set(r.segment, list);
  }
  const SEGMENT_ORDER: RfmSegment[] = [
    "Champions", "Loyal", "Potential Loyalist", "New Customers", "Promising",
    "Need Attention", "At Risk", "Cannot Lose Them", "Hibernating", "Lost",
  ];
  const segmentBreakdown = SEGMENT_ORDER.map((segment) => {
    const list = segments.get(segment) ?? [];
    const revenue = list.reduce((s, r) => s + r.netRevenue, 0);
    const orderCount = list.reduce((s, r) => s + r.orders, 0);
    return {
      segment,
      customers: list.length,
      revenue: round2(revenue),
      share: round2(safeDiv(revenue, totalRevenue) * 100),
      averageOrderValue: round2(safeDiv(revenue, orderCount)),
    };
  }).filter((s) => s.customers > 0);

  const TIER_ORDER: ValueTier[] = ["VIP", "High", "Mid", "Low", "One-time"];
  const tierBreakdown = TIER_ORDER.map((tier) => {
    const list = records.filter((r) => r.tier === tier);
    const revenue = list.reduce((s, r) => s + r.netRevenue, 0);
    const orderCount = list.reduce((s, r) => s + r.orders, 0);
    return {
      tier,
      customers: list.length,
      revenue: round2(revenue),
      share: round2(safeDiv(revenue, totalRevenue) * 100),
      averageOrderValue: round2(safeDiv(revenue, orderCount)),
    };
  }).filter((t) => t.customers > 0);

  // "Rising" = bought recently, more than once, and spending above their own
  // historical pace. These are the accounts worth an upsell touch.
  const rising = records
    .filter((r) => r.orders >= 2 && r.recencyDays <= 45 && r.frequencyScore >= 3)
    .sort((a, b) => b.predictedClv - a.predictedClv)
    .slice(0, 25);

  const atRisk = records
    .filter((r) => r.churnRisk >= 0.6 && r.netRevenue > 0)
    .sort((a, b) => b.netRevenue * b.churnRisk - a.netRevenue * a.churnRisk)
    .slice(0, 50);

  const repeatBuyers = records.filter((r) => r.orders > 1).length;
  const totalOrders = records.reduce((s, r) => s + r.orders, 0);
  const gaps = records.map((r) => r.averageDaysBetweenOrders).filter((v): v is number => v !== null);

  return {
    records,
    topCustomers: byRevenue.slice(0, 50),
    lowValueCustomers: [...byRevenue]
      .reverse()
      .filter((r) => r.netRevenue > 0)
      .slice(0, 50),
    newCustomers: byRevenue.filter((r) => r.isNewCustomer),
    returningCustomers: byRevenue.filter((r) => !r.isNewCustomer),
    atRiskCustomers: atRisk,
    risingCustomers: rising,
    segmentBreakdown,
    tierBreakdown,
    deciles,
    concentration: {
      top1Share: share(byRevenue.slice(0, headCount(0.01))),
      top5Share: share(byRevenue.slice(0, headCount(0.05))),
      top10Share: share(byRevenue.slice(0, headCount(0.1))),
      top20Share: share(byRevenue.slice(0, headCount(0.2))),
      bottom50Share: share(byRevenue.slice(Math.ceil(byRevenue.length / 2))),
      giniCoefficient: gini(records.map((r) => r.netRevenue)),
    },
    averages: {
      clv: round2(safeDiv(records.reduce((s, r) => s + r.predictedClv, 0), records.length)),
      orderValue: round2(safeDiv(totalRevenue, totalOrders)),
      ordersPerCustomer: round2(safeDiv(totalOrders, records.length)),
      daysBetweenOrders: round2(safeDiv(gaps.reduce((s, v) => s + v, 0), gaps.length)),
      repeatRate: round2(safeDiv(repeatBuyers, records.length) * 100),
      oneTimeBuyerShare: round2(safeDiv(records.length - repeatBuyers, records.length) * 100),
    },
    newVsReturning: buildNewVsReturning(orders, ctx),
  };
}

function buildNewVsReturning(orders: WooOrder[], ctx: CustomerContext) {
  const months = new Map<
    string,
    { newCustomers: Set<string>; returning: Set<string>; newRevenue: number; returningRevenue: number }
  >();

  for (const order of orders) {
    if (!isTransactional(order)) continue;
    const created = new Date(order.date_created);
    const key = monthKey(created);
    let bucket = months.get(key);
    if (!bucket) {
      bucket = { newCustomers: new Set(), returning: new Set(), newRevenue: 0, returningRevenue: 0 };
      months.set(key, bucket);
    }
    const ck = customerKey(order);
    const firstEver = ctx.firstOrderByCustomer.get(ck) ?? created.getTime();
    const value = Math.max(0, orderNet(order));
    // "New" means this order is their first ever, not merely their first this month.
    if (Math.abs(firstEver - created.getTime()) < 1000) {
      bucket.newCustomers.add(ck);
      bucket.newRevenue += value;
    } else {
      bucket.returning.add(ck);
      bucket.returningRevenue += value;
    }
  }

  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      label: monthLabel(month),
      newCustomers: b.newCustomers.size,
      returning: b.returning.size,
      newRevenue: round2(b.newRevenue),
      returningRevenue: round2(b.returningRevenue),
    }));
}

export function buildCustomerDirectory(customers: WooCustomer[]): Map<string, WooCustomer> {
  const map = new Map<string, WooCustomer>();
  for (const c of customers) {
    map.set(`id:${c.id}`, c);
    if (c.email) map.set(`email:${c.email.toLowerCase()}`, c);
  }
  return map;
}

export { countryName };
