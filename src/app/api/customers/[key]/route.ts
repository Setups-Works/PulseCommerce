import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/analytics/cache";
import type { Granularity } from "@/lib/analytics/types";
import { isNotConnected } from "@/lib/store/errors";
import { requireStore } from "@/lib/auth/tenant";
import { loadSnapshot } from "@/lib/store/snapshot";
import { WooApiError } from "@/lib/woo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One customer, with their order history.
 *
 * History is half the weight of a customer record, so the ledger payload ships
 * without it and this fills it in for the one customer actually being looked
 * at. The snapshot is already cached, so this costs a recompute rather than a
 * fetch from WooCommerce.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;
  const { store } = resolved.value;

  const { key } = await params;
  const search = new URL(request.url).searchParams;

  const from = search.get("from") ?? undefined;
  const to = search.get("to") ?? undefined;
  const granularityParam = search.get("granularity");
  const granularity: Granularity | undefined =
    granularityParam === "day" || granularityParam === "week" || granularityParam === "month"
      ? granularityParam
      : undefined;

  try {
    const snapshot = await loadSnapshot(store);
    const result = getAnalytics(snapshot, {
      range: from && to ? { from, to } : undefined,
      granularity,
      includeHistory: true,
      // Nothing here reads the order register.
      maxOrderRows: 0,
    });

    const customer = result.customers.records.find((c) => c.key === decodeURIComponent(key));
    if (!customer) {
      return NextResponse.json({ error: "That customer has no orders in this period." }, { status: 404 });
    }

    // Same reasoning as /api/analytics: derived from a snapshot that only
    // changes on the ~10-minute sync cadence, so a short private cache costs
    // no meaningful freshness and saves re-transferring an identical profile
    // (with full order history) on every repeat view. Vary: Cookie for the
    // same reason too -- this URL is identical for every signed-in user, and
    // a browser's cache doesn't otherwise know two requests carried
    // different session cookies; without it, a second account signing in on
    // the same shared browser within the cache window could be served the
    // first account's cached customer record.
    return NextResponse.json(
      { customer },
      { headers: { "Cache-Control": "private, max-age=60", Vary: "Cookie" } },
    );
  } catch (error) {
    if (isNotConnected(error)) {
      return NextResponse.json({ error: error.message, code: "not_connected" }, { status: 409 });
    }
    if (error instanceof WooApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[customer] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load the customer." },
      { status: 500 },
    );
  }
}
