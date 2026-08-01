import { monthLabel, STATUS_LABELS } from "@/lib/analytics/helpers";
import type { AnalyticsResult } from "@/lib/analytics/types";

export type ColumnFormat = "text" | "number" | "currency" | "percent" | "date" | "datetime" | "integer";

export interface Column {
  key: string;
  header: string;
  format: ColumnFormat;
  width?: number;
}

export interface Sheet {
  id: string;
  title: string;
  description: string;
  columns: Column[];
  rows: Record<string, unknown>[];
}

export const REPORT_IDS = [
  "executive",
  "customers",
  "segments",
  "products",
  "categories",
  "orders",
  "cohorts",
  "geography",
  "operations",
  "forecast",
] as const;

export type ReportId = (typeof REPORT_IDS)[number];

export const REPORT_CATALOGUE: { id: ReportId; name: string; description: string }[] = [
  { id: "executive", name: "Executive summary", description: "Headline KPIs, period comparison and generated insights." },
  { id: "customers", name: "Customer ledger", description: "Every customer with RFM scores, CLV, tier and churn risk." },
  { id: "segments", name: "Segmentation & concentration", description: "RFM segments, value tiers and revenue deciles." },
  { id: "products", name: "Product performance", description: "Revenue, units, ABC class, refund rate and stock cover." },
  { id: "categories", name: "Category performance", description: "Revenue and unit mix by product category." },
  { id: "orders", name: "Order register", description: "Line-level order export with totals, tax, discount and status." },
  { id: "cohorts", name: "Cohort retention", description: "Monthly acquisition cohorts with retention and LTV curve." },
  { id: "geography", name: "Geographic breakdown", description: "Revenue by country, region and city." },
  { id: "operations", name: "Operations & payments", description: "Status mix, payment methods, coupons and trading patterns." },
  { id: "forecast", name: "Revenue forecast", description: "Daily actuals plus a 14–30 day projection with confidence band." },
];

export function buildSheet(id: ReportId, r: AnalyticsResult): Sheet {
  switch (id) {
    case "executive":
      return executiveSheet(r);
    case "customers":
      return customersSheet(r);
    case "segments":
      return segmentsSheet(r);
    case "products":
      return productsSheet(r);
    case "categories":
      return categoriesSheet(r);
    case "orders":
      return ordersSheet(r);
    case "cohorts":
      return cohortsSheet(r);
    case "geography":
      return geographySheet(r);
    case "operations":
      return operationsSheet(r);
    case "forecast":
      return forecastSheet(r);
  }
}

const KPI_LABELS: Record<string, string> = {
  grossRevenue: "Gross revenue",
  netRevenue: "Net revenue",
  orders: "Orders",
  averageOrderValue: "Average order value",
  unitsSold: "Units sold",
  activeCustomers: "Active customers",
  newCustomers: "New customers",
  returningCustomers: "Returning customers",
  refundedAmount: "Refunded amount",
  discountTotal: "Discounts given",
  shippingTotal: "Shipping collected",
  taxTotal: "Tax collected",
  returningCustomerRate: "Returning customer rate",
  revenuePerCustomer: "Revenue per customer",
  itemsPerOrder: "Items per order",
  cancellationRate: "Cancellation rate",
};

const CURRENCY_KPIS = new Set([
  "grossRevenue", "netRevenue", "averageOrderValue", "refundedAmount",
  "discountTotal", "shippingTotal", "taxTotal", "revenuePerCustomer",
]);
const PERCENT_KPIS = new Set(["returningCustomerRate", "cancellationRate"]);

function executiveSheet(r: AnalyticsResult): Sheet {
  const rows = Object.entries(r.kpis).map(([key, m]) => ({
    metric: KPI_LABELS[key] ?? key,
    value: m.value,
    previous: m.previous,
    change: m.change === null ? null : Math.round(m.change * 10000) / 100,
    unit: CURRENCY_KPIS.has(key) ? r.meta.currency : PERCENT_KPIS.has(key) ? "%" : "count",
    // Lets the workbook writer pick a per-row number format, since a single
    // column here mixes money, counts and percentages.
    valueFormat: CURRENCY_KPIS.has(key) ? "currency" : PERCENT_KPIS.has(key) ? "percent" : "integer",
  }));

  return {
    id: "executive",
    title: "Executive summary",
    description: `${r.meta.range.from} to ${r.meta.range.to}, compared with ${r.meta.previousRange.from} to ${r.meta.previousRange.to}.`,
    columns: [
      { key: "metric", header: "Metric", format: "text", width: 30 },
      { key: "value", header: "This period", format: "number", width: 16 },
      { key: "previous", header: "Previous period", format: "number", width: 18 },
      { key: "change", header: "Change %", format: "percent", width: 14 },
      { key: "unit", header: "Unit", format: "text", width: 12 },
    ],
    rows,
  };
}

