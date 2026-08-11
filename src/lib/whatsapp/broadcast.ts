import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
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
  /** Customer key, so a flow can tell who it has already enrolled. */
  key: string;
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

/**
 * Broadcasts, and their recipients, as two tables.
 *
 * A broadcast to twenty thousand people used to be one JSON document holding
 * every recipient. Advancing the cursor rewrote the whole thing — megabytes
 * per batch — and two overlapping progress writes lost each other, which on a
 * send means either stalling or messaging somebody twice.
 *
 * Recipients are rows now. Progress is an update to the rows that were sent,
 * and "how far along is this" is a count rather than a deserialisation.
 */

/** Keeps the history bounded; older broadcasts are dropped oldest-first. */
const MAX_HISTORY = 25;

interface BroadcastRow {
  id: string;
  status: string;
  message: BroadcastMessage & {
    audienceLabel?: string;
    cursor?: number;
    batches?: { batchId: string; size: number; submittedAt: string }[];
    matched?: number;
    delayBetweenMessagesMs?: number;
  };
  skipped: BroadcastSkips;
  error: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function readBroadcast(userId: string, id: string): Promise<BroadcastJob | null> {
  try {
    const [row] = await db()<BroadcastRow[]>`
      select id, status, message, skipped, error, created_at, updated_at
      from whatsapp_broadcasts where id = ${id} and user_id = ${userId}
    `;
    if (!row) return null;

    const recipients = await db()<
      {
        customer_key: string;
        chat_id: string | null;
        name: string | null;
        vars: Partial<TemplateVariables>;
      }[]
    >`
      select customer_key, chat_id, name, vars
      from whatsapp_broadcast_recipients where broadcast_id = ${id}
      -- Stable order: the cursor is a position in this list, so it has to mean
      -- the same thing on every read or a resumed send skips or repeats people.
      order by customer_key
    `;

    const { audienceLabel, cursor, batches, matched, delayBetweenMessagesMs, ...message } =
      row.message;

    return {
      id: row.id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      status: row.status as BroadcastStatus,
      audienceLabel: audienceLabel ?? "",
      message: message as BroadcastMessage,
      recipients: recipients.map((r) => ({
        key: r.customer_key,
        chatId: r.chat_id ?? "",
        name: r.name ?? "",
        vars: r.vars ?? {},
      })),
      cursor: cursor ?? 0,
      batches: batches ?? [],
      skipped: row.skipped,
      matched: matched ?? recipients.length,
      delayBetweenMessagesMs: delayBetweenMessagesMs ?? 4000,
      ...(row.error ? { error: row.error } : {}),
    };
  } catch {
    return null;
  }
}

export async function writeBroadcast(userId: string, job: BroadcastJob): Promise<void> {
  await db().begin(async (tx) => {
    await tx`
      insert into whatsapp_broadcasts (id, user_id, status, message, skipped, total, handed_off, error)
      values (
        ${job.id}, ${userId}, ${job.status},
        ${tx.json({
          ...job.message,
          audienceLabel: job.audienceLabel,
          cursor: job.cursor,
          batches: job.batches,
          matched: job.matched,
          delayBetweenMessagesMs: job.delayBetweenMessagesMs,
        } as never)},
        ${tx.json(job.skipped as never)},
        ${job.recipients.length}, ${job.cursor}, ${job.error ?? null}
      )
      on conflict (id) do update set
        status = excluded.status, message = excluded.message,
        skipped = excluded.skipped, total = excluded.total,
        handed_off = excluded.handed_off, error = excluded.error
    `;

    if (job.recipients.length) {
      // Chunked: one statement per five hundred keeps the parameter count
      // inside Postgres's limit on a large audience.
      for (let i = 0; i < job.recipients.length; i += 500) {
        const chunk = job.recipients.slice(i, i + 500);
        await tx`
          insert into whatsapp_broadcast_recipients ${tx(
            chunk.map((r, offset) => ({
              broadcast_id: job.id,
              customer_key: r.key,
              chat_id: r.chatId,
              name: r.name,
              vars: tx.json(r.vars as never),
              // Everything before the cursor has been handed to the gateway.
              // Derived rather than stored on the recipient, because the cursor
              // is the single source of truth for progress.
              status: i + offset < job.cursor ? "sent" : "pending",
            })) as never,
          )}
          on conflict (broadcast_id, customer_key) do update set
            status = excluded.status, chat_id = excluded.chat_id,
            name = excluded.name, vars = excluded.vars
        `;
      }
    }
  });
}

export async function listBroadcastIds(userId: string): Promise<string[]> {
  try {
    const rows = await db()<{ id: string }[]>`
      select id from whatsapp_broadcasts where user_id = ${userId}
      order by created_at desc limit ${MAX_HISTORY}
    `;
    return rows.map((r) => r.id);
  } catch {
    return [];
  }
}

/**
 * Drops broadcasts beyond the history limit.
 *
 * Recipient rows go with them through the cascade, which matters: a finished
 * broadcast's recipient list is a list of who was messaged, and keeping every
 * one of those forever is not something anybody asked for.
 */
async function indexBroadcast(userId: string): Promise<void> {
  await db()`
    delete from whatsapp_broadcasts
    where user_id = ${userId}
      and id not in (
        select id from whatsapp_broadcasts where user_id = ${userId}
        order by created_at desc limit ${MAX_HISTORY}
      )
  `;
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
      key: customer.key,
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

export async function createBroadcast(userId: string, input: {
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

  await writeBroadcast(userId, job);
  await indexBroadcast(userId);
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
