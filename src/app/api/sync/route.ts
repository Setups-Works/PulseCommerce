import { NextResponse } from "next/server";
import { requireStore, requireWrite } from "@/lib/auth/tenant";
import { forgetSnapshot, syncStatus } from "@/lib/woo/mirror";
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
