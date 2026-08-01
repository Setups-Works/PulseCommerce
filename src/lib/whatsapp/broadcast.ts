import { randomUUID } from "node:crypto";
import { getStore } from "@/lib/store/kv";
import type { CustomerRecord } from "@/lib/analytics/types";
import { MAX_BATCH_SIZE, type WhatsAppConfig } from "./config";
import { maskPhone, normalisePhone } from "./phone";

/**
 * Broadcast jobs.
 *
 * Shaped by one constraint: OpenWA paces its own batches (a 100-recipient batch
 * at the default 4s spacing takes about seven minutes), and a serverless request
 * cannot sit and wait for that. So a broadcast is a resumable job — state lives
 * in durable storage, and each "tick" submits at most one batch and returns.
 * The browser drives the ticks while the campaign page is open, and closing the
 * page pauses rather than breaks it: whatever was already handed to OpenWA still
 * goes out, and reopening resumes from the recorded cursor.
 */

export type BroadcastStatus =
  | "sending"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed";

export interface BroadcastMessage {
  type: "text" | "image" | "video";
  /** Body text, or the caption when media is attached. */
  text: string;
  /** Publicly reachable URL — OpenWA fetches the media itself. */
  mediaUrl?: string;
}

export interface BroadcastRecipient {
  chatId: string;
  /** First name, for {{name}} substitution. */
  name: string;
}

/** Why recipients were dropped, so the number sent is always explainable. */
export interface BroadcastSkips {
  noPhone: number;
  unparseable: number;
  optedOut: number;
  duplicate: number;
}

export interface BroadcastJob {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: BroadcastStatus;
  /** Plain-English description of the audience, for the history list. */
  audienceLabel: string;
  message: BroadcastMessage;
  recipients: BroadcastRecipient[];
  /** How far through `recipients` the job has been handed to OpenWA. */
  cursor: number;
  batches: { batchId: string; size: number; submittedAt: string }[];
  skipped: BroadcastSkips;
  /** Audience size before any skips, for the "x of y" the UI shows. */
  matched: number;
  delayBetweenMessagesMs: number;
  error?: string;
}

const JOB_PREFIX = "whatsapp-broadcast";
const INDEX_KEY = "whatsapp-broadcast-index";
/** Keeps the history list bounded; jobs beyond this are dropped oldest-first. */
const MAX_HISTORY = 25;

const jobKey = (id: string) => `${JOB_PREFIX}-${id}`;

export async function readBroadcast(id: string): Promise<BroadcastJob | null> {
  try {
    const raw = await getStore().get(jobKey(id));
    return raw ? (JSON.parse(raw) as BroadcastJob) : null;
  } catch {
    return null;
  }
}

export async function writeBroadcast(job: BroadcastJob): Promise<void> {
  job.updatedAt = new Date().toISOString();
  await getStore().set(jobKey(job.id), JSON.stringify(job));
}

