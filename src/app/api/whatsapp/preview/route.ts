import { NextResponse } from "next/server";
import { z } from "zod";
import { isNotConnected } from "@/lib/store/errors";
import { renderMessage } from "@/lib/whatsapp/broadcast";
import { resolveAudience } from "@/lib/whatsapp/recipients";
import { audienceFilterSchema, messageSchema, rangeSchema } from "@/lib/whatsapp/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  filter: audienceFilterSchema,
  range: rangeSchema,
  message: messageSchema.optional(),
});

/**
 * Dry run. Resolves exactly the recipient list a broadcast would send to, and
 * sends nothing.
 *
 * This exists so the destructive step is never the first time anyone sees the
 * numbers: how many are reachable, how many were dropped and why, a masked
 * sample, and the message as one real recipient would receive it.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 422 },
    );
  }

  try {
    const resolved = await resolveAudience({
      filter: parsed.data.filter,
      range: parsed.data.range,
    });

    const { recipients, skipped, matched, sample, config } = resolved;

    // Preview against a real recipient rather than a placeholder, so a broken
    // {{name}} or a missing greeting is visible before anything is sent.
    const preview = parsed.data.message
      ? renderMessage(parsed.data.message, recipients[0] ?? { chatId: "", name: "" })
      : null;

    const perMessageMs = config.delayBetweenMessagesMs + 1000;
    return NextResponse.json({
      matched,
      deliverable: recipients.length,
      skipped,
      sample,
      preview,
      estimatedMs: recipients.length * perMessageMs,
      delayBetweenMessagesMs: config.delayBetweenMessagesMs,
      defaultDialCode: config.defaultDialCode,
    });
  } catch (error) {
    if (isNotConnected(error)) {
      return NextResponse.json({ error: error.message, code: "not_connected" }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not resolve the audience." },
      { status: 500 },
    );
  }
}
