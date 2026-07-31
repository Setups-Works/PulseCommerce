import { channelGroup, channelLabel, cleanHost } from "@/lib/woo/attribution";
import type { WooOrder } from "@/lib/woo/types";
import {
  customerKey,
  DAY_MS,
  isTransactional,
  monthKey,
  monthLabel,
  num,
  orderNet,
  round2,
  safeDiv,
} from "./helpers";
import type { AcquisitionAnalytics, ChannelRecord, CampaignRecord } from "./types";

interface ChannelAcc {
  key: string;
  label: string;
  group: string;
  sourceType: string;
  orders: number;
  revenue: number;
  newCustomers: Set<string>;
  returningCustomers: Set<string>;
  newRevenue: number;
  returningRevenue: number;
  devices: Map<string, number>;
  sessionPages: number[];
  monthly: Map<string, { revenue: number; orders: number }>;
}

/**
 * Acquisition and channel analytics, built on WooCommerce Order Attribution.
 *
 * Stores running Woo below 8.5, or with attribution disabled, carry no such
 * meta at all — `hasAttribution` reports that so the UI can explain the gap
 * rather than render a page of zeroes.
 */
export function buildAcquisitionAnalytics(
  orders: WooOrder[],
  firstOrderByCustomer: Map<string, number>,
): AcquisitionAnalytics {
  const channels = new Map<string, ChannelAcc>();
  const campaigns = new Map<string, ChannelAcc>();
  const devices = new Map<string, { orders: number; revenue: number; customers: Set<string> }>();

  let attributed = 0;
  let considered = 0;

  // Days from first to second order, per customer — the repeat-purchase latency.
  const ordersByCustomer = new Map<string, number[]>();

  let newRevenue = 0;
  let returningRevenue = 0;
  let newOrders = 0;
  let returningOrders = 0;

  for (const order of orders) {
    if (!isTransactional(order)) continue;
    considered += 1;

    const value = Math.max(0, orderNet(order));
    const ck = customerKey(order);
    const created = new Date(order.date_created).getTime();

    const times = ordersByCustomer.get(ck) ?? [];
    times.push(created);
    ordersByCustomer.set(ck, times);

    const firstEver = firstOrderByCustomer.get(ck);
    const isNew = firstEver !== undefined && Math.abs(firstEver - created) < 1000;
    if (isNew) {
      newRevenue += value;
      newOrders += 1;
    } else {
      returningRevenue += value;
      returningOrders += 1;
    }

    const a = order.attribution;
    if (!a) continue;
    attributed += 1;

    const device = a.deviceType || "Unknown";
    const d = devices.get(device) ?? { orders: 0, revenue: 0, customers: new Set<string>() };
    d.orders += 1;
    d.revenue += value;
    d.customers.add(ck);
    devices.set(device, d);

    accumulate(channels, channelLabel(a), channelGroup(a), a.sourceType, order, value, ck, isNew, a.deviceType, a.sessionPages);

    // A campaign only exists when a utm_campaign was actually tagged.
    if (a.campaign) {
      accumulate(
        campaigns,
        a.campaign,
        `${a.source || "unknown"} / ${a.medium || "unknown"}`,
        a.sourceType,
        order,
        value,
        ck,
        isNew,
        a.deviceType,
        a.sessionPages,
      );
    }
  }

  // Time-to-second-order, across customers who reordered at all.
  const latencies: number[] = [];
  for (const times of ordersByCustomer.values()) {
    if (times.length < 2) continue;
    times.sort((a, b) => a - b);
    latencies.push((times[1] - times[0]) / DAY_MS);
  }
  latencies.sort((a, b) => a - b);

  const totalRevenue = newRevenue + returningRevenue;

  return {
    hasAttribution: attributed > 0,
    attributedShare: round2(safeDiv(attributed, considered) * 100),
    channels: finalise(channels, totalRevenue),
    campaigns: finalise(campaigns, totalRevenue) as CampaignRecord[],
    devices: [...devices.entries()]
      .map(([device, v]) => ({
        device,
        orders: v.orders,
        revenue: round2(v.revenue),
        customers: v.customers.size,
        averageOrderValue: round2(safeDiv(v.revenue, v.orders)),
        share: round2(safeDiv(v.revenue, totalRevenue) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue),
    newVsReturning: {
      newRevenue: round2(newRevenue),
      returningRevenue: round2(returningRevenue),
      newOrders,
      returningOrders,
      newShare: round2(safeDiv(newRevenue, totalRevenue) * 100),
      newAverageOrderValue: round2(safeDiv(newRevenue, newOrders)),
      returningAverageOrderValue: round2(safeDiv(returningRevenue, returningOrders)),
    },
    repeatLatency: {
      median: latencies.length ? round2(latencies[Math.floor(latencies.length / 2)]) : null,
      p25: latencies.length ? round2(latencies[Math.floor(latencies.length * 0.25)]) : null,
      p75: latencies.length ? round2(latencies[Math.floor(latencies.length * 0.75)]) : null,
      sample: latencies.length,
      // Buckets for the histogram of "how long until they came back".
      buckets: bucketLatencies(latencies),
    },
  };
}

function accumulate(
  target: Map<string, ChannelAcc>,
  label: string,
  group: string,
  sourceType: string,
  order: WooOrder,
  value: number,
  customer: string,
  isNew: boolean,
  device: string,
  sessionPages: number | null,
): void {
  let entry = target.get(label);
  if (!entry) {
    entry = {
      key: label,
      label,
      group,
      sourceType,
      orders: 0,
      revenue: 0,
      newCustomers: new Set(),
      returningCustomers: new Set(),
      newRevenue: 0,
      returningRevenue: 0,
      devices: new Map(),
      sessionPages: [],
      monthly: new Map(),
    };
    target.set(label, entry);
  }

  entry.orders += 1;
  entry.revenue += value;
  if (isNew) {
    entry.newCustomers.add(customer);
    entry.newRevenue += value;
  } else {
    entry.returningCustomers.add(customer);
    entry.returningRevenue += value;
  }
  entry.devices.set(device, (entry.devices.get(device) ?? 0) + 1);
  if (sessionPages !== null) entry.sessionPages.push(sessionPages);

  const mk = monthKey(new Date(order.date_created));
  const m = entry.monthly.get(mk) ?? { revenue: 0, orders: 0 };
  m.revenue += value;
  m.orders += 1;
  entry.monthly.set(mk, m);
}

function finalise(map: Map<string, ChannelAcc>, totalRevenue: number): ChannelRecord[] {
  return [...map.values()]
    .map((e) => {
      const customers = e.newCustomers.size + e.returningCustomers.size;
      const monthly = [...e.monthly.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, label: monthLabel(month), revenue: round2(v.revenue), orders: v.orders }));

      const topDevice = [...e.devices.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";

      return {
        label: e.label,
        group: e.group,
        sourceType: e.sourceType,
        orders: e.orders,
        revenue: round2(e.revenue),
        customers,
        newCustomers: e.newCustomers.size,
        returningCustomers: e.returningCustomers.size,
        newRevenue: round2(e.newRevenue),
        returningRevenue: round2(e.returningRevenue),
        averageOrderValue: round2(safeDiv(e.revenue, e.orders)),
        revenuePerCustomer: round2(safeDiv(e.revenue, customers)),
        share: round2(safeDiv(e.revenue, totalRevenue) * 100),
        // Share of this channel's buyers that were brand new to the store.
        newCustomerShare: round2(safeDiv(e.newCustomers.size, customers) * 100),
        topDevice,
        averageSessionPages: e.sessionPages.length
          ? round2(e.sessionPages.reduce((s, v) => s + v, 0) / e.sessionPages.length)
          : null,
        monthly,
      } satisfies ChannelRecord;
    })
    .sort((a, b) => b.revenue - a.revenue);
}

const LATENCY_BUCKETS: { label: string; max: number }[] = [
  { label: "0–7 days", max: 7 },
  { label: "8–30 days", max: 30 },
  { label: "31–60 days", max: 60 },
  { label: "61–90 days", max: 90 },
  { label: "91–180 days", max: 180 },
  { label: "180+ days", max: Infinity },
];

function bucketLatencies(sorted: number[]) {
  const counts = LATENCY_BUCKETS.map((b) => ({ label: b.label, customers: 0, share: 0 }));
  for (const days of sorted) {
    const idx = LATENCY_BUCKETS.findIndex((b) => days <= b.max);
    counts[idx === -1 ? counts.length - 1 : idx].customers += 1;
  }
  for (const c of counts) c.share = round2(safeDiv(c.customers, sorted.length) * 100);
  return counts;
}

export { cleanHost, num };
