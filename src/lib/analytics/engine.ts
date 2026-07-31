import type { StoreSnapshot, WooOrder } from "@/lib/woo/types";
import { buildAcquisitionAnalytics } from "./acquisition";
import { buildCohortAnalytics } from "./cohorts";
import { buildCompanyAnalytics } from "./companies";
import { buildCustomerAnalytics, buildCustomerDirectory, buildCustomerRecords, type CustomerContext } from "./customers";
import {
  bucketKey,
  bucketLabel,
  countryName,
  countsAsRevenue,
  customerKey,
  customerName,
  dayKey,
  daysBetween,
  endOfDay,
  enumerateBuckets,
  inferGranularity,
  isCancelled,
  isRefunded,
  isTransactional,
  linearRegression,
  metric,
  num,
  orderNet,
  orderRefundTotal,
  orderUnits,
  previousRange,
  round2,
  safeDiv,
  standardDeviation,
  startOfDay,
} from "./helpers";
import { buildOperationsAnalytics } from "./operations";
import { buildProductAnalytics } from "./products";
import type {
  AnalyticsResult,
  DateRange,
  ForecastPoint,
  GeoRecord,
  Granularity,
  Insight,
  KpiSet,
  OrderRecord,
  TimePoint,
} from "./types";

export interface AnalyticsOptions {
  range?: DateRange;
  granularity?: Granularity;
  /** Caps the raw order list returned to the client; exports bypass this. */
  maxOrderRows?: number;
  maxCustomerRows?: number;
}

const DEFAULT_ORDER_ROWS = 1500;
const DEFAULT_CUSTOMER_ROWS = 2000;

export function computeAnalytics(snapshot: StoreSnapshot, opts: AnalyticsOptions = {}): AnalyticsResult {
  const bounds = dataBounds(snapshot.orders);
  const range = normaliseRange(opts.range, bounds);
  const prevRange = previousRange(range);
  const granularity = opts.granularity ?? inferGranularity(range);

  const inRange = filterByRange(snapshot.orders, range);
  const inPrevRange = filterByRange(snapshot.orders, prevRange);

  // First-ever purchase per customer, from the whole snapshot — required for an
  // honest new-vs-returning split inside a narrower window.
  const firstOrderByCustomer = new Map<string, number>();
  for (const order of snapshot.orders) {
    if (!isTransactional(order)) continue;
    const key = customerKey(order);
    const t = new Date(order.date_created).getTime();
    const existing = firstOrderByCustomer.get(key);
    if (existing === undefined || t < existing) firstOrderByCustomer.set(key, t);
  }

  const asOf = endOfDay(new Date(range.to));
  const ctx: CustomerContext = {
    firstOrderByCustomer,
    asOf,
    customerDirectory: buildCustomerDirectory(snapshot.customers),
  };

  const kpis = buildKpis(inRange, inPrevRange, firstOrderByCustomer);
  const timeseries = buildTimeseries(inRange, range, granularity, firstOrderByCustomer);

  const allRecords = buildCustomerRecords(inRange, ctx).sort((a, b) => b.netRevenue - a.netRevenue);
  const customerRows = opts.maxCustomerRows ?? DEFAULT_CUSTOMER_ROWS;
  const customers = buildCustomerAnalytics(allRecords, inRange, ctx);
  customers.records = allRecords.slice(0, customerRows);

  const rangeDays = daysBetween(new Date(range.from), new Date(range.to)) + 1;

  const result: AnalyticsResult = {
    meta: {
      storeName: snapshot.storeName,
      storeUrl: snapshot.storeUrl,
      currency: snapshot.currency,
      fetchedAt: snapshot.fetchedAt,
      generatedAt: new Date().toISOString(),
      range,
      previousRange: prevRange,
      granularity,
      orderCount: inRange.length,
      warnings: snapshot.warnings,
      dataBounds: bounds,
    },
    kpis,
    timeseries,
    customers,
    acquisition: buildAcquisitionAnalytics(inRange, firstOrderByCustomer),
    companies: buildCompanyAnalytics(inRange, asOf),
    products: buildProductAnalytics(inRange, snapshot.products, granularity, rangeDays),
    cohorts: buildCohortAnalytics(snapshot.orders),
    geography: buildGeography(inRange),
    operations: buildOperationsAnalytics(inRange),
    orders: buildOrderRecords(inRange, firstOrderByCustomer).slice(0, opts.maxOrderRows ?? DEFAULT_ORDER_ROWS),
    forecast: buildForecast(inRange, range, granularity),
    insights: [],
  };

  result.insights = buildInsights(result);
  return result;
}

