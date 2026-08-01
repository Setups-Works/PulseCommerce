import { randomUUID } from "node:crypto";
import { getStore } from "@/lib/store/kv";
import type { CustomerRecord } from "@/lib/analytics/types";
import { MAX_BATCH_SIZE, type WhatsAppConfig } from "./config";
import { maskPhone, normalisePhone } from "./phone";
import { renderTemplate, type TemplateVariables } from "./templates";

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
  /** Coupon code and its worth, substituted into {{coupon}} for everyone. */
  coupon?: { code: string; value: string };
  /** One product for the whole campaign, instead of each customer's own. */
  product?: { name: string; url: string; image: string; category: string };
  /**
   * Attach each recipient's own product photo instead of one shared image.
   * Recipients with no photo fall back to a text message rather than being
   * dropped, so the send never silently shrinks.
   */
  useProductImage?: boolean;
}

export interface BroadcastRecipient {
  chatId: string;
  /** First name, for {{name}} substitution. */
  name: string;
  /** Everything a template can reference, resolved from this customer's orders. */
  vars: Partial<TemplateVariables>;
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
/** What a template needs to know about the catalogue and the store. */
export interface RecipientContext {
  /** Lowercased product name to its buy link, photo and category. */
  products: Map<string, { url: string; image: string; category: string }>;
  storeName: string;
  formatMoney: (value: number) => string;
}

export function resolveRecipients(
  audience: CustomerRecord[],
  phoneByKey: Map<string, string>,
  optedOut: Set<string>,
  config: Pick<WhatsAppConfig, "defaultDialCode">,
  context: RecipientContext,
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

    recipients.push({
      chatId: normalised.chatId,
      name: firstName(customer.name),
      vars: variablesFor(customer, context),
    });
  }

  return {
    recipients,
    skipped,
    matched: audience.length,
    sample: recipients.slice(0, 5).map((r) => maskPhone(r.chatId.split("@")[0])),
  };
}

/**
 * What this customer's own history makes available to a template.
 *
 * The product chosen is the one they have spent the most on, not the most
 * recent — a one-off small purchase should not become the thing a reorder
 * message is built around. A product that is no longer in the catalogue yields
 * no link or photo, and the template collapses those lines rather than linking
 * somewhere broken.
 */
function variablesFor(
  customer: CustomerRecord,
  context: RecipientContext,
): Partial<TemplateVariables> {
  const top = [...(customer.topProducts ?? [])].sort((a, b) => b.revenue - a.revenue)[0];
  const listed = top ? context.products.get(top.name.toLowerCase()) : undefined;

  return {
    product: top?.name ?? "",
    product_url: listed?.url ?? "",
    product_image: listed?.image ?? "",
    category: listed?.category ?? "",
    last_order: customer.lastOrderDate
      ? new Date(customer.lastOrderDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
        })
      : "",
    orders: String(customer.orders),
    spend: context.formatMoney(customer.netRevenue),
    store: context.storeName,
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

/** Substitutes every template variable for one recipient. */
export function renderMessage(message: BroadcastMessage, recipient: BroadcastRecipient): string {
  return renderTemplate(message.text, {
    ...recipient.vars,
    name: recipient.name,
    // A campaign-wide product overrides whatever that customer bought: the
    // operator picked this one deliberately, so it wins.
    ...(message.product
      ? {
          product: message.product.name,
          product_url: message.product.url,
          product_image: message.product.image,
          category: message.product.category,
        }
      : {}),
    coupon: message.coupon?.code ?? "",
    coupon_value: message.coupon?.value ?? "",
  });
}

/** The image to attach for one recipient, if any. */
export function mediaFor(
  message: BroadcastMessage,
  recipient: BroadcastRecipient,
): string | null {
  if (message.product?.image) return message.product.image;
  if (message.useProductImage) return recipient.vars.product_image || null;
  return message.mediaUrl || null;
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
