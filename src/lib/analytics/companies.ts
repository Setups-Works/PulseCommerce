import type { WooOrder } from "@/lib/woo/types";
import {
  customerKey,
  customerName,
  daysBetween,
  isRefunded,
  isTransactional,
  monthKey,
  num,
  orderNet,
  orderUnits,
  round2,
  safeDiv,
} from "./helpers";
import type { CompanyAnalytics, CompanyRecord, ValueTier } from "./types";

/**
 * B2B view. WooCommerce has no first-class "company" object, so buyers are
 * grouped by the billing company field.
 *
 * Plenty of real stores leave that field empty even when they have business
 * customers, so when it's blank we fall back to inferring an organisation from
 * the email domain — skipping consumer mailbox providers. That's a heuristic,
 * and the UI labels which signal each account came from.
 */

/** Collapses "Acme Ltd." / "ACME LTD" / "Acme  Ltd" onto one key. */
function normaliseCompany(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(ltd|limited|inc|llc|gmbh|bv|nv|plc|pvt|pty|co|corp|sa|as|kk|ab|oy|srl|spa)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Consumer mailbox providers — a shared domain here means nothing. */
const CONSUMER_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.co.uk", "ymail.com",
  "rocketmail.com", "hotmail.com", "hotmail.co.uk", "outlook.com", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com", "gmx.com",
  "gmx.de", "mail.com", "zoho.com", "zohomail.com", "yandex.com", "yandex.ru", "rediffmail.com",
  "inbox.com", "fastmail.com", "hey.com", "tutanota.com", "qq.com", "163.com", "126.com",
  "naver.com", "daum.net", "web.de", "t-online.de", "orange.fr", "free.fr", "sfr.fr",
  "libero.it", "virgilio.it", "bigpond.com", "optusnet.com.au", "sky.com", "btinternet.com",
  "example.com", "test.com",
]);

/**
 * Optimal string alignment distance, capped. Unlike plain Levenshtein this
 * counts an adjacent transposition as one edit, which matters because the most
 * common real typo is exactly that — "gamil" for "gmail".
 */
function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let twoBack: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const row = new Array<number>(b.length + 1);
    row[0] = i;
    let best = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, twoBack[j - 2] + 1);
      }
      row[j] = value;
      if (value < best) best = value;
    }

    if (best > max) return max + 1;
    twoBack = prev;
    prev = row;
  }

  return prev[b.length];
}

/**
 * The registrable labels of the consumer providers ("gmail", "yahoo", …).
 * Matching on the label rather than the full domain catches every ccTLD variant
 * — yahoo.in, yahoo.co.uk, yahoo.fr all reduce to "yahoo".
 */
const CONSUMER_LABELS = new Set(
  [...CONSUMER_DOMAINS].map((d) => {
    const parts = d.split(".");
    const twoPart = parts.length >= 3 && ["co", "com", "net", "org"].includes(parts[parts.length - 2]);
    return parts[parts.length - (twoPart ? 3 : 2)] ?? parts[0];
  }),
);

/**
 * Mistyped consumer domains ("gamil.com", "yahooo.com") are extremely common in
 * checkout data. Without this they surface as invented business accounts.
 */
function isConsumerLabel(label: string): boolean {
  if (CONSUMER_LABELS.has(label)) return true;
  // One transposition or typo away from a provider is still that provider.
  for (const known of CONSUMER_LABELS) {
    if (Math.abs(known.length - label.length) <= 1 && editDistance(label, known, 1) <= 1) return true;
  }
  return false;
}

const GENERIC_LABELS = new Set(["email", "mail", "webmail", "inbox", "test", "example", "domain", "user", "info"]);

/** Turns "orders@fieldstone-kitchen.co.uk" into "Fieldstone Kitchen". */
function companyFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain || !domain.includes(".") || CONSUMER_DOMAINS.has(domain)) return null;

  // Drop the public suffix, keeping the registrable label. Handles the common
  // two-part suffixes (co.uk, com.au, co.in) that would otherwise yield "Co".
  const parts = domain.split(".");
  const twoPartSuffix = parts.length >= 3 && ["co", "com", "net", "org", "ac", "gov"].includes(parts[parts.length - 2]);
  const label = parts[parts.length - (twoPartSuffix ? 3 : 2)] ?? parts[0];

  if (!label || label.length < 4) return null;
  if (GENERIC_LABELS.has(label)) return null;
  if (/^\d+$/.test(label)) return null;
  if (isConsumerLabel(label)) return null;

  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** An inferred domain only counts as a company once this many distinct people buy from it. */
const MIN_BUYERS_FOR_INFERRED_COMPANY = 2;

function tierFor(revenue: number, ranked: number[]): ValueTier {
  if (ranked.length === 0) return "Low";
  const idx = ranked.findIndex((v) => v <= revenue);
  const pct = idx === -1 ? 0 : 1 - idx / ranked.length;
  if (pct >= 0.95) return "VIP";
  if (pct >= 0.75) return "High";
  if (pct >= 0.4) return "Mid";
  return "Low";
}