// ---------------------------------------------------------------------------

function dataBounds(orders: WooOrder[]): DateRange | null {
  if (orders.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const o of orders) {
    const t = new Date(o.date_created).getTime();
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return { from: dayKey(new Date(min)), to: dayKey(new Date(max)) };
}

function normaliseRange(range: DateRange | undefined, bounds: DateRange | null): DateRange {
  if (range?.from && range?.to) {
    const from = startOfDay(new Date(range.from));
    const to = endOfDay(new Date(range.to));
    if (Number.isFinite(from.getTime()) && Number.isFinite(to.getTime()) && from <= to) {
      return { from: dayKey(from), to: dayKey(to) };
    }
  }
  // Default: the last 30 days of data we actually have, not of wall-clock time —
  // otherwise a store with stale data shows an empty dashboard.
  const end = bounds ? new Date(bounds.to) : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { from: dayKey(start), to: dayKey(end) };
}

function filterByRange(orders: WooOrder[], range: DateRange): WooOrder[] {
  const from = startOfDay(new Date(range.from)).getTime();
  const to = endOfDay(new Date(range.to)).getTime();
  return orders.filter((o) => {
    const t = new Date(o.date_created).getTime();
    return t >= from && t <= to;
  });
}

// ---------------------------------------------------------------------------

function buildKpis(
  current: WooOrder[],
  previous: WooOrder[],
  firstOrderByCustomer: Map<string, number>,
): KpiSet {
  const agg = (orders: WooOrder[]) => {
    let gross = 0;
    let net = 0;
    let units = 0;
    let refunds = 0;
    let discounts = 0;
    let shipping = 0;
    let tax = 0;
    let revenueOrders = 0;
    let cancelled = 0;
    const active = new Set<string>();
    const fresh = new Set<string>();
    const returning = new Set<string>();

    for (const o of orders) {
      if (isCancelled(o)) cancelled += 1;
      refunds += orderRefundTotal(o);
      if (!isTransactional(o)) continue;

      const key = customerKey(o);
      active.add(key);
      const firstEver = firstOrderByCustomer.get(key);
      const created = new Date(o.date_created).getTime();
      if (firstEver !== undefined && Math.abs(firstEver - created) < 1000) fresh.add(key);
      else returning.add(key);

      units += orderUnits(o);
      discounts += num(o.discount_total);

      if (countsAsRevenue(o)) {
        revenueOrders += 1;
        gross += num(o.total);
        net += Math.max(0, orderNet(o));
        shipping += num(o.shipping_total);
        tax += num(o.total_tax);
      }
    }

    const repeatBuyers = [...active].filter((k) => returning.has(k)).length;

    return {
      gross,
      net,
      units,
      refunds,
      discounts,
      shipping,
      tax,
      revenueOrders,
      cancelled,
      totalOrders: orders.length,
      activeCustomers: active.size,
      newCustomers: fresh.size,
      returningCustomers: returning.size,
      repeatRate: safeDiv(repeatBuyers, active.size) * 100,
    };
  };

  const c = agg(current);
  const p = agg(previous);

  return {
    grossRevenue: metric(c.gross, p.gross),
    netRevenue: metric(c.net, p.net),
    orders: metric(c.revenueOrders, p.revenueOrders),
    averageOrderValue: metric(safeDiv(c.net, c.revenueOrders), safeDiv(p.net, p.revenueOrders)),
    unitsSold: metric(c.units, p.units),
    activeCustomers: metric(c.activeCustomers, p.activeCustomers),
    newCustomers: metric(c.newCustomers, p.newCustomers),
    returningCustomers: metric(c.returningCustomers, p.returningCustomers),
    refundedAmount: metric(c.refunds, p.refunds),
    discountTotal: metric(c.discounts, p.discounts),
    shippingTotal: metric(c.shipping, p.shipping),
    taxTotal: metric(c.tax, p.tax),
    returningCustomerRate: metric(c.repeatRate, p.repeatRate),
    revenuePerCustomer: metric(safeDiv(c.net, c.activeCustomers), safeDiv(p.net, p.activeCustomers)),
    itemsPerOrder: metric(safeDiv(c.units, c.revenueOrders), safeDiv(p.units, p.revenueOrders)),
    cancellationRate: metric(
      safeDiv(c.cancelled, c.totalOrders) * 100,
      safeDiv(p.cancelled, p.totalOrders) * 100,
    ),
  };
}

// ---------------------------------------------------------------------------

function buildTimeseries(
  orders: WooOrder[],
  range: DateRange,
  granularity: Granularity,
  firstOrderByCustomer: Map<string, number>,
): TimePoint[] {
  interface Bucket {
    revenue: number;
    net: number;
    orders: number;
    units: number;
    refunds: number;
    discounts: number;
    customers: Set<string>;
    newCustomers: Set<string>;
    returning: Set<string>;
  }

  const buckets = new Map<string, Bucket>();
  const blank = (): Bucket => ({
    revenue: 0,
    net: 0,
    orders: 0,
    units: 0,
    refunds: 0,
    discounts: 0,
    customers: new Set(),
    newCustomers: new Set(),
    returning: new Set(),
  });

  // Pre-seed every bucket in the range so gaps render as zero, not as a break.
  for (const key of enumerateBuckets(range, granularity)) buckets.set(key, blank());

  for (const o of orders) {
    const created = new Date(o.date_created);
    const key = bucketKey(created, granularity);
    const b = buckets.get(key) ?? blank();
    buckets.set(key, b);

    b.refunds += orderRefundTotal(o);
    if (!isTransactional(o)) continue;

    const ck = customerKey(o);
    b.customers.add(ck);
    const firstEver = firstOrderByCustomer.get(ck);
    if (firstEver !== undefined && Math.abs(firstEver - created.getTime()) < 1000) b.newCustomers.add(ck);
    else b.returning.add(ck);

    b.units += orderUnits(o);
    b.discounts += num(o.discount_total);

    if (countsAsRevenue(o)) {
      b.orders += 1;
      b.revenue += num(o.total);
      b.net += Math.max(0, orderNet(o));
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      label: bucketLabel(date, granularity),
      revenue: round2(b.revenue),
      netRevenue: round2(b.net),
      orders: b.orders,
      customers: b.customers.size,
      units: b.units,
      averageOrderValue: round2(safeDiv(b.net, b.orders)),
      refunds: round2(b.refunds),
      discounts: round2(b.discounts),
      newCustomers: b.newCustomers.size,
      returningCustomers: b.returning.size,
    }));
}

