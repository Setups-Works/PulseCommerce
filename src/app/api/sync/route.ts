import { NextResponse } from "next/server";
import { getAnalyticsForVersion } from "@/lib/analytics/cache";
import { requireStore, requireWrite } from "@/lib/auth/tenant";
import { db } from "@/lib/db/client";
import { forgetSnapshot, readSnapshot, syncStatus } from "@/lib/woo/mirror";
import { syncStore } from "@/lib/woo/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A first sync of a large store is slow; give it the platform's ceiling. */
export const maxDuration = 300;

/** How current the mirror is. */
export async function GET(request: Request) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;
  return NextResponse.json(await syncStatus(resolved.value.store.id));
}

/**
 * Pulls the store now.
 *
 * Normally the scheduler does this. This exists for the two moments it is not
 * enough: immediately after connecting, when waiting for the next scheduled
 * run would leave someone looking at an empty dashboard, and when a merchant
 * has changed something in WooCommerce and wants to see it reflected.
 */
export async function POST(request: Request) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;

  const denied = requireWrite(resolved.value.tenant);
  if (denied) return denied;

  const { store } = resolved.value;
  const full = new URL(request.url).searchParams.get("full") === "1";

  try {
    const result = await syncStore(
      store.id,
      {
        id: store.id,
        url: store.url,
        name: store.name ?? undefined,
        consumerKey: store.consumerKey,
        consumerSecret: store.consumerSecret,
        historyMonths: store.historyMonths,
        maxPages: store.maxPages,
      },
      { full },
    );

    // The memo is keyed on the store, not on the data, so a completed sync has
    // to drop it or the next read serves what was there before.
    forgetSnapshot(store.id);
    /*
     * Warms the shared analytics cache right here too, not just from the
     * cron route -- this is the "just connected" / "manual re-sync" path per
     * this route's own doc comment, and it's exactly the moment someone is
     * about to look at their dashboard. Without this, the cache stays cold
     * until the next cron cycle, and that first dashboard/inbox view pays
     * for a full Postgres reassembly instead of a cache hit.
     *
     * `store.lastSyncAt` above is from before syncStore() ran -- re-read it
     * fresh so the cache entry is keyed under the timestamp syncStore() just
     * wrote, not the one before it. This used to call readSnapshot() alone
     * to warm a whole-snapshot Redis cache; found by testing against a real
     * store connection that that design doesn't survive real scale (188MB
     * serialized, timing out on every write) -- warming the derived
     * analytics result instead is both what the dashboard/inbox actually
     * read and small enough (~1.4MB gzipped) to actually cache.
     */
    const [{ last_sync_at: freshLastSyncAt }] = await db()<{ last_sync_at: Date | null }[]>`
      select last_sync_at from stores where id = ${store.id}
    `;
    await getAnalyticsForVersion(
      { storeUrl: store.url, fetchedAt: freshLastSyncAt?.toISOString() ?? "" },
      () =>
        readSnapshot({
          id: store.id,
          url: store.url,
          name: store.name,
          historyMonths: store.historyMonths,
          lastSyncAt: freshLastSyncAt?.toISOString() ?? null,
        }),
    ).catch(() => {});

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: "The sync failed.",
        detail: error instanceof Error ? error.message : String(error),
        // The run is recorded either way, so the settings page can explain why
        // the figures are behind rather than simply looking stale.
        hint: "Check that the store is reachable and the connection is still authorized.",
      },
      { status: 502 },
    );
  }
}
