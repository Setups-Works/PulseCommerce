import { NextResponse } from "next/server";
import { getAnalyticsCached } from "@/lib/analytics/cache";
import type { Granularity } from "@/lib/analytics/types";
import { requireStore } from "@/lib/auth/tenant";
import { NoMirrorDataError, loadSnapshot } from "@/lib/store/snapshot";
import { isNotConnected } from "@/lib/store/errors";
import { WooApiError } from "@/lib/woo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * A cold pull walks the store's entire order history: ~165s for 20k orders.
 * Hosts cap this by plan, but declaring it stops the default short timeout
 * from killing the first load. Every later request is served from cache.
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;
  const { store } = resolved.value;

  const params = new URL(request.url).searchParams;

  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const allTime = params.get("all") === "1";
  const granularityParam = params.get("granularity");
  const granularity: Granularity | undefined =
    granularityParam === "day" || granularityParam === "week" || granularityParam === "month"
      ? granularityParam
      : undefined;

  try {
    const snapshot = await loadSnapshot(store, { refresh: params.get("refresh") === "1" });

    const result = await getAnalyticsCached(snapshot, {
      range: from && to ? { from, to } : undefined,
      allTime,
      granularity,
    });

    /*
     * This payload runs to ~1.4MB on a real store (uncapped customer rows by
     * design — see engine.ts's DEFAULT_CUSTOMER_ROWS comment, needed for
     * client-side search/sort, not a bug to shrink). `no-store` meant every
     * dashboard reload re-downloaded the full thing even though the
     * underlying snapshot only changes on the ~10-minute sync cadence
     * (AGENTS.md) — a real, measured contributor to exceeding Vercel's
     * bandwidth quota. `private` keeps this out of any shared/CDN cache
     * (tenant-scoped data must never be cross-served); 60s is well inside
     * the staleness the sync cadence already accepts elsewhere in this app,
     * and an explicit `?refresh=1` pull is itself an async re-sync, not
     * something an instant repeat click needs to bypass caching for.
     *
     * `Vary: Cookie` matters as much as `private` does here: this route has
     * one URL shared by every signed-in user, and a browser's own cache keys
     * on URL alone by default -- it does not know two requests to the same
     * URL carried different session cookies. Without this, a second person
     * signing into a different account on the same shared browser within
     * the cache window could be served the first person's cached response.
     * Vary: Cookie makes the cached entry only reusable for a request
     * carrying the exact same cookie -- a new login is a new cookie, so it's
     * always a fresh fetch.
     */
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=60", Vary: "Cookie" },
    });
  } catch (error) {
    /*
     * A connected-but-unsynced store is a distinct state from a disconnected
     * one, and the fix is different: one needs the first pull to run, the
     * other needs a store. Collapsing them into one message is what made this
     * look like a broken dashboard rather than an unfinished setup.
     */
    if (error instanceof NoMirrorDataError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "not_synced",
          hint: "The first sync has not finished yet.",
          action: "/onboarding/sync",
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (isNotConnected(error)) {
      return NextResponse.json(
        { error: error.message, code: "not_connected" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof WooApiError) {
      return NextResponse.json(
        { error: error.message, status: error.status, endpoint: error.endpoint },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
      );
    }
    console.error("[analytics] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compute analytics." },
      { status: 500 },
    );
  }
}