// ---------------------------------------------------------------------------

function buildGeography(orders: WooOrder[]) {
  const build = (pick: (o: WooOrder) => string, label: (code: string) => string): GeoRecord[] => {
    const map = new Map<string, { revenue: number; orders: number; customers: Set<string> }>();
    let total = 0;
    for (const o of orders) {
      if (!isTransactional(o)) continue;
      const code = pick(o) || "Unknown";
      const value = Math.max(0, orderNet(o));
      total += value;
      const e = map.get(code) ?? { revenue: 0, orders: 0, customers: new Set<string>() };
      e.revenue += value;
      e.orders += 1;
      e.customers.add(customerKey(o));
      map.set(code, e);
    }
    return [...map.entries()]
      .map(([code, e]) => ({
        code,
        name: label(code),
        revenue: round2(e.revenue),
        orders: e.orders,
        customers: e.customers.size,
        averageOrderValue: round2(safeDiv(e.revenue, e.orders)),
        share: round2(safeDiv(e.revenue, total) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  return {
    countries: build((o) => o.billing?.country ?? "", countryName),
    states: build(
      (o) => (o.billing?.state ? `${o.billing.country}-${o.billing.state}` : ""),
      (code) => code.replace("-", " · "),
    ).slice(0, 40),
    cities: build((o) => o.billing?.city ?? "", (code) => code).slice(0, 40),
  };
}

// ---------------------------------------------------------------------------

function buildOrderRecords(orders: WooOrder[], firstOrderByCustomer: Map<string, number>): OrderRecord[] {
  return [...orders]
    .sort((a, b) => b.date_created.localeCompare(a.date_created))
    .map((o) => {
      const key = customerKey(o);
      const firstEver = firstOrderByCustomer.get(key);
      const created = new Date(o.date_created).getTime();
      return {
        id: o.id,
        number: o.number ?? String(o.id),
        date: o.date_created,
        status: o.status,
        customerName: customerName(o),
        customerEmail: (o.billing?.email ?? "").toLowerCase(),
        company: (o.billing?.company ?? "").trim(),
        country: o.billing?.country ?? "",
        items: o.line_items.length,
        units: orderUnits(o),
        total: round2(num(o.total)),
        net: round2(Math.max(0, orderNet(o))),
        discount: round2(num(o.discount_total)),
        shipping: round2(num(o.shipping_total)),
        tax: round2(num(o.total_tax)),
        refunded: round2(orderRefundTotal(o)),
        paymentMethod: o.payment_method_title || o.payment_method || "Unknown",
        coupons: (o.coupon_lines ?? []).map((c) => c.code),
        isNewCustomer: firstEver !== undefined && Math.abs(firstEver - created) < 1000,
      };
    });
}

// ---------------------------------------------------------------------------

/**
 * Trend + day-of-week seasonality forecast over daily revenue.
 *
 * Deliberately simple and explainable: OLS on the level, multiplicative weekday
 * factors, and a band at ±1.96σ of the in-sample residuals. Good enough to
 * answer "are we pacing ahead or behind"; not a replacement for a real model.
 */
function buildForecast(orders: WooOrder[], range: DateRange, granularity: Granularity): ForecastPoint[] {
  const daily = new Map<string, number>();
  const cursor = startOfDay(new Date(range.from));
  const end = endOfDay(new Date(range.to));
  while (cursor <= end) {
    daily.set(dayKey(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const o of orders) {
    if (!countsAsRevenue(o)) continue;
    const key = dayKey(new Date(o.date_created));
    if (daily.has(key)) daily.set(key, (daily.get(key) ?? 0) + Math.max(0, orderNet(o)));
  }

  const keys = [...daily.keys()].sort();
  const values = keys.map((k) => daily.get(k) ?? 0);
  if (values.length < 14) {
    return keys.map((k) => ({
      date: k,
      label: bucketLabel(k, "day"),
      actual: round2(daily.get(k) ?? 0),
      forecast: null,
      lower: null,
      upper: null,
    }));
  }

  const { slope, intercept } = linearRegression(values);
  const mean = values.reduce((s, v) => s + v, 0) / values.length || 1;

  const weekdayTotals = new Array(7).fill(0);
  const weekdayCounts = new Array(7).fill(0);
  keys.forEach((k, i) => {
    const d = new Date(k).getDay();
    weekdayTotals[d] += values[i];
    weekdayCounts[d] += 1;
  });
  const weekdayFactor = weekdayTotals.map((t, i) => (weekdayCounts[i] ? t / weekdayCounts[i] / mean : 1));

  const fitted = values.map((_, i) => (intercept + slope * i) * weekdayFactor[new Date(keys[i]).getDay()]);
  const residuals = values.map((v, i) => v - fitted[i]);
  const band = 1.96 * standardDeviation(residuals);

  const points: ForecastPoint[] = keys.map((k, i) => ({
    date: k,
    label: bucketLabel(k, "day"),
    actual: round2(values[i]),
    forecast: i >= keys.length - 1 ? round2(Math.max(0, fitted[i])) : null,
    lower: null,
    upper: null,
  }));

  const horizon = granularity === "day" ? 14 : 30;
  const last = new Date(keys[keys.length - 1]);
  for (let h = 1; h <= horizon; h++) {
    const d = new Date(last);
    d.setDate(d.getDate() + h);
    const idx = values.length - 1 + h;
    const value = Math.max(0, (intercept + slope * idx) * weekdayFactor[d.getDay()]);
    points.push({
      date: dayKey(d),
      label: bucketLabel(dayKey(d), "day"),
      actual: null,
      forecast: round2(value),
      lower: round2(Math.max(0, value - band)),
      upper: round2(value + band),
    });
  }

  return points;
}

// ---------------------------------------------------------------------------

function buildInsights(r: AnalyticsResult): Insight[] {
  const out: Insight[] = [];
  const pct = (v: number | null) => (v === null ? "n/a" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`);
  const money = (v: number) =>
    new Intl.NumberFormat("en", { style: "currency", currency: r.meta.currency, maximumFractionDigits: 0 }).format(v);

  const rev = r.kpis.netRevenue;
  if (rev.change !== null) {
    out.push({
      id: "revenue-trend",
      severity: rev.change >= 0.05 ? "positive" : rev.change <= -0.05 ? "warning" : "neutral",
      title: `Net revenue ${rev.change >= 0 ? "up" : "down"} ${pct(rev.change)} vs the previous period`,
      detail: `${money(rev.value)} this period against ${money(rev.previous)} in the ${daysBetween(
        new Date(r.meta.previousRange.from),
        new Date(r.meta.previousRange.to),
      ) + 1}-day window before it.`,
      metric: money(rev.value),
    });
  }

  const conc = r.customers.concentration;
  if (conc.top10Share > 0) {
    out.push({
      id: "revenue-concentration",
      severity: conc.top10Share >= 60 ? "warning" : "neutral",
      title: `Top 10% of customers drive ${conc.top10Share.toFixed(1)}% of revenue`,
      detail:
        conc.top10Share >= 60
          ? `Revenue is highly concentrated (Gini ${conc.giniCoefficient.toFixed(2)}). Losing a handful of accounts would be material — worth a dedicated retention motion.`
          : `Spread is reasonably healthy (Gini ${conc.giniCoefficient.toFixed(2)}). The bottom half of the base still contributes ${conc.bottom50Share.toFixed(1)}%.`,
      metric: `${conc.top10Share.toFixed(1)}%`,
    });
  }

  const atRisk = r.customers.atRiskCustomers;
  if (atRisk.length > 0) {
    const value = atRisk.reduce((s, c) => s + c.netRevenue, 0);
    out.push({
      id: "churn-risk",
      severity: "critical",
      title: `${atRisk.length} customers worth ${money(value)} are showing churn signals`,
      detail: `These customers have gone quiet well past their own usual reorder gap. ${atRisk
        .slice(0, 3)
        .map((c) => c.name)
        .join(", ")} carry the most value among them.`,
      metric: money(value),
    });
  }

  const repeat = r.customers.averages.repeatRate;
  out.push({
    id: "repeat-rate",
    severity: repeat >= 30 ? "positive" : repeat >= 15 ? "neutral" : "warning",
    title: `${repeat.toFixed(1)}% of customers ordered more than once in this window`,
    detail: `${r.customers.averages.oneTimeBuyerShare.toFixed(
      1,
    )}% bought exactly once. Separately, ${r.kpis.returningCustomerRate.value.toFixed(
      1,
    )}% of buyers active in this period had already purchased before it — the wider the window, the closer these two numbers get.`,
    metric: `${repeat.toFixed(1)}%`,
  });

  const b2b = r.companies.totals;
  if (b2b.companyCount > 0) {
    out.push({
      id: "b2b-mix",
      severity: "neutral",
      title: `${b2b.companyCount} business accounts contribute ${b2b.b2bShare.toFixed(1)}% of revenue`,
      detail: `Business orders average ${money(b2b.b2bAverageOrderValue)} against ${money(
        b2b.b2cAverageOrderValue,
      )} for consumer orders — ${
        b2b.b2cAverageOrderValue > 0
          ? `${(b2b.b2bAverageOrderValue / b2b.b2cAverageOrderValue).toFixed(1)}× larger`
          : "materially larger"
      }.`,
      metric: `${b2b.b2bShare.toFixed(1)}%`,
    });
  }

  const stock = r.products.stockRisks;
  if (stock.length > 0) {
    out.push({
      id: "stock-risk",
      severity: "warning",
      title: `${stock.length} products will stock out within 3 weeks at current velocity`,
      detail: `${stock[0].name} has roughly ${stock[0].daysOfCover} days of cover left at ${stock[0].velocity} units/day.`,
      metric: `${stock.length} SKUs`,
    });
  }

  const topProduct = r.products.products[0];
  if (topProduct) {
    const aClass = r.products.products.filter((p) => p.abcClass === "A").length;
    out.push({
      id: "product-concentration",
      severity: "neutral",
      title: `${aClass} SKUs generate 80% of product revenue`,
      detail: `${topProduct.name} alone accounts for ${topProduct.revenueShare.toFixed(1)}% (${money(
        topProduct.revenue,
      )}) across ${topProduct.orders} orders.`,
      metric: `${aClass} of ${r.products.totals.skusSold}`,
    });
  }

  const refundRate = r.operations.fulfilment.refundRate;
  if (refundRate > 0) {
    out.push({
      id: "refunds",
      severity: refundRate >= 5 ? "critical" : refundRate >= 2 ? "warning" : "positive",
      title: `Refund rate is ${refundRate.toFixed(2)}%`,
      detail: `${money(r.kpis.refundedAmount.value)} refunded this period. Cancellations sit at ${r.operations.fulfilment.cancellationRate.toFixed(
        1,
      )}% of all orders.`,
      metric: `${refundRate.toFixed(2)}%`,
    });
  }

  const bestDay = [...r.operations.weekdayPerformance].sort((a, b) => b.revenue - a.revenue)[0];
  if (bestDay && bestDay.revenue > 0) {
    out.push({
      id: "peak-day",
      severity: "neutral",
      title: `${bestDay.label} is the strongest trading day`,
      detail: `${money(bestDay.revenue)} across ${bestDay.orders} orders, averaging ${money(
        bestDay.averageOrderValue,
      )} per order.`,
      metric: bestDay.label,
    });
  }

  const forecastTail = r.forecast.filter((f) => f.actual === null);
  if (forecastTail.length > 0) {
    const projected = forecastTail.reduce((s, f) => s + (f.forecast ?? 0), 0);
    out.push({
      id: "forecast",
      severity: "neutral",
      title: `Projected ${money(projected)} over the next ${forecastTail.length} days`,
      detail:
        "Trend plus day-of-week seasonality fitted on the selected range. The shaded band is a 95% interval on in-sample residuals.",
      metric: money(projected),
    });
  }

  const coupon = r.operations.coupons[0];
  if (coupon) {
    out.push({
      id: "coupons",
      severity: coupon.roi < 4 ? "warning" : "neutral",
      title: `${coupon.code} returned ${coupon.roi.toFixed(1)}× the discount given`,
      detail: `${coupon.uses} redemptions gave away ${money(coupon.discount)} and pulled in ${money(
        coupon.revenue,
      )} of orders.`,
      metric: `${coupon.roi.toFixed(1)}×`,
    });
  }

  return out;
}

export { isRefunded };
