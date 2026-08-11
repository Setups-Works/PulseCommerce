import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/tenant";
import {
  deleteFlow,
  readFlow,
  readState,
  summarise,
  writeFlow,
} from "@/lib/whatsapp/flows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
});

/** One flow, its steps, and how far along everyone in it is. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const { id } = await context.params;
  const flow = await readFlow(userId, id);
  if (!flow) return NextResponse.json({ error: "No such flow." }, { status: 404 });

  const state = await readState(userId, id);
  return NextResponse.json({
    flow: { ...summarise(flow, state), entry: flow.entry, steps: flow.steps },
    /*
     * A sample rather than every enrolment: a flow can hold thousands, and what
     * an operator needs to see is that people are moving through it and when
     * the next send lands, not a list they will never read.
     */
    upcoming: [...state.active]
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .slice(0, 20)
      .map((e) => ({ step: e.step, dueAt: e.dueAt, error: e.error ?? null })),
  });
}

/**
 * Renames a flow, or starts, pauses and resumes it.
 *
 * Steps and the entry filter are deliberately not editable: people are already
 * partway through, and changing step 3 under someone who has had steps 1 and 2
 * gives them a sequence nobody designed. Build a new flow instead.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const { id } = await context.params;
  const flow = await readFlow(userId, id);
  if (!flow) return NextResponse.json({ error: "No such flow." }, { status: 404 });

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

  if (parsed.data.name) flow.name = parsed.data.name;
  if (parsed.data.status) flow.status = parsed.data.status;
  await writeFlow(userId, flow);

  return NextResponse.json({ flow: summarise(flow, await readState(userId, id)) });
}

/**
 * Deletes a flow and everyone's place in it.
 *
 * Pausing is the reversible option and is what stopping a flow should normally
 * mean; this throws away the record of who has already been messaged, so a flow
 * recreated afterwards would start everyone from step one.
 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const { id } = await context.params;
  const flow = await readFlow(userId, id);
  if (!flow) return NextResponse.json({ error: "No such flow." }, { status: 404 });

  await deleteFlow(userId, id);
  return NextResponse.json({ deleted: true });
}