function customersSheet(r: AnalyticsResult): Sheet {
  return {
    id: "customers",
    title: "Customer ledger",
    description: "One row per customer active in the selected period, scored on recency, frequency and monetary value.",
    columns: [
      { key: "name", header: "Customer", format: "text", width: 26 },
      { key: "email", header: "Email", format: "text", width: 30 },
      { key: "company", header: "Company", format: "text", width: 24 },
      { key: "country", header: "Country", format: "text", width: 10 },
      { key: "tier", header: "Value tier", format: "text", width: 12 },
      { key: "segment", header: "RFM segment", format: "text", width: 20 },
      { key: "orders", header: "Orders", format: "integer", width: 10 },
      { key: "netRevenue", header: "Net revenue", format: "currency", width: 16 },
      { key: "averageOrderValue", header: "AOV", format: "currency", width: 14 },
      { key: "units", header: "Units", format: "integer", width: 10 },
      { key: "predictedClv", header: "Predicted CLV", format: "currency", width: 16 },
      { key: "refunded", header: "Refunded", format: "currency", width: 14 },
      { key: "recencyDays", header: "Days since last order", format: "integer", width: 20 },
      { key: "averageDaysBetweenOrders", header: "Avg days between orders", format: "number", width: 22 },
      { key: "churnRisk", header: "Churn risk", format: "percent", width: 12 },
      { key: "revenuePercentile", header: "Revenue percentile", format: "number", width: 18 },
      { key: "firstOrderDate", header: "First order", format: "date", width: 14 },
      { key: "lastOrderDate", header: "Last order", format: "date", width: 14 },
    ],
    rows: r.customers.records.map((c) => ({ ...c, churnRisk: c.churnRisk * 100 })),
  };
}

function segmentsSheet(r: AnalyticsResult): Sheet {
  const rows: Record<string, unknown>[] = [
    ...r.customers.segmentBreakdown.map((s) => ({
      grouping: "RFM segment",
      label: s.segment,
      customers: s.customers,
      revenue: s.revenue,
      share: s.share,
      averageOrderValue: s.averageOrderValue,
    })),
    ...r.customers.tierBreakdown.map((t) => ({
      grouping: "Value tier",
      label: t.tier,
      customers: t.customers,
      revenue: t.revenue,
      share: t.share,
      averageOrderValue: t.averageOrderValue,
    })),
    ...r.customers.deciles.map((d) => ({
      grouping: "Revenue decile",
      label: d.label,
      customers: d.customers,
      revenue: d.revenue,
      share: d.share,
      averageOrderValue: null,
      cumulativeShare: d.cumulativeShare,
    })),
  ];

  return {
    id: "segments",
    title: "Segmentation & concentration",
    description: `Top 10% of customers hold ${r.customers.concentration.top10Share}% of revenue (Gini ${r.customers.concentration.giniCoefficient}).`,
    columns: [
      { key: "grouping", header: "Grouping", format: "text", width: 18 },
      { key: "label", header: "Segment", format: "text", width: 22 },
      { key: "customers", header: "Customers", format: "integer", width: 12 },
      { key: "revenue", header: "Revenue", format: "currency", width: 16 },
      { key: "share", header: "Revenue share %", format: "percent", width: 16 },
      { key: "averageOrderValue", header: "AOV", format: "currency", width: 14 },
      { key: "cumulativeShare", header: "Cumulative share %", format: "percent", width: 18 },
    ],
    rows,
  };
}

