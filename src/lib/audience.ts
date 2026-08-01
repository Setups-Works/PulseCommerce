import type { CustomerRecord, RfmSegment, ValueTier } from "@/lib/analytics/types";

/**
 * Audience definition for a campaign. Every field is optional; an empty filter
 * matches the whole base. Built to be serialisable so a saved audience is just
 * a JSON blob.
 */
export interface AudienceFilter {
  segments: RfmSegment[];
  tiers: ValueTier[];
  /** Inclusive bounds on days since last order. */
  recencyMin: number | null;
  recencyMax: number | null;
  minSpend: number | null;
  minOrders: number | null;
  /** 0–1. Matches customers at or above this churn risk. */
  churnRiskMin: number | null;
  countries: string[];
  /** "any" | "business" | "consumer" */
  accountType: "any" | "business" | "consumer";
  /** Matches customers who bought a product whose name contains this text. */
  boughtProduct: string;
  /** Excludes anyone without a usable email — they can't be mailed. */
  requireEmail: boolean;
  /** Excludes anyone without a billing phone — they can't be messaged. */
  requirePhone: boolean;
}

export const EMPTY_AUDIENCE: AudienceFilter = {
  segments: [],
  tiers: [],
  recencyMin: null,
  recencyMax: null,
  minSpend: null,
  minOrders: null,
  churnRiskMin: null,
  countries: [],
  accountType: "any",
  boughtProduct: "",
  requireEmail: true,
  requirePhone: false,
};

export interface AudiencePreset {
  id: string;
  name: string;
  description: string;
  /** Why this audience exists — shown so the user isn't guessing at intent. */
  rationale: string;
  filter: AudienceFilter;
}

export const AUDIENCE_PRESETS: AudiencePreset[] = [
  {
    id: "vip",
    name: "VIP appreciation",
    description: "Top-tier customers who are still active.",
    rationale:
      "Highest-value accounts that have bought recently. Early access and thank-you offers land best here, and the downside risk of contacting them is near zero.",
    filter: { ...EMPTY_AUDIENCE, tiers: ["VIP"], recencyMax: 90 },
  },
  {
    id: "winback",
    name: "Win-back lapsed",
    description: "High churn risk, but real money at stake.",
    rationale:
      "Customers whose silence has run past their own usual reorder gap. Reactivation is far cheaper than acquiring an equivalent new customer, so this is usually the highest-ROI send.",
    filter: { ...EMPTY_AUDIENCE, churnRiskMin: 0.65, minSpend: 1, minOrders: 1 },
  },
  {
    id: "second-order",
    name: "Convert to second order",
    description: "Bought exactly once, still recent.",
    rationale:
      "The single biggest jump in lifetime value is order one to order two. These customers are still warm and have not yet formed a habit.",
    filter: { ...EMPTY_AUDIENCE, minOrders: 1, recencyMax: 60, segments: ["New Customers", "Promising"] },
  },
  {
    id: "at-risk-vip",
    name: "Rescue at-risk high value",
    description: "Best customers who have gone quiet.",
    rationale:
      "Losing one of these costs more than losing dozens of low-value customers. Worth a personal touch rather than a bulk send.",
    filter: { ...EMPTY_AUDIENCE, segments: ["At Risk", "Cannot Lose Them"], tiers: ["VIP", "High"] },
  },
  {
    id: "loyal",
    name: "Loyal advocates",
    description: "Frequent, recent, high-value buyers.",
    rationale: "The natural audience for referrals, reviews and a loyalty programme launch.",
    filter: { ...EMPTY_AUDIENCE, segments: ["Champions", "Loyal"], minOrders: 2 },
  },
  {
    id: "business",
    name: "Business accounts",
    description: "Buyers ordering on behalf of a company.",
    rationale: "Wholesale terms, bulk pricing and account-management outreach only make sense for these.",
    filter: { ...EMPTY_AUDIENCE, accountType: "business" },
  },
];

