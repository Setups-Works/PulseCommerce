import { computeAnalytics } from "@/lib/analytics/engine";
import { applyAudience, EMPTY_AUDIENCE, type AudienceFilter } from "@/lib/audience";
import { isNotConnected } from "@/lib/store/errors";
import { loadSnapshot } from "@/lib/store/snapshot";
import { isSessionSendable, WhatsAppClient } from "@/lib/whatsapp/client";
import { readWhatsAppConfig } from "@/lib/whatsapp/config";
import { isGatewayNotConnected } from "@/lib/whatsapp/errors";
import { listFlows, readState, summarise } from "@/lib/whatsapp/flows";
import { PLUGIN_ID, type MenuConfig } from "@/lib/whatsapp/menu";
import { resolveAudience } from "@/lib/whatsapp/recipients";

/**
 * The read tools, executed.
 *
 * Every one goes through the same functions the screens use, so the assistant
 * cannot report a number that disagrees with what is on the dashboard. It reads
 * the cached snapshot; nothing here touches WooCommerce directly.
 *
 * What is deliberately never returned: phone numbers and email addresses. The
 * rest of the application keeps them on the server, and handing them to a model
 * — which then puts them in a reply, which is logged and rendered — would be the
 * one place that rule quietly stopped holding.
 */

type Json = Record<string, unknown>;

export async function runReadTool(name: string, input: Json): Promise<Json> {
  try {
    switch (name) {
      case "get_analytics":
        return await analytics(input);
      case "get_customer_segments":
        return await segments();
      case "get_top_customers":
        return await topCustomers(num(input.limit, 10, 50));
      case "get_products":
        return await products(num(input.limit, 10, 50), input.slowMovers === true);
      case "get_inventory_risk":
        return await inventory();
      case "get_audience_size":
        return await audienceSize(input);
      case "get_flows":
        return await flows();
      case "get_menu":
        return await menu();
      case "get_whatsapp_status":
        return await whatsappStatus();
      default:
        return { error: `Unknown tool "${name}".` };
    }
  } catch (error) {
    /*
     * Errors are returned as data rather than thrown. A tool that throws ends
     * the turn with a stack trace the operator cannot act on; a tool that says
     * "no store is connected" lets the model say that in plain words.
     */
    if (isNotConnected(error) || isGatewayNotConnected(error)) {
      return { error: error.message, connected: false };
    }
    return { error: error instanceof Error ? error.message : "That could not be read." };
  }
}

function num(value: unknown, fallback: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : fallback;
}

async function withAnalytics(range?: { from?: string; to?: string }) {
  const snapshot = await loadSnapshot();
  const hasRange = Boolean(range?.from && range?.to);
  return computeAnalytics(snapshot, {
    range: hasRange ? { from: range!.from!, to: range!.to! } : undefined,
  });
}

async function analytics(input: Json): Promise<Json> {
  const a = await withAnalytics({ from: str(input.from), to: str(input.to) });
  const k = a.kpis;

  /*
   * Each KPI carries its own previous-period value and change, so they are
   * passed through whole rather than flattened. "Revenue is up" is the answer
   * to most questions here, and it needs both numbers to be true.
   */
  return {
    currency: a.meta.currency,
    store: a.meta.storeName,
    window: { from: a.meta.range.from, to: a.meta.range.to },
    orderCount: a.meta.orderCount,
    netRevenue: k.netRevenue,
    grossRevenue: k.grossRevenue,
    orders: k.orders,
    averageOrderValue: k.averageOrderValue,
    unitsSold: k.unitsSold,
    discountTotal: k.discountTotal,
    refundedAmount: k.refundedAmount,
    cancellationRate: k.cancellationRate,
    revenuePerCustomer: k.revenuePerCustomer,
    activeCustomers: k.activeCustomers,
    newCustomers: k.newCustomers,
    totalCustomers: a.customers.records.length,
    repeatRate: a.customers.averages.repeatRate,
    oneTimeBuyerShare: a.customers.averages.oneTimeBuyerShare,
    warnings: a.meta.warnings,
  };
}

async function segments(): Promise<Json> {
  // The engine already computes these breakdowns for the screens; recomputing
  // them here is how an assistant ends up quoting a number the dashboard does
  // not show.
  const a = await withAnalytics();

  return {
    currency: a.meta.currency,
    totalCustomers: a.customers.records.length,
    segments: a.customers.segmentBreakdown,
    tiers: a.customers.tierBreakdown,
    averages: a.customers.averages,
  };
}