function productsSheet(r: AnalyticsResult): Sheet {
  return {
    id: "products",
    title: "Product performance",
    description: `${r.products.totals.skusSold} SKUs sold across ${r.products.totals.unitsSold} units.`,
    columns: [
      { key: "name", header: "Product", format: "text", width: 34 },
      { key: "sku", header: "SKU", format: "text", width: 14 },
      { key: "category", header: "Category", format: "text", width: 22 },
      { key: "abcClass", header: "ABC", format: "text", width: 8 },
      { key: "revenue", header: "Revenue", format: "currency", width: 16 },
      { key: "units", header: "Units", format: "integer", width: 10 },
      { key: "orders", header: "Orders", format: "integer", width: 10 },
      { key: "customers", header: "Customers", format: "integer", width: 12 },
      { key: "averagePrice", header: "Avg price", format: "currency", width: 13 },
      { key: "revenueShare", header: "Revenue share %", format: "percent", width: 16 },
      { key: "refundRate", header: "Refund rate %", format: "percent", width: 15 },
      { key: "velocity", header: "Units/day", format: "number", width: 12 },
      { key: "stockQuantity", header: "Stock", format: "integer", width: 10 },
      { key: "daysOfCover", header: "Days of cover", format: "integer", width: 15 },
      { key: "averageRating", header: "Rating", format: "number", width: 10 },
    ],
    rows: r.products.products as unknown as Record<string, unknown>[],
  };
}

function categoriesSheet(r: AnalyticsResult): Sheet {
  return {
    id: "categories",
    title: "Category performance",
    description: "Revenue and unit mix across product categories.",
    columns: [
      { key: "name", header: "Category", format: "text", width: 28 },
      { key: "revenue", header: "Revenue", format: "currency", width: 16 },
      { key: "share", header: "Share %", format: "percent", width: 12 },
      { key: "units", header: "Units", format: "integer", width: 12 },
      { key: "orders", header: "Orders", format: "integer", width: 12 },
      { key: "products", header: "SKUs", format: "integer", width: 10 },
    ],
    rows: r.products.categories,
  };
}

function ordersSheet(r: AnalyticsResult): Sheet {
  return {
    id: "orders",
    title: "Order register",
    description: `${r.orders.length} orders in the selected period.`,
    columns: [
      { key: "number", header: "Order", format: "text", width: 12 },
      { key: "date", header: "Date", format: "datetime", width: 20 },
      { key: "statusLabel", header: "Status", format: "text", width: 14 },
      { key: "customerName", header: "Customer", format: "text", width: 26 },
      { key: "customerEmail", header: "Email", format: "text", width: 30 },
      { key: "company", header: "Company", format: "text", width: 24 },
      { key: "country", header: "Country", format: "text", width: 10 },
      { key: "items", header: "Line items", format: "integer", width: 12 },
      { key: "units", header: "Units", format: "integer", width: 10 },
      { key: "total", header: "Total", format: "currency", width: 14 },
      { key: "net", header: "Net", format: "currency", width: 14 },
      { key: "discount", header: "Discount", format: "currency", width: 13 },
      { key: "shipping", header: "Shipping", format: "currency", width: 13 },
      { key: "tax", header: "Tax", format: "currency", width: 12 },
      { key: "refunded", header: "Refunded", format: "currency", width: 13 },
      { key: "paymentMethod", header: "Payment method", format: "text", width: 22 },
      { key: "couponList", header: "Coupons", format: "text", width: 18 },
      { key: "customerType", header: "Customer type", format: "text", width: 15 },
    ],
    rows: r.orders.map((o) => ({
      ...o,
      statusLabel: STATUS_LABELS[o.status] ?? o.status,
      couponList: o.coupons.join(", "),
      customerType: o.isNewCustomer ? "New" : "Returning",
    })),
  };
}

function cohortsSheet(r: AnalyticsResult): Sheet {
  const periods = Math.min(r.cohorts.periods, 12);
  const columns: Column[] = [
    { key: "label", header: "Cohort", format: "text", width: 16 },
    { key: "size", header: "Customers", format: "integer", width: 12 },
    { key: "totalRevenue", header: "Total revenue", format: "currency", width: 16 },
  ];
  for (let p = 0; p < periods; p++) {
    columns.push({ key: `m${p}`, header: `M${p} retention %`, format: "percent", width: 15 });
  }

  return {
    id: "cohorts",
    title: "Cohort retention",
    description: "Share of each acquisition cohort still purchasing in later months. Blank cells have not elapsed yet.",
    columns,
    rows: r.cohorts.rows.map((row) => {
      const out: Record<string, unknown> = {
        label: row.label,
        size: row.size,
        totalRevenue: row.totalRevenue,
      };
      row.retention.slice(0, periods).forEach((v, i) => {
        out[`m${i}`] = v;
      });
      return out;
    }),
  };
}

