import type { WooOrderStatus } from "@/lib/woo/types";

export type Granularity = "day" | "week" | "month";

export interface DateRange {
  from: string; // ISO date (inclusive)
  to: string; // ISO date (inclusive)
}

export interface Metric {
  value: number;
  previous: number;
  /** Fractional change vs the previous equal-length period. null when previous is 0. */
  change: number | null;
}

export interface KpiSet {
  grossRevenue: Metric;
  netRevenue: Metric;
  orders: Metric;
  averageOrderValue: Metric;
  unitsSold: Metric;
  activeCustomers: Metric;
  newCustomers: Metric;
  returningCustomers: Metric;
  refundedAmount: Metric;
  discountTotal: Metric;
  shippingTotal: Metric;
  taxTotal: Metric;
  /**
   * Share of customers active in the period who had bought before it. Distinct
   * from `customers.averages.repeatRate`, which is the share who bought more
   * than once *inside* the period — on a 30-day window those differ a lot.
   */
  returningCustomerRate: Metric;
  revenuePerCustomer: Metric;
  itemsPerOrder: Metric;
  cancellationRate: Metric;
}

export interface TimePoint {
  date: string;
  label: string;
  revenue: number;
  netRevenue: number;
  orders: number;
  customers: number;
  units: number;
  averageOrderValue: number;
  refunds: number;
  discounts: number;
  newCustomers: number;
  returningCustomers: number;
}

export type RfmSegment =
  | "Champions"
  | "Loyal"
  | "Potential Loyalist"
  | "New Customers"
  | "Promising"
  | "Need Attention"
  | "At Risk"
  | "Cannot Lose Them"
  | "Hibernating"
  | "Lost";

export type ValueTier = "VIP" | "High" | "Mid" | "Low" | "One-time";

export interface CustomerRecord {
  id: number;
  key: string;
  name: string;
  email: string;
  company: string;
  country: string;
  state: string;
  city: string;
  orders: number;
  grossRevenue: number;
  netRevenue: number;
  refunded: number;
  discounts: number;
  units: number;
  averageOrderValue: number;
  firstOrderDate: string;
  lastOrderDate: string;
  /** Days between first and last order. 0 for single-purchase customers. */
  lifespanDays: number;
  recencyDays: number;
  /** Mean days between consecutive orders; null when they've ordered once. */
  averageDaysBetweenOrders: number | null;
  /** Orders per 30 days across their active lifespan. */
  purchaseFrequency: number;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  rfmScore: number;
  segment: RfmSegment;
  tier: ValueTier;
  /** Historic value + naive forward projection over the next 12 months. */
  predictedClv: number;
  churnRisk: number;
  topProducts: { name: string; units: number; revenue: number }[];
  paymentMethods: string[];
  revenueShare: number;
  /** Percentile of this customer's revenue across the whole base (0-100). */
  revenuePercentile: number;
  /** True when their first ever order fell inside the selected range. */
  isNewCustomer: boolean;
  /** Their orders in this period, newest first — powers the profile view. */
  history: {
    id: number;
    number: string;
    date: string;
    status: WooOrderStatus;
    total: number;
    net: number;
    units: number;
    items: string[];
  }[];
  /** How they arrived, when WooCommerce Order Attribution recorded it. */
  channel: string | null;
  deviceType: string | null;
}