export function applyAudience(records: CustomerRecord[], filter: AudienceFilter): CustomerRecord[] {
  const product = filter.boughtProduct.trim().toLowerCase();

  return records.filter((c) => {
    if (filter.requireEmail && !c.email) return false;
    if (filter.requirePhone && !c.hasPhone) return false;
    if (filter.segments.length && !filter.segments.includes(c.segment)) return false;
    if (filter.tiers.length && !filter.tiers.includes(c.tier)) return false;
    if (filter.recencyMin !== null && c.recencyDays < filter.recencyMin) return false;
    if (filter.recencyMax !== null && c.recencyDays > filter.recencyMax) return false;
    if (filter.minSpend !== null && c.netRevenue < filter.minSpend) return false;
    if (filter.minOrders !== null && c.orders < filter.minOrders) return false;
    if (filter.churnRiskMin !== null && c.churnRisk < filter.churnRiskMin) return false;
    if (filter.countries.length && !filter.countries.includes(c.country)) return false;
    if (filter.accountType === "business" && !c.company) return false;
    if (filter.accountType === "consumer" && c.company) return false;
    if (product && !c.topProducts.some((p) => p.name.toLowerCase().includes(product))) return false;
    return true;
  });
}

export interface AudienceSummary {
  size: number;
  reachableShare: number;
  totalRevenue: number;
  averageRevenue: number;
  averageOrders: number;
  predictedClv: number;
  averageChurnRisk: number;
  topSegments: { label: string; count: number }[];
  topProducts: { name: string; customers: number }[];
}

export function summariseAudience(
  audience: CustomerRecord[],
  allRecords: CustomerRecord[],
): AudienceSummary {
  const totalRevenue = audience.reduce((s, c) => s + c.netRevenue, 0);
  const clv = audience.reduce((s, c) => s + c.predictedClv, 0);
  const orders = audience.reduce((s, c) => s + c.orders, 0);
  const risk = audience.reduce((s, c) => s + c.churnRisk, 0);

  const segments = new Map<string, number>();
  for (const c of audience) segments.set(c.segment, (segments.get(c.segment) ?? 0) + 1);

  const products = new Map<string, number>();
  for (const c of audience) {
    const top = c.topProducts[0]?.name;
    if (top) products.set(top, (products.get(top) ?? 0) + 1);
  }

  const div = (n: number) => (audience.length ? n / audience.length : 0);

  return {
    size: audience.length,
    reachableShare: allRecords.length ? (audience.length / allRecords.length) * 100 : 0,
    totalRevenue,
    averageRevenue: div(totalRevenue),
    averageOrders: div(orders),
    predictedClv: clv,
    averageChurnRisk: div(risk),
    topSegments: [...segments.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topProducts: [...products.entries()]
      .map(([name, customers]) => ({ name, customers }))
      .sort((a, b) => b.customers - a.customers)
      .slice(0, 5),
  };
}

/** CSV shaped for import into an email or ads platform. */
export function audienceToCsv(audience: CustomerRecord[]): string {
  const headers = [
    "email",
    "first_name",
    "last_name",
    "company",
    "country",
    "segment",
    "tier",
    "orders",
    "net_revenue",
    "average_order_value",
    "predicted_clv",
    "days_since_last_order",
    "churn_risk",
    "top_product",
  ];

  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const s = String(value);
    // Guard against CSV formula injection in spreadsheet apps.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };

  const lines = [headers.join(",")];
  for (const c of audience) {
    const [first, ...rest] = c.name.split(" ");
    lines.push(
      [
        c.email,
        first ?? "",
        rest.join(" "),
        c.company,
        c.country,
        c.segment,
        c.tier,
        c.orders,
        c.netRevenue,
        c.averageOrderValue,
        c.predictedClv,
        c.recencyDays,
        Math.round(c.churnRisk * 100),
        c.topProducts[0]?.name ?? "",
      ]
        .map(escape)
        .join(","),
    );
  }
  return `﻿${lines.join("\r\n")}`;
}