export function buildCompanyAnalytics(orders: WooOrder[], asOf: Date): CompanyAnalytics {
  interface Acc {
    display: string;
    source: "billing" | "email-domain";
    buyers: Map<string, { name: string; email: string; orders: number; revenue: number }>;
    orders: number;
    gross: number;
    net: number;
    units: number;
    dates: number[];
    countries: Set<string>;
    products: Map<string, { units: number; revenue: number }>;
    monthly: Map<string, { revenue: number; orders: number }>;
  }

  const acc = new Map<string, Acc>();
  let b2bRevenue = 0;
  let b2cRevenue = 0;
  let b2bOrders = 0;
  let b2cOrders = 0;

  // Pre-pass: a shared email domain only implies an organisation when several
  // different people order from it. One buyer on a vanity domain is a consumer.
  const buyersPerInferredDomain = new Map<string, Set<string>>();
  for (const order of orders) {
    if (!isTransactional(order)) continue;
    if ((order.billing?.company ?? "").trim()) continue;
    const inferred = companyFromEmail(order.billing?.email ?? "");
    if (!inferred) continue;
    const key = normaliseCompany(inferred);
    const set = buyersPerInferredDomain.get(key) ?? new Set<string>();
    set.add(customerKey(order));
    buyersPerInferredDomain.set(key, set);
  }

  for (const order of orders) {
    if (!isTransactional(order)) continue;
    const value = Math.max(0, orderNet(order));
    const billingCompany = (order.billing?.company ?? "").trim();

    let inferred = billingCompany ? null : companyFromEmail(order.billing?.email ?? "");
    if (
      inferred &&
      (buyersPerInferredDomain.get(normaliseCompany(inferred))?.size ?? 0) < MIN_BUYERS_FOR_INFERRED_COMPANY
    ) {
      inferred = null;
    }

    const rawCompany = billingCompany || inferred;

    if (!rawCompany) {
      b2cRevenue += value;
      b2cOrders += 1;
      continue;
    }

    b2bRevenue += value;
    b2bOrders += 1;

    const key = normaliseCompany(rawCompany);
    let entry = acc.get(key);
    if (!entry) {
      entry = {
        display: rawCompany,
        source: billingCompany ? "billing" : "email-domain",
        buyers: new Map(),
        orders: 0,
        gross: 0,
        net: 0,
        units: 0,
        dates: [],
        countries: new Set(),
        products: new Map(),
        monthly: new Map(),
      };
      acc.set(key, entry);
    }

    entry.orders += 1;
    entry.gross += isRefunded(order) ? 0 : num(order.total);
    entry.net += value;
    entry.units += orderUnits(order);
    entry.dates.push(new Date(order.date_created).getTime());
    if (order.billing?.country) entry.countries.add(order.billing.country);

    const ck = customerKey(order);
    const buyer = entry.buyers.get(ck) ?? {
      name: customerName(order),
      email: (order.billing?.email ?? "").toLowerCase(),
      orders: 0,
      revenue: 0,
    };
    buyer.orders += 1;
    buyer.revenue += value;
    entry.buyers.set(ck, buyer);

    for (const li of order.line_items) {
      const p = entry.products.get(li.name) ?? { units: 0, revenue: 0 };
      p.units += li.quantity;
      p.revenue += num(li.total);
      entry.products.set(li.name, p);
    }

    const mk = monthKey(new Date(order.date_created));
    const m = entry.monthly.get(mk) ?? { revenue: 0, orders: 0 };
    m.revenue += value;
    m.orders += 1;
    entry.monthly.set(mk, m);
  }

  const totalB2B = b2bRevenue || 1;
  const rankedRevenues = [...acc.values()].map((e) => e.net).sort((a, b) => b - a);

  const companies: CompanyRecord[] = [...acc.values()]
    .map((e) => {
      const sortedDates = [...e.dates].sort((a, b) => a - b);
      const monthly = [...e.monthly.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, revenue: round2(v.revenue), orders: v.orders }));

      // Growth compares the two most recent months with activity.
      const growth =
        monthly.length >= 2 && monthly[monthly.length - 2].revenue > 0
          ? round2(
              (monthly[monthly.length - 1].revenue - monthly[monthly.length - 2].revenue) /
                monthly[monthly.length - 2].revenue,
            )
          : null;

      return {
        name: e.display,
        source: e.source,
        buyers: e.buyers.size,
        orders: e.orders,
        grossRevenue: round2(e.gross),
        netRevenue: round2(e.net),
        units: e.units,
        averageOrderValue: round2(safeDiv(e.net, e.orders)),
        firstOrderDate: new Date(sortedDates[0]).toISOString(),
        lastOrderDate: new Date(sortedDates[sortedDates.length - 1]).toISOString(),
        recencyDays: Math.max(0, daysBetween(new Date(sortedDates[sortedDates.length - 1]), asOf)),
        revenueShare: round2(safeDiv(e.net, totalB2B) * 100),
        countries: [...e.countries],
        topProducts: [...e.products.entries()]
          .map(([name, v]) => ({ name, units: v.units, revenue: round2(v.revenue) }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        contacts: [...e.buyers.values()]
          .map((b) => ({ ...b, revenue: round2(b.revenue) }))
          .sort((a, b) => b.revenue - a.revenue),
        tier: tierFor(e.net, rankedRevenues),
        monthly,
        growth,
      } satisfies CompanyRecord;
    })
    .sort((a, b) => b.netRevenue - a.netRevenue);

  return {
    companies,
    totals: {
      b2bRevenue: round2(b2bRevenue),
      b2cRevenue: round2(b2cRevenue),
      b2bOrders,
      b2cOrders,
      b2bShare: round2(safeDiv(b2bRevenue, b2bRevenue + b2cRevenue) * 100),
      b2bAverageOrderValue: round2(safeDiv(b2bRevenue, b2bOrders)),
      b2cAverageOrderValue: round2(safeDiv(b2cRevenue, b2cOrders)),
      companyCount: companies.length,
    },
  };
}