export interface CustomerAnalytics {
  /**
   * Every customer active in the period, highest revenue first. The cohort
   * views the UI offers are derived from this rather than shipped separately,
   * so none of them is silently capped.
   */
  records: CustomerRecord[];
  /**
   * How many customers were actually active, which exceeds `records.length`
   * on large stores. Reported so the UI can say it is showing a subset rather
   * than quietly presenting the top slice as the whole base.
   */
  totalCustomers: number;
  segmentBreakdown: { segment: RfmSegment; customers: number; revenue: number; share: number; averageOrderValue: number }[];
  tierBreakdown: { tier: ValueTier; customers: number; revenue: number; share: number; averageOrderValue: number }[];
  /** Revenue concentration by decile — the Pareto read on the customer base. */
  deciles: { decile: number; label: string; customers: number; revenue: number; share: number; cumulativeShare: number }[];
  concentration: {
    top1Share: number;
    top5Share: number;
    top10Share: number;
    top20Share: number;
    bottom50Share: number;
    giniCoefficient: number;
  };
  averages: {
    clv: number;
    orderValue: number;
    ordersPerCustomer: number;
    daysBetweenOrders: number;
    repeatRate: number;
    oneTimeBuyerShare: number;
  };
  newVsReturning: { month: string; label: string; newCustomers: number; returning: number; newRevenue: number; returningRevenue: number }[];
}

export interface ProductRecord {
  id: number;
  name: string;
  sku: string;
  category: string;
  revenue: number;
  netRevenue: number;
  units: number;
  orders: number;
  customers: number;
  averagePrice: number;
  refundedUnits: number;
  refundRate: number;
  revenueShare: number;
  cumulativeShare: number;
  /** Pareto class: A = top 80% of revenue, B = next 15%, C = the tail. */
  abcClass: "A" | "B" | "C";
  stockQuantity: number | null;
  stockStatus: string;
  /** Units sold per day over the range — feeds days-of-cover. */
  velocity: number;
  daysOfCover: number | null;
  price: number;
  averageRating: number;
  ratingCount: number;
  trend: { date: string; units: number; revenue: number }[];
}

export interface ProductAnalytics {
  products: ProductRecord[];
  categories: { name: string; revenue: number; units: number; orders: number; products: number; share: number }[];
  bestSellers: ProductRecord[];
  underperformers: ProductRecord[];
  stockRisks: ProductRecord[];
  /** Products frequently bought together, by co-occurrence lift. */
  affinities: { a: string; b: string; support: number; confidence: number; lift: number; orders: number }[];
  totals: { skusSold: number; catalogueSize: number; unitsSold: number; averageUnitPrice: number };
}

export interface InventoryRecord {
  id: number;
  name: string;
  sku: string;
  category: string;
  stockQuantity: number | null;
  stockStatus: string;
  velocity: number;
  daysOfCover: number | null;
  /** Stock level at which a reorder must be placed to avoid a stockout. */
  reorderPoint: number;
  /** Units to order now to reach a healthy cover level. */
  suggestedOrder: number;
  status: "out-of-stock" | "critical" | "low" | "healthy" | "overstocked" | "untracked" | "no-sales";
  revenue: number;
  units: number;
  averagePrice: number;
  /** Revenue that would be lost over one lead time if this SKU stays out. */
  revenueAtRisk: number;
  /** Capital tied up, at selling price. */
  stockValue: number;
}

export interface InventoryAnalytics {
  records: InventoryRecord[];
  needsReorder: InventoryRecord[];
  overstocked: InventoryRecord[];
  counts: {
    outOfStock: number;
    critical: number;
    low: number;
    healthy: number;
    overstocked: number;
    untracked: number;
    noSales: number;
  };
  totals: {
    trackedSkus: number;
    unitsOnHand: number;
    stockValue: number;
    revenueAtRisk: number;
    suggestedUnits: number;
    averageDaysOfCover: number;
  };
  assumptions: { leadTimeDays: number; safetyStockDays: number };
}

export interface CohortRow {
  cohort: string;
  label: string;
  size: number;
  /** Index 0 is the acquisition month itself. */
  retention: (number | null)[];
  revenue: (number | null)[];
  cumulativeRevenuePerCustomer: number[];
  totalRevenue: number;
}

export interface CohortAnalytics {
  rows: CohortRow[];
  periods: number;
  averageRetention: (number | null)[];
  /** Mean cumulative revenue per acquired customer, by month-since-acquisition. */
  ltvCurve: { month: number; value: number }[];
}

