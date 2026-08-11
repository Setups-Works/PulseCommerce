import { NextResponse } from "next/server";
import { getAnalyticsCached } from "@/lib/analytics/cache";
import type { Granularity } from "@/lib/analytics/types";
import { loadSnapshot } from "@/lib/store/snapshot";
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
  const params = new URL(request.url).searchParams;

  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const granularityParam = params.get("granularity");
  const granularity: Granularity | undefined =
    granularityParam === "day" || granularityParam === "week" || granularityParam === "month"
      ? granularityParam
      : undefined;

  try {
    const snapshot = await loadSnapshot({ refresh: params.get("refresh") === "1" });

    const result = await getAnalyticsCached(snapshot, {
      range: from && to ? { from, to } : undefined,
      granularity,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
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
