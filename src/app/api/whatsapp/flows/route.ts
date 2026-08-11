import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/tenant";
import {
  createFlow,
  listFlows,
  readState,
  summarise,
  MAX_STEPS,
} from "@/lib/whatsapp/flows";
import { audienceFilterSchema, messageSchema } from "@/lib/whatsapp/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stepSchema = z.object({
  /**
   * Capped at a year. A step further out than that is a mistake rather than a
   * plan, and an uncapped wait puts an enrolment in storage indefinitely.
   */
  waitDays: z.number().min(0).max(365),
  message: messageSchema,
});

const createSchema = z.object({
  name: z.string().min(1, "A flow needs a name.").max(120),
  entry: audienceFilterSchema,
  steps: z
    .array(stepSchema)
    .min(1, "A flow needs at least one step.")
    .max(MAX_STEPS, `A flow can have at most ${MAX_STEPS} steps.`),
  exitOn: z.enum(["none", "ordered"]).default("ordered"),
  /**
   * Test mode. Every step goes to this number and the entry audience is never
   * read, so a sequence can be checked without messaging a customer.
   */
  testPhone: z
    .string()
    .regex(/^[+ 0-9()-]{6,20}$/, "That does not look like a phone number.")
    .optional(),
});

/** Every flow, with its progress. */
export async function GET(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const flows = await listFlows(userId);
  const summaries = await Promise.all(
    flows.map(async (flow) => summarise(flow, await readState(userId, flow.id))),
  );

  return NextResponse.json({ flows: summaries });
}

/**
 * Creates a flow.
 *
 * Always as a draft. Creating a sequence and starting to send it to thousands
 * of people are two decisions, and conflating them means a typo in a filter
 * becomes messages that cannot be recalled.
 */
export async function POST(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 422 },
    );
  }

  const flow = await createFlow(userId, { ...parsed.data, status: "draft" });
  return NextResponse.json({ flow: summarise(flow, await readState(userId, flow.id)) }, { status: 201 });
}