export interface GeoRecord {
  code: string;
  name: string;
  revenue: number;
  orders: number;
  customers: number;
  averageOrderValue: number;
  share: number;
}

export interface OrderRecord {
  id: number;
  number: string;
  date: string;
  status: WooOrderStatus;
  customerName: string;
  customerEmail: string;
  company: string;
  country: string;
  items: number;
  units: number;
  total: number;
  net: number;
  discount: number;
  shipping: number;
  tax: number;
  refunded: number;
  paymentMethod: string;
  coupons: string[];
  isNewCustomer: boolean;
}

export interface OperationsAnalytics {
  statusBreakdown: { status: WooOrderStatus; label: string; orders: number; revenue: number; share: number }[];
  paymentMethods: { method: string; orders: number; revenue: number; share: number; averageOrderValue: number }[];
  coupons: { code: string; uses: number; discount: number; revenue: number; averageDiscount: number; roi: number }[];
  hourlyHeatmap: { day: number; dayLabel: string; hour: number; orders: number; revenue: number }[];
  weekdayPerformance: { day: number; label: string; orders: number; revenue: number; averageOrderValue: number }[];
  fulfilment: { averageHoursToComplete: number | null; completedShare: number; cancellationRate: number; refundRate: number };
  basketDistribution: { bucket: string; from: number; to: number | null; orders: number; revenue: number; share: number }[];
}

export interface ForecastPoint {
  date: string;
  label: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface ChannelRecord {
  label: string;
  group: string;
  sourceType: string;
  orders: number;
  revenue: number;
  customers: number;
  newCustomers: number;
  returningCustomers: number;
  newRevenue: number;
  returningRevenue: number;
  averageOrderValue: number;
  revenuePerCustomer: number;
  share: number;
  newCustomerShare: number;
  topDevice: string;
  averageSessionPages: number | null;
  monthly: { month: string; label: string; revenue: number; orders: number }[];
}

/** A channel whose `label` is a utm_campaign value. */
export type CampaignRecord = ChannelRecord;

export interface AcquisitionAnalytics {
  /** False when the store carries no WooCommerce Order Attribution meta at all. */
  hasAttribution: boolean;
  attributedShare: number;
  channels: ChannelRecord[];
  campaigns: CampaignRecord[];
  devices: {
    device: string;
    orders: number;
    revenue: number;
    customers: number;
    averageOrderValue: number;
    share: number;
  }[];
  newVsReturning: {
    newRevenue: number;
    returningRevenue: number;
    newOrders: number;
    returningOrders: number;
    newShare: number;
    newAverageOrderValue: number;
    returningAverageOrderValue: number;
  };
  /** How long customers take to place a second order. */
  repeatLatency: {
    median: number | null;
    p25: number | null;
    p75: number | null;
    sample: number;
    buckets: { label: string; customers: number; share: number }[];
  };
}

export interface Insight {
  id: string;
  severity: "positive" | "neutral" | "warning" | "critical";
  title: string;
  detail: string;
  metric?: string;
}

export interface AnalyticsResult {
  meta: {
    storeName: string;
    storeUrl: string;
    currency: string;
    fetchedAt: string;
    generatedAt: string;
    range: DateRange;
    previousRange: DateRange;
    granularity: Granularity;
    orderCount: number;
    warnings: string[];
    /** Full history bounds available in the snapshot, for range pickers. */
    dataBounds: DateRange | null;
  };
  kpis: KpiSet;
  timeseries: TimePoint[];
  customers: CustomerAnalytics;
  acquisition: AcquisitionAnalytics;
  products: ProductAnalytics;
  inventory: InventoryAnalytics;
  cohorts: CohortAnalytics;
  geography: { countries: GeoRecord[]; states: GeoRecord[]; cities: GeoRecord[] };
  operations: OperationsAnalytics;
  orders: OrderRecord[];
  forecast: ForecastPoint[];
  insights: Insight[];
}