export async function listBroadcastIds(): Promise<string[]> {
  try {
    const raw = await getStore().get(INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function indexBroadcast(id: string): Promise<void> {
  const ids = [id, ...(await listBroadcastIds()).filter((x) => x !== id)];
  const kept = ids.slice(0, MAX_HISTORY);
  await getStore().set(INDEX_KEY, JSON.stringify(kept));
  // Drop the payloads of anything that fell off the end, so old recipient
  // lists do not linger in storage indefinitely.
  for (const stale of ids.slice(MAX_HISTORY)) {
    await getStore().delete(jobKey(stale)).catch(() => {});
  }
}

export interface ResolveResult {
  recipients: BroadcastRecipient[];
  skipped: BroadcastSkips;
  matched: number;
  /** Masked sample, so the operator can sanity-check before committing. */
  sample: string[];
}

/**
 * Turns an audience into deliverable recipients, on the server.
 *
 * The browser never supplies phone numbers — it sends a filter, and the numbers
 * are resolved here from the snapshot. That means no request can address a
 * number that is not genuinely a customer's, and the opt-out list cannot be
 * bypassed by a crafted payload.
 */
export function resolveRecipients(
  audience: CustomerRecord[],
  phoneByKey: Map<string, string>,
  optedOut: Set<string>,
  config: Pick<WhatsAppConfig, "defaultDialCode">,
): ResolveResult {
  const recipients: BroadcastRecipient[] = [];
  const seen = new Set<string>();
  const skipped: BroadcastSkips = { noPhone: 0, unparseable: 0, optedOut: 0, duplicate: 0 };

  // Stable order so a resumed job addresses the same people in the same
  // sequence, even if the underlying snapshot has since refreshed.
  const ordered = [...audience].sort((a, b) => a.key.localeCompare(b.key));

  for (const customer of ordered) {
    const raw = phoneByKey.get(customer.key);
    if (!raw) {
      skipped.noPhone += 1;
      continue;
    }

    const normalised = normalisePhone(raw, {
      defaultDialCode: config.defaultDialCode,
      country: customer.country,
    });
    if (!normalised) {
      skipped.unparseable += 1;
      continue;
    }

    if (optedOut.has(normalised.e164)) {
      skipped.optedOut += 1;
      continue;
    }

    // Two customer records can share a number — a household, or one person
    // checking out under two email addresses. Sending twice looks like spam.
    if (seen.has(normalised.e164)) {
      skipped.duplicate += 1;
      continue;
    }
    seen.add(normalised.e164);

    recipients.push({ chatId: normalised.chatId, name: firstName(customer.name) });
  }

  return {
    recipients,
    skipped,
    matched: audience.length,
    sample: recipients.slice(0, 5).map((r) => maskPhone(r.chatId.split("@")[0])),
  };
}

function firstName(full: string): string {
  const first = full.trim().split(/\s+/)[0] ?? "";
  // Guest checkouts sometimes leave a bare email or "Guest" in the name field;
  // greeting someone by their email address reads worse than not greeting them.
  if (!first || first.includes("@") || first.toLowerCase() === "guest") return "";
  return first;
}

export async function createBroadcast(input: {
  audienceLabel: string;
  message: BroadcastMessage;
  recipients: BroadcastRecipient[];
  skipped: BroadcastSkips;
  matched: number;
  delayBetweenMessagesMs: number;
}): Promise<BroadcastJob> {
  const now = new Date().toISOString();
  const job: BroadcastJob = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "sending",
    audienceLabel: input.audienceLabel,
    message: input.message,
    recipients: input.recipients,
    cursor: 0,
    batches: [],
    skipped: input.skipped,
    matched: input.matched,
    delayBetweenMessagesMs: input.delayBetweenMessagesMs,
  };

  await writeBroadcast(job);
  await indexBroadcast(job.id);
  return job;
}

/** Substitutes {{name}} into the body for one recipient. */
export function renderMessage(message: BroadcastMessage, recipient: BroadcastRecipient): string {
  // An empty name would leave "Hi ," so the greeting collapses instead: the
  // template is expected to read "Hi {{name}}," and degrade to "Hi,".
  const withName = message.text.replace(/\{\{\s*name\s*\}\}/gi, recipient.name);
  return recipient.name ? withName : withName.replace(/\s+([,!.])/g, "$1");
}

/** The next slice to hand to OpenWA, capped at what it will accept. */
export function nextChunk(job: BroadcastJob): BroadcastRecipient[] {
  return job.recipients.slice(job.cursor, job.cursor + MAX_BATCH_SIZE);
}

/** How long OpenWA will take to work through a submitted batch. */
export function estimateBatchMs(size: number, delayMs: number): number {
  // Plus the randomised 0-2s jitter OpenWA adds to each gap.
  return size * (delayMs + 1000);
}

export function progressOf(job: BroadcastJob) {
  const total = job.recipients.length;
  const handedOff = Math.min(job.cursor, total);
  return {
    id: job.id,
    status: job.status,
    total,
    handedOff,
    remaining: Math.max(0, total - handedOff),
    percent: total === 0 ? 100 : Math.round((handedOff / total) * 100),
    batches: job.batches.length,
    skipped: job.skipped,
    matched: job.matched,
    audienceLabel: job.audienceLabel,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    error: job.error ?? null,
    /** Rough wall-clock left, from OpenWA's own pacing. */
    estimatedMsRemaining: estimateBatchMs(
      Math.max(0, total - handedOff),
      job.delayBetweenMessagesMs,
    ),
  };
}
