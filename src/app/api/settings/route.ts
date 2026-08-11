import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant, requireWrite } from "@/lib/auth/tenant";
import {
  clearStoreConfig,
  listStores,
  readStoreConfig,
  redactConfig,
  removeStore,
  setActiveStore,
  updateStoreWindow,
} from "@/lib/store/config";
import { forgetSnapshot, syncStatus } from "@/lib/woo/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const [config, book] = await Promise.all([readStoreConfig(userId), listStores(userId)]);

  return NextResponse.json({
    connected: Boolean(config),
    config: redactConfig(config),
    activeId: book.active,
    stores: book.stores.map((s) => ({
      id: s.id,
      url: s.url,
      name: s.name ?? null,
      updatedAt: s.updatedAt ?? null,
      lastSyncAt: s.lastSyncAt ?? null,
      orderCount: s.orderCount ?? 0,
      active: s.id === book.active,
    })),
    // How current the figures are. Without this the dashboard cannot tell the
    // difference between a quiet store and one whose sync has been failing.
    sync: config ? await syncStatus(config.id) : null,
  });
}

/**
 * Switches the active store, or edits the active store's data window.
 * Credentials arrive exclusively through the WooCommerce authorization flow,
 * so there is no endpoint here that accepts a consumer key.
 */
const patchSchema = z.union([
  z.object({ activeId: z.string().uuid() }),
  z.object({
    historyMonths: z.coerce.number().int().min(1).max(120).optional(),
    maxPages: z.coerce.number().int().min(1).max(500).optional(),
  }),
]);

export async function PATCH(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;

  const denied = requireWrite(resolved.value);
  if (denied) return denied;

  const { userId } = resolved.value;

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

  if ("activeId" in parsed.data) {
    // Scoped to the caller, so a uuid from a request body cannot select
    // somebody else's store.
    const switched = await setActiveStore(userId, parsed.data.activeId);
    if (!switched) {
      return NextResponse.json({ error: "That store is not connected." }, { status: 404 });
    }
    return NextResponse.json({ connected: true, config: redactConfig(switched) });
  }

  const updated = await updateStoreWindow(userId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "No store is connected." }, { status: 409 });
  }

  /*
   * The window decides how far back a snapshot reaches, so the memo built
   * under the old one is wrong now. Only the in-process memo needs dropping —
   * the mirror itself is unaffected, since narrowing the window hides rows
   * rather than deleting them, and widening it is picked up by the next sync.
   */
  forgetSnapshot(updated.id);
  return NextResponse.json({ connected: true, config: redactConfig(updated) });
}

/** Disconnects one store, or every store when no id is given. */
export async function DELETE(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;

  const denied = requireWrite(resolved.value);
  if (denied) return denied;

  const { userId } = resolved.value;
  const id = new URL(request.url).searchParams.get("id");

  /*
   * The mirrored orders, customers and products go with the store through the
   * foreign-key cascade. Disconnecting has to remove the data too: leaving a
   * merchant's order history behind after they disconnect is not something a
   * "disconnect" button should do.
   */
  if (!id) {
    const { stores } = await listStores(userId);
    await clearStoreConfig(userId);
    for (const store of stores) forgetSnapshot(store.id);
    return NextResponse.json({ connected: false, config: null, stores: [] });
  }

  const remaining = await removeStore(userId, id);
  forgetSnapshot(id);
  const book = await listStores(userId);

  return NextResponse.json({
    connected: Boolean(remaining),
    config: redactConfig(remaining),
    activeId: book.active,
    stores: book.stores.map((s) => ({
      id: s.id,
      url: s.url,
      name: s.name ?? null,
      updatedAt: s.updatedAt ?? null,
      lastSyncAt: s.lastSyncAt ?? null,
      orderCount: s.orderCount ?? 0,
      active: s.id === book.active,
    })),
  });
}
