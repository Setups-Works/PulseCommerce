import type { WooOrder, WooProduct } from "@/lib/woo/types";
import {
  bucketKey,
  bucketLabel,
  customerKey,
  isRefunded,
  isTransactional,
  num,
  round2,
  safeDiv,
} from "./helpers";
import type { Granularity, ProductAnalytics, ProductRecord } from "./types";

interface Acc {
  id: number;
  name: string;
  sku: string;
  category: string;
  revenue: number;
  net: number;
  units: number;
  refundedUnits: number;
  orderIds: Set<number>;
  customers: Set<string>;
  trend: Map<string, { units: number; revenue: number }>;
}

export function buildProductAnalytics(
  orders: WooOrder[],
  catalogue: WooProduct[],
  granularity: Granularity,
  rangeDays: number,
): ProductAnalytics {
  const byId = new Map(catalogue.map((p) => [p.id, p]));
  const acc = new Map<number, Acc>();

  // Co-occurrence counts for the market-basket view.
  const pairCounts = new Map<string, number>();
  const singleCounts = new Map<number, number>();
  let basketOrders = 0;

  for (const order of orders) {
    if (!isTransactional(order)) continue;
    const refunded = isRefunded(order);
    const ck = customerKey(order);
    const bucket = bucketKey(new Date(order.date_created), granularity);
    const idsInOrder = new Set<number>();

    for (const li of order.line_items) {
      const product = byId.get(li.product_id);
      const id = li.product_id || li.id;
      let entry = acc.get(id);
      if (!entry) {
        entry = {
          id,
          name: product?.name ?? li.name,
          sku: li.sku ?? product?.sku ?? "",
          category: product?.categories?.[0]?.name ?? "No category",
          revenue: 0,
          net: 0,
          units: 0,
          refundedUnits: 0,
          orderIds: new Set(),
          customers: new Set(),
          trend: new Map(),
        };
        acc.set(id, entry);
      }

      const lineRevenue = num(li.total);
      entry.units += li.quantity;
      entry.orderIds.add(order.id);
      entry.customers.add(ck);
      if (refunded) {
        entry.refundedUnits += li.quantity;
      } else {
        entry.revenue += lineRevenue;
        entry.net += lineRevenue;
      }

      const t = entry.trend.get(bucket) ?? { units: 0, revenue: 0 };
      t.units += li.quantity;
      t.revenue += refunded ? 0 : lineRevenue;
      entry.trend.set(bucket, t);

      idsInOrder.add(id);
    }

    if (idsInOrder.size > 1) {
      basketOrders += 1;
      const ids = [...idsInOrder].sort((a, b) => a - b);
      for (const id of ids) singleCounts.set(id, (singleCounts.get(id) ?? 0) + 1);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = `${ids[i]}|${ids[j]}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
      }
    } else if (idsInOrder.size === 1) {
      basketOrders += 1;
      const only = [...idsInOrder][0];
      singleCounts.set(only, (singleCounts.get(only) ?? 0) + 1);
    }
  }

  const totalRevenue = [...acc.values()].reduce((s, e) => s + e.revenue, 0);

  const products: ProductRecord[] = [...acc.values()]
    .map((e) => {
      const product = byId.get(e.id);
      const stock = product?.stock_quantity ?? null;
      const velocity = safeDiv(e.units, Math.max(1, rangeDays));
      return {
        id: e.id,
        name: e.name,
        sku: e.sku,
        category: e.category,
        revenue: round2(e.revenue),
        netRevenue: round2(e.net),
        units: e.units,
        orders: e.orderIds.size,
        customers: e.customers.size,
        averagePrice: round2(safeDiv(e.revenue, Math.max(1, e.units - e.refundedUnits))),
        refundedUnits: e.refundedUnits,
        refundRate: round2(safeDiv(e.refundedUnits, e.units) * 100),
        revenueShare: round2(safeDiv(e.revenue, totalRevenue) * 100),
        cumulativeShare: 0,
        abcClass: "C" as const,
        stockQuantity: stock,
        stockStatus: product?.stock_status ?? "unknown",
        velocity: round2(velocity),
        daysOfCover: stock === null || velocity === 0 ? null : Math.round(stock / velocity),
        price: num(product?.price),
        averageRating: num(product?.average_rating),
        ratingCount: product?.rating_count ?? 0,
        trend: [...e.trend.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({ date: bucketLabel(date, granularity), units: v.units, revenue: round2(v.revenue) })),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // ABC: A carries the first 80% of revenue, B the next 15%, C the tail.
  let running = 0;
  for (const p of products) {
    running += p.revenueShare;
    p.cumulativeShare = round2(running);
    p.abcClass = running <= 80 ? "A" : running <= 95 ? "B" : "C";
  }

  const categoryMap = new Map<string, { revenue: number; units: number; orders: Set<number>; products: number }>();
  for (const p of products) {
    const c = categoryMap.get(p.category) ?? { revenue: 0, units: 0, orders: new Set<number>(), products: 0 };
    c.revenue += p.revenue;
    c.units += p.units;
    c.products += 1;
    categoryMap.set(p.category, c);
  }
  // Order counts per category need the raw orders, not the per-product sets.
  for (const order of orders) {
    if (!isTransactional(order)) continue;
    const cats = new Set<string>();
    for (const li of order.line_items) {
      cats.add(byId.get(li.product_id)?.categories?.[0]?.name ?? "No category");
    }
    for (const c of cats) categoryMap.get(c)?.orders.add(order.id);
  }

  const categories = [...categoryMap.entries()]
    .map(([name, c]) => ({
      name,
      revenue: round2(c.revenue),
      units: c.units,
      orders: c.orders.size,
      products: c.products,
      share: round2(safeDiv(c.revenue, totalRevenue) * 100),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const affinities = [...pairCounts.entries()]
    .map(([key, count]) => {
      const [aId, bId] = key.split("|").map(Number);
      const a = acc.get(aId);
      const b = acc.get(bId);
      if (!a || !b) return null;
      const support = safeDiv(count, basketOrders);
      const confidence = safeDiv(count, singleCounts.get(aId) ?? 1);
      const bSupport = safeDiv(singleCounts.get(bId) ?? 0, basketOrders);
      return {
        a: a.name,
        b: b.name,
        support: round2(support * 100),
        confidence: round2(confidence * 100),
        lift: round2(bSupport === 0 ? 0 : confidence / bSupport),
        orders: count,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null && v.orders >= 3)
    .sort((x, y) => y.lift - x.lift || y.orders - x.orders)
    .slice(0, 25);

  const soldIds = new Set(products.map((p) => p.id));
  const neverSold: ProductRecord[] = catalogue
    .filter((p) => !soldIds.has(p.id))
    .slice(0, 50)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.categories?.[0]?.name ?? "No category",
      revenue: 0,
      netRevenue: 0,
      units: 0,
      orders: 0,
      customers: 0,
      averagePrice: 0,
      refundedUnits: 0,
      refundRate: 0,
      revenueShare: 0,
      cumulativeShare: 100,
      abcClass: "C",
      stockQuantity: p.stock_quantity,
      stockStatus: p.stock_status,
      velocity: 0,
      daysOfCover: null,
      price: num(p.price),
      averageRating: num(p.average_rating),
      ratingCount: p.rating_count,
      trend: [],
    }));

  const stockRisks = products
    .filter((p) => p.daysOfCover !== null && p.daysOfCover < 21 && p.velocity > 0)
    .sort((a, b) => (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0))
    .slice(0, 25);

  const totalUnits = products.reduce((s, p) => s + p.units, 0);

  return {
    products,
    categories,
    bestSellers: products.slice(0, 25),
    // Slow movers first, then anything in the catalogue that never sold at all.
    underperformers: [...products]
      .filter((p) => p.units > 0)
      .sort((a, b) => a.revenue - b.revenue)
      .slice(0, 25)
      .concat(neverSold.slice(0, 25)),
    stockRisks,
    affinities,
    totals: {
      skusSold: products.length,
      catalogueSize: catalogue.length || products.length,
      unitsSold: totalUnits,
      averageUnitPrice: round2(safeDiv(totalRevenue, totalUnits)),
    },
  };
}
