import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearStoreConfig,
  listStores,
  readStoreConfig,
  redactConfig,
  removeStore,
  setActiveStore,
  updateStoreWindow,
} from "@/lib/store/config";
import { invalidateSnapshotCache } from "@/lib/store/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [config, book] = await Promise.all([readStoreConfig(), listStores()]);
  return NextResponse.json({
    connected: Boolean(config),
    config: redactConfig(config),
    activeUrl: book.active,
    stores: book.stores.map((s) => ({
      url: s.url,
      name: s.name ?? null,
      updatedAt: s.updatedAt ?? null,
      active: s.url === book.active,
    })),
  });
}

/**
 * Switches the active store, or edits the active store's data window.
 * Credentials arrive exclusively through the WooCommerce authorization flow,
 * so there is no endpoint here that accepts a consumer key.
 */
const patchSchema = z.union([
  z.object({ activeUrl: z.string().min(4) }),
  z.object({
    historyMonths: z.coerce.number().int().min(1).max(120).optional(),
    maxPages: z.coerce.number().int().min(1).max(500).optional(),
  }),
]);

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 422 },
    );
  }

  if ("activeUrl" in parsed.data) {
    const switched = await setActiveStore(parsed.data.activeUrl);
    if (!switched) {
      return NextResponse.json({ error: "That store is not connected." }, { status: 404 });
    }
    // Each store has its own snapshot cache key, so nothing needs clearing;
    // the next request simply reads a different one.
    return NextResponse.json({ connected: true, config: redactConfig(switched) });
  }

  const updated = await updateStoreWindow(parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "No store is connected." }, { status: 409 });
  }

  // The window is part of the cache key, so a change must invalidate it.
  invalidateSnapshotCache();
  return NextResponse.json({ connected: true, config: redactConfig(updated) });
}

/** Disconnects one store, or every store when no URL is given. */
export async function DELETE(request: Request) {
  const url = new URL(request.url).searchParams.get("url");

  if (!url) {
    await clearStoreConfig();
    invalidateSnapshotCache();
    return NextResponse.json({ connected: false, config: null, stores: [] });
  }

  const remaining = await removeStore(url);
  invalidateSnapshotCache();
  const book = await listStores();

  return NextResponse.json({
    connected: Boolean(remaining),
    config: redactConfig(remaining),
    activeUrl: book.active,
    stores: book.stores.map((s) => ({
      url: s.url,
      name: s.name ?? null,
      updatedAt: s.updatedAt ?? null,
      active: s.url === book.active,
    })),
  });
}
