import type { WooOrder, WooOrderStatus } from "@/lib/woo/types";
import {
  countsAsRevenue,
  isCancelled,
  isTransactional,
  num,
  orderNet,
  orderRefundTotal,
  round2,
  safeDiv,
  STATUS_LABELS,
} from "./helpers";
import type { OperationsAnalytics } from "./types";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const BASKET_BUCKETS: { bucket: string; from: number; to: number | null }[] = [
  { bucket: "Under 25", from: 0, to: 25 },
  { bucket: "25–50", from: 25, to: 50 },
  { bucket: "50–100", from: 50, to: 100 },
  { bucket: "100–250", from: 100, to: 250 },
  { bucket: "250–500", from: 250, to: 500 },
  { bucket: "500–1k", from: 500, to: 1000 },
  { bucket: "1k+", from: 1000, to: null },
];

export function buildOperationsAnalytics(orders: WooOrder[]): OperationsAnalytics {
  const statusMap = new Map<WooOrderStatus, { orders: number; revenue: number }>();
  const paymentMap = new Map<string, { orders: number; revenue: number }>();
  const couponMap = new Map<string, { uses: number; discount: number; revenue: number }>();
  const heat = new Map<string, { orders: number; revenue: number }>();
  const weekday = new Map<number, { orders: number; revenue: number }>();
  const baskets = BASKET_BUCKETS.map((b) => ({ ...b, orders: 0, revenue: 0, share: 0 }));

  let totalRevenue = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let fulfilmentHours = 0;
  let fulfilmentSamples = 0;

  for (const order of orders) {
    const value = Math.max(0, orderNet(order));
    const created = new Date(order.date_created);

    const s = statusMap.get(order.status) ?? { orders: 0, revenue: 0 };
    s.orders += 1;
    s.revenue += countsAsRevenue(order) ? value : 0;
    statusMap.set(order.status, s);

    if (isCancelled(order)) cancelledCount += 1;
    if (order.status === "completed") {
      completedCount += 1;
      if (order.date_completed) {
        const hours = (new Date(order.date_completed).getTime() - created.getTime()) / 3_600_000;
        if (hours >= 0 && hours < 24 * 90) {
          fulfilmentHours += hours;
          fulfilmentSamples += 1;
        }
      }
    }

    if (!isTransactional(order)) continue;
    totalRevenue += value;

    const method = order.payment_method_title || order.payment_method || "Unknown";
    const p = paymentMap.get(method) ?? { orders: 0, revenue: 0 };
    p.orders += 1;
    p.revenue += value;
    paymentMap.set(method, p);

    for (const coupon of order.coupon_lines ?? []) {
      const c = couponMap.get(coupon.code) ?? { uses: 0, discount: 0, revenue: 0 };
      c.uses += 1;
      c.discount += num(coupon.discount);
      c.revenue += value;
      couponMap.set(coupon.code, c);
    }

    const day = created.getDay();
    const hour = created.getHours();
    const hk = `${day}:${hour}`;
    const h = heat.get(hk) ?? { orders: 0, revenue: 0 };
    h.orders += 1;
    h.revenue += value;
    heat.set(hk, h);

    const w = weekday.get(day) ?? { orders: 0, revenue: 0 };
    w.orders += 1;
    w.revenue += value;
    weekday.set(day, w);

    const total = num(order.total);
    const bucket = baskets.find((b) => total >= b.from && (b.to === null || total < b.to));
    if (bucket) {
      bucket.orders += 1;
      bucket.revenue += value;
    }
  }

  const totalOrders = orders.length || 1;
  const transactionalOrders = orders.filter(isTransactional).length || 1;

  const statusBreakdown = [...statusMap.entries()]
    .map(([status, v]) => ({
      status,
      label: STATUS_LABELS[status] ?? status,
      orders: v.orders,
      revenue: round2(v.revenue),
      share: round2((v.orders / totalOrders) * 100),
    }))
    .sort((a, b) => b.orders - a.orders);

  const paymentMethods = [...paymentMap.entries()]
    .map(([method, v]) => ({
      method,
      orders: v.orders,
      revenue: round2(v.revenue),
      share: round2(safeDiv(v.revenue, totalRevenue) * 100),
      averageOrderValue: round2(safeDiv(v.revenue, v.orders)),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const coupons = [...couponMap.entries()]
    .map(([code, v]) => ({
      code,
      uses: v.uses,
      discount: round2(v.discount),
      revenue: round2(v.revenue),
      averageDiscount: round2(safeDiv(v.discount, v.uses)),
      // Revenue captured per unit of discount given away.
      roi: round2(safeDiv(v.revenue, v.discount)),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const hourlyHeatmap = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const v = heat.get(`${day}:${hour}`);
      hourlyHeatmap.push({
        day,
        dayLabel: DAY_LABELS[day],
        hour,
        orders: v?.orders ?? 0,
        revenue: round2(v?.revenue ?? 0),
      });
    }
  }

  const weekdayPerformance = Array.from({ length: 7 }, (_, day) => {
    const v = weekday.get(day) ?? { orders: 0, revenue: 0 };
    return {
      day,
      label: DAY_LABELS[day],
      orders: v.orders,
      revenue: round2(v.revenue),
      averageOrderValue: round2(safeDiv(v.revenue, v.orders)),
    };
  });

  for (const b of baskets) {
    b.share = round2((b.orders / transactionalOrders) * 100);
    b.revenue = round2(b.revenue);
  }

  const refundTotal = orders.reduce((s, o) => s + orderRefundTotal(o), 0);

  return {
    statusBreakdown,
    paymentMethods,
    coupons,
    hourlyHeatmap,
    weekdayPerformance,
    fulfilment: {
      averageHoursToComplete: fulfilmentSamples ? round2(fulfilmentHours / fulfilmentSamples) : null,
      completedShare: round2((completedCount / totalOrders) * 100),
      cancellationRate: round2((cancelledCount / totalOrders) * 100),
      refundRate: round2(safeDiv(refundTotal, totalRevenue + refundTotal) * 100),
    },
    basketDistribution: baskets,
  };
}

export { DAY_LABELS };