async function topCustomers(limit: number): Promise<Json> {
  const a = await withAnalytics();
  const rows = [...a.customers.records]
    .sort((x, y) => y.netRevenue - x.netRevenue)
    .slice(0, limit)
    // No email, no phone. The model gets what a leaderboard shows and nothing
    // that identifies a person beyond their name.
    .map((c) => ({
      name: c.name,
      orders: c.orders,
      spend: Math.round(c.netRevenue),
      segment: c.segment,
      tier: c.tier,
      churnRisk: Number(c.churnRisk.toFixed(2)),
      predictedClv: Math.round(c.predictedClv),
      lastOrder: c.lastOrderDate,
      recencyDays: c.recencyDays,
    }));

  return { currency: a.meta.currency, customers: rows };
}

async function products(limit: number, slowMovers: boolean): Promise<Json> {
  const a = await withAnalytics();
  const rows = [...a.products.products].sort((x, y) =>
    slowMovers ? x.revenue - y.revenue : y.revenue - x.revenue,
  );

  return {
    currency: a.meta.currency,
    products: rows.slice(0, limit).map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.category,
      revenue: Math.round(p.revenue),
      units: p.units,
      orders: p.orders,
      customers: p.customers,
      abcClass: p.abcClass,
      refundRate: Number(p.refundRate.toFixed(3)),
      revenueShare: Number(p.revenueShare.toFixed(4)),
    })),
    categories: a.products.categories.slice(0, 10),
  };
}

async function inventory(): Promise<Json> {
  const a = await withAnalytics();
  const risky = a.inventory.records
    .filter((i) => i.status === "out-of-stock" || i.status === "critical" || i.status === "low")
    // Ordered by the revenue behind each, not by how empty the shelf is: a
    // slow-moving item at zero matters less than a best seller at two days.
    .sort((x, y) => y.revenue - x.revenue)
    .slice(0, 25)
    .map((i) => ({
      name: i.name,
      sku: i.sku,
      status: i.status,
      stockQuantity: i.stockQuantity,
      daysOfCover: i.daysOfCover,
      reorderPoint: i.reorderPoint,
      suggestedOrder: i.suggestedOrder,
      revenue: Math.round(i.revenue),
    }));

  return {
    currency: a.meta.currency,
    counts: a.inventory.counts,
    atRisk: risky,
    needsReorder: a.inventory.needsReorder.length,
  };
}

async function audienceSize(input: Json): Promise<Json> {
  const filter: AudienceFilter = {
    ...EMPTY_AUDIENCE,
    segments: arr(input.segments) as AudienceFilter["segments"],
    tiers: arr(input.tiers) as AudienceFilter["tiers"],
    minOrders: nullableNum(input.minOrders),
    minSpend: nullableNum(input.minSpend),
    churnRiskMin: nullableNum(input.churnRiskMin),
    recencyMin: nullableNum(input.recencyMin),
    requirePhone: true,
    requireEmail: false,
  };

  const resolved = await resolveAudience({ filter });

  // Counts and reasons only — the masked sample the dry run shows a human is
  // still a phone number, and does not go to a model.
  return {
    matched: resolved.matched,
    reachableOnWhatsApp: resolved.recipients.length,
    excluded: resolved.skipped,
    note: "Resolved for real. Nothing was sent.",
  };
}

async function flows(): Promise<Json> {
  const all = await listFlows();
  const rows = await Promise.all(all.map(async (f) => summarise(f, await readState(f.id))));
  return { flows: rows };
}

async function menu(): Promise<Json> {
  const config = await readWhatsAppConfig();
  if (!config) return { error: "No WhatsApp gateway is connected.", connected: false };

  const plugin = await new WhatsAppClient(config).getPlugin(PLUGIN_ID);
  const raw = (plugin.config ?? {}) as Partial<MenuConfig>;

  return {
    enabled: plugin.status === "enabled",
    trigger: raw.trigger ?? "",
    greeting: raw.greeting ?? "",
    options: raw.options ?? [],
    respondInGroups: raw.respondInGroups === true,
  };
}

async function whatsappStatus(): Promise<Json> {
  const config = await readWhatsAppConfig();
  if (!config) return { connected: false, ready: false, reason: "No gateway is configured." };

  const session = await new WhatsAppClient(config).ensureSendable().catch(() => null);
  return {
    connected: true,
    ready: session ? isSessionSendable(session) : false,
    status: session?.status ?? "unknown",
    linkedNumber: session?.phone ?? null,
  };
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function nullableNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Kept so the audience helper stays honest if filters gain fields. */
export const _applyAudience = applyAudience;
