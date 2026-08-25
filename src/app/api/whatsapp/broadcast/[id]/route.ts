import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/auth/tenant";
import { isSessionSendable, WhatsAppApiError, WhatsAppClient } from "@/lib/whatsapp/client";
import { readWhatsAppConfig } from "@/lib/whatsapp/config";
import {
  estimateBatchMs,
  nextChunk,
  progressOf,
  readBroadcast,
  mediaFor,
  renderMessage,
  writeBroadcast,
  type BroadcastJob,
} from "@/lib/whatsapp/broadcast";
import type { BulkMessageItem } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Progress for one broadcast. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const { id } = await params;
  const job = await readBroadcast(userId, id);
  if (!job) return NextResponse.json({ error: "No such broadcast." }, { status: 404 });
  return NextResponse.json(progressOf(job));
}

/**
 * Hands the next batch to OpenWA and returns.
 *
 * One batch per call, deliberately. OpenWA paces its own sends, so a hundred
 * recipients occupy it for several minutes; a request that waited for that
 * would outlive any serverless function. The browser calls this on a timer
 * while the campaign page is open, and the cursor in storage means a closed tab
 * pauses the job rather than losing it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const { id } = await params;
  const job = await readBroadcast(userId, id);
  if (!job) return NextResponse.json({ error: "No such broadcast." }, { status: 404 });

  if (job.status === "cancelled" || job.status === "completed" || job.status === "failed") {
    return NextResponse.json(progressOf(job));
  }

  if (job.cursor >= job.recipients.length) {
    job.status = "completed";
    await writeBroadcast(userId, job);
    return NextResponse.json(progressOf(job));
  }

  const config = await readWhatsAppConfig(userId);
  if (!config) {
    return await fail(userId, job, "The WhatsApp gateway was disconnected while this broadcast was running.");
  }

  // Give the batch already in flight time to drain before adding another.
  // Without this the whole audience would be queued upstream in seconds, which
  // both defeats the pacing and risks hitting OpenWA's concurrent-batch cap.
  const last = job.batches.at(-1);
  if (last) {
    const elapsed = Date.now() - new Date(last.submittedAt).getTime();
    const expected = estimateBatchMs(last.size, job.delayBetweenMessagesMs);
    if (elapsed < expected) {
      return NextResponse.json({
        ...progressOf(job),
        waiting: true,
        retryAfterMs: expected - elapsed,
      });
    }
  }

  /*
   * A broadcast runs for hours, so the gateway is very likely to restart
   * somewhere in the middle. Recovering here means that costs one batch of
   * delay rather than failing every remaining recipient.
   */
  const client = new WhatsAppClient(config);
  const session = await client.ensureSendable().catch(() => null);
  if (!session || !isSessionSendable(session)) {
    return await fail(
      userId,
      job,
      session
        ? `The WhatsApp session stopped being able to send (status "${session.status}", engine ${session.engineLoaded ? "loaded" : "not loaded"}). Re-link the number in Settings, then start a new broadcast.`
        : "The WhatsApp gateway became unreachable mid-broadcast.",
    );
  }

  const chunk = nextChunk(job);
  const messages: BulkMessageItem[] = chunk.map((recipient) => {
    const body = renderMessage(job.message, recipient);
    const media = mediaFor(job.message, recipient);

    // A recipient whose product has no photo still gets the message, as text.
    // Dropping them would shrink the audience for a cosmetic reason.
    if (job.message.type === "text" || !media) {
      return { chatId: recipient.chatId, type: "text" as const, content: { text: body } };
    }
    return {
      chatId: recipient.chatId,
      type: job.message.type,
      content: { url: media, caption: body },
    };
  });

  try {
    const accepted = await client.sendBulk(messages, {
      delayBetweenMessages: job.delayBetweenMessagesMs,
      randomizeDelay: true,
      // One bad number must not abandon the rest of the batch; failures are
      // reported per message by the gateway instead.
      stopOnError: false,
    });

    job.batches.push({
      batchId: String(accepted?.batchId ?? `batch-${job.batches.length + 1}`),
      size: chunk.length,
      submittedAt: new Date().toISOString(),
    });
    job.cursor += chunk.length;
    if (job.cursor >= job.recipients.length) job.status = "completed";

    await writeBroadcast(userId, job);
    return NextResponse.json(progressOf(job));
  } catch (error) {
    const message =
      error instanceof WhatsAppApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "The gateway rejected the batch.";
    return await fail(userId, job, message);
  }
}

/** Stops a broadcast. Batches already accepted by OpenWA still go out. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const { id } = await params;
  const job = await readBroadcast(userId, id);
  if (!job) return NextResponse.json({ error: "No such broadcast." }, { status: 404 });

  if (job.status === "sending" || job.status === "paused") {
    job.status = "cancelled";
    await writeBroadcast(userId, job);

    // Best effort: ask the gateway to drop the batch it is still working
    // through. Messages it has already delivered cannot be recalled.
    const config = await readWhatsAppConfig(userId);
    const last = job.batches.at(-1);
    if (config && last) {
      await new WhatsAppClient(config).cancelBatch(last.batchId).catch(() => {});
    }
  }

  return NextResponse.json(progressOf(job));
}

async function fail(userId: string, job: BroadcastJob, error: string) {
  job.status = "failed";
  job.error = error;
  await writeBroadcast(userId, job);
  return NextResponse.json({ ...progressOf(job), error }, { status: 502 });
}
