import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { requireStore, requireWrite } from "@/lib/auth/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Abandoned-checkout recovery: the on/off toggle and the recent history.
 *
 * The actual recovery work happens on a schedule — see
 * src/app/api/cron/abandoned-checkouts/route.ts, ticked every five minutes
 * by Supabase's scheduler. This route only reads and flips the switch.
 *
 * No phone number is returned here, matching the rest of this API: a row
 * says what happened to an order, not who it happened to.
 */

interface Row {
  woo_order_id: string;
  status: "messaged" | "skipped";
  skip_reason: string | null;
  messaged_at: Date | null;
  created_at: Date;
}

export async function GET(request: Request) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;
  const { store, tenant } = resolved.value;

  const rows = await db()<Row[]>`
    select woo_order_id, status, skip_reason, messaged_at, created_at
    from whatsapp_abandoned_checkouts
    where user_id = ${tenant.userId}
    order by created_at desc
    limit 100
  `;

  return NextResponse.json({
    enabled: store.abandonedCheckoutEnabled,
    storeUrl: store.url,
    items: rows.map((row) => ({
      orderId: Number(row.woo_order_id),
      status: row.status,
      skipReason: row.skip_reason,
      messagedAt: row.messaged_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
    })),
  });
}

const patchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(request: Request) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;

  const denied = requireWrite(resolved.value.tenant);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A boolean `enabled` is required." }, { status: 422 });
  }

  const { store } = resolved.value;

  /*
   * Reset to now() every time this turns on, never preserved across an
   * off-then-on cycle. A store can have real pending orders from before
   * recovery existed for it at all — resetting the boundary on every enable
   * means turning it on never sweeps up whatever backlog piled up, no matter
   * how many times it's been switched off and back on.
   */
  await db()`
    update stores
       set abandoned_checkout_enabled = ${parsed.data.enabled},
           abandoned_checkout_enabled_at = case when ${parsed.data.enabled} then now() else abandoned_checkout_enabled_at end
     where id = ${store.id}
  `;

  return NextResponse.json({ enabled: parsed.data.enabled });
}
