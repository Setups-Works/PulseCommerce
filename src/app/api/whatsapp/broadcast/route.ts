import { NextResponse } from "next/server";
import { z } from "zod";
import { isNotConnected } from "@/lib/store/errors";
import { isSessionSendable, WhatsAppApiError, WhatsAppClient } from "@/lib/whatsapp/client";
import {
  createBroadcast,
  listBroadcastIds,
  progressOf,
  readBroadcast,
} from "@/lib/whatsapp/broadcast";
import { describeAudience, resolveAudience } from "@/lib/whatsapp/recipients";
import {
  audienceFilterSchema,
  customerKeysSchema,
  messageSchema,
  rangeSchema,
} from "@/lib/whatsapp/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Recent broadcasts, newest first. */
export async function GET() {
  const ids = await listBroadcastIds();
  const jobs = await Promise.all(ids.map((id) => readBroadcast(id)));
  return NextResponse.json({
    broadcasts: jobs.filter((j) => j !== null).map((j) => progressOf(j)),
  });
}

const schema = z.object({
  filter: audienceFilterSchema,
  range: rangeSchema,
  customerKeys: customerKeysSchema,
  message: messageSchema,
  /**
   * Must equal the deliverable count the operator was shown. A stale or absent
   * value means the audience changed since they looked, so the send is refused
   * rather than going to a list nobody reviewed.
   */
  confirm: z.number().int().nonnegative(),
});

/**
 * Starts a broadcast.
 *
 * Nothing is sent here — the job is created and the first batch is handed over
 * by the tick endpoint. That keeps this request short and makes the send
 * resumable, which matters when a full audience takes hours at a safe pace.
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
      customerKeys: parsed.data.customerKeys,
    });

    if (resolved.recipients.length === 0) {
      return NextResponse.json(
        { error: "No one in this audience has a reachable WhatsApp number." },
        { status: 422 },
      );
    }

    // The audience is recomputed here rather than trusted from the preview, so
    // this compares what the operator confirmed against what would actually be
    // sent right now.
    if (parsed.data.confirm !== resolved.recipients.length) {
      return NextResponse.json(
        {
          error: `The audience changed: you confirmed ${parsed.data.confirm.toLocaleString()} recipients but it now resolves to ${resolved.recipients.length.toLocaleString()}. Review the preview again before sending.`,
          deliverable: resolved.recipients.length,
        },
        { status: 409 },
      );
    }

    // A session that is not linked would fail every message in the batch, so
    // this is checked before a job exists rather than after it half-runs.
    const session = await new WhatsAppClient(resolved.config).ensureSendable();
    if (!isSessionSendable(session)) {
      return NextResponse.json(
        {
          error: `The WhatsApp session cannot send right now (status "${session.status}", engine ${session.engineLoaded ? "loaded" : "not loaded"}). Link or restart the number in Settings before sending.`,
        },
        { status: 409 },
      );
    }

    const job = await createBroadcast({
      audienceLabel: describeAudience(parsed.data.filter, resolved.audience.length),
      message: parsed.data.message,
      recipients: resolved.recipients,
      skipped: resolved.skipped,
      matched: resolved.matched,
      delayBetweenMessagesMs: resolved.config.delayBetweenMessagesMs,
    });

    return NextResponse.json(progressOf(job), { status: 201 });
  } catch (error) {
    if (isNotConnected(error)) {
      return NextResponse.json({ error: error.message, code: "not_connected" }, { status: 409 });
    }
    if (error instanceof WhatsAppApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status === 0 ? 502 : error.status },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The broadcast could not be started." },
      { status: 500 },
    );
  }
}
