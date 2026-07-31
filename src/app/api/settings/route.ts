import { NextResponse } from "next/server";
import { z } from "zod";
import { clearStoreConfig, readStoreConfig, redactConfig, updateStoreWindow } from "@/lib/store/config";
import { invalidateSnapshotCache } from "@/lib/store/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await readStoreConfig();
  return NextResponse.json({
    connected: Boolean(config),
    config: redactConfig(config),
  });
}

/**
 * Only the data window is editable here. Credentials arrive exclusively through
 * the WooCommerce authorization flow, so there is no endpoint that accepts a
 * consumer key.
 */
const windowSchema = z.object({
  historyMonths: z.coerce.number().int().min(1).max(120).optional(),
  maxPages: z.coerce.number().int().min(1).max(500).optional(),
});

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = windowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 422 },
    );
  }

  const updated = await updateStoreWindow(parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "No store is connected." }, { status: 409 });
  }

  // The window is part of the cache key, so a change must invalidate it.
  invalidateSnapshotCache();
  return NextResponse.json({ connected: true, config: redactConfig(updated) });
}

export async function DELETE() {
  await clearStoreConfig();
  invalidateSnapshotCache();
  return NextResponse.json({ connected: false, config: null });
}