function geographySheet(r: AnalyticsResult): Sheet {
  const rows = [
    ...r.geography.countries.map((g) => ({ level: "Country", ...g })),
    ...r.geography.states.map((g) => ({ level: "Region", ...g })),
    ...r.geography.cities.map((g) => ({ level: "City", ...g })),
  ];
  return {
    id: "geography",
    title: "Geographic breakdown",
    description: "Revenue distribution by billing location.",
    columns: [
      { key: "level", header: "Level", format: "text", width: 12 },
      { key: "name", header: "Location", format: "text", width: 28 },
      { key: "revenue", header: "Revenue", format: "currency", width: 16 },
      { key: "orders", header: "Orders", format: "integer", width: 12 },
      { key: "customers", header: "Customers", format: "integer", width: 12 },
      { key: "averageOrderValue", header: "AOV", format: "currency", width: 14 },
      { key: "share", header: "Share %", format: "percent", width: 12 },
    ],
    rows,
  };
}

function operationsSheet(r: AnalyticsResult): Sheet {
  const rows: Record<string, unknown>[] = [
    ...r.operations.statusBreakdown.map((s) => ({
      grouping: "Order status",
      label: s.label,
      orders: s.orders,
      revenue: s.revenue,
      share: s.share,
      detail: "",
    })),
    ...r.operations.paymentMethods.map((p) => ({
      grouping: "Payment method",
      label: p.method,
      orders: p.orders,
      revenue: p.revenue,
      share: p.share,
      detail: `AOV ${p.averageOrderValue}`,
    })),
    ...r.operations.coupons.map((c) => ({
      grouping: "Coupon",
      label: c.code,
      orders: c.uses,
      revenue: c.revenue,
      share: null,
      detail: `Discount ${c.discount} · ROI ${c.roi}x`,
    })),
    ...r.operations.weekdayPerformance.map((d) => ({
      grouping: "Trading day",
      label: d.label,
      orders: d.orders,
      revenue: d.revenue,
      share: null,
      detail: `AOV ${d.averageOrderValue}`,
    })),
    ...r.operations.basketDistribution.map((b) => ({
      grouping: "Basket size",
      label: b.bucket,
      orders: b.orders,
      revenue: b.revenue,
      share: b.share,
      detail: "",
    })),
  ];

  return {
    id: "operations",
    title: "Operations & payments",
    description: `Average fulfilment ${r.operations.fulfilment.averageHoursToComplete ?? "n/a"} hours · refund rate ${r.operations.fulfilment.refundRate}%.`,
    columns: [
      { key: "grouping", header: "Grouping", format: "text", width: 18 },
      { key: "label", header: "Value", format: "text", width: 24 },
      { key: "orders", header: "Orders / uses", format: "integer", width: 15 },
      { key: "revenue", header: "Revenue", format: "currency", width: 16 },
      { key: "share", header: "Share %", format: "percent", width: 12 },
      { key: "detail", header: "Detail", format: "text", width: 26 },
    ],
    rows,
  };
}

function forecastSheet(r: AnalyticsResult): Sheet {
  return {
    id: "forecast",
    title: "Revenue forecast",
    description: "Daily actuals with a trend + weekday-seasonality projection and 95% band.",
    columns: [
      { key: "date", header: "Date", format: "date", width: 14 },
      { key: "actual", header: "Actual revenue", format: "currency", width: 16 },
      { key: "forecast", header: "Forecast", format: "currency", width: 16 },
      { key: "lower", header: "Lower bound", format: "currency", width: 16 },
      { key: "upper", header: "Upper bound", format: "currency", width: 16 },
    ],
    rows: r.forecast as unknown as Record<string, unknown>[],
  };
}

/** Extra context blocks rendered above tables in PDF/XLSX output. */
export function buildNarrative(r: AnalyticsResult) {
  return {
    title: `${r.meta.storeName} — Analytics report`,
    subtitle: `${monthLabelSafe(r.meta.range.from)} → ${monthLabelSafe(r.meta.range.to)}`,
    generatedAt: r.meta.generatedAt,
    storeUrl: r.meta.storeUrl,
    currency: r.meta.currency,
    insights: r.insights,
  };
}

function monthLabelSafe(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d ? `${d} ${monthLabel(`${y}-${m}`)}` : monthLabel(iso);
}
