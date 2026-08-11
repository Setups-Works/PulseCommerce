import { db } from "@/lib/db/client";

/**
 * Numbers that must never receive a campaign message.
 *
 * Kept deliberately separate from WooCommerce: a customer who asks to stop
 * hearing from you has not stopped being a customer, so this cannot live on the
 * order record. It is applied on the server at send time, after the audience is
 * resolved, so no filter mistake in the UI can route around it.
 *
 * Entries are stored as E.164 digits, which is what the phone normaliser emits,
 * so a number added in one format still matches an order written in another.
 *
 * ─── Why a row per number ──────────────────────────────────────────────────
 *
 * This was one JSON array under a single key: read it, append, write it back.
 * Two unsubscribes arriving together meant the second overwrote the first, and
 * the person whose request was lost kept receiving messages. Of everything the
 * old store held, this was the write that could least afford to be lost.
 *
 * As a table it is an insert against a primary key. Concurrent unsubscribes
 * cannot conflict, and the membership test a send performs is an index lookup
 * rather than a linear scan of a deserialised array.
 */

export interface OptOutEntry {
  e164: string;
  reason?: string;
  addedAt: string;
}

interface OptOutRow {
  phone: string;
  reason: string | null;
  opted_out_at: Date;
}

function toEntry(row: OptOutRow): OptOutEntry {
  return {
    e164: row.phone,
    reason: row.reason ?? undefined,
    addedAt: row.opted_out_at.toISOString(),
  };
}

export async function readOptOuts(): Promise<OptOutEntry[]> {
  try {
    const rows = await db()<OptOutRow[]>`
      select phone, reason, opted_out_at
      from whatsapp_opt_outs
      order by opted_out_at desc
    `;
    return rows.map(toEntry);
  } catch {
    return [];
  }
}

/**
 * Set of E.164 digits, for the membership test a send performs per recipient.
 *
 * Read whole rather than queried per recipient on purpose: a broadcast checks
 * thousands of numbers in a loop, and one query returning the list beats one
 * query per person by a wide margin. The list is small — it is people who
 * unsubscribed, not people who exist.
 *
 * A failure here returns an empty set, which would let a send proceed to
 * someone who opted out. Callers must therefore treat this as required rather
 * than best-effort; `readOptOutSetStrict` is what the send path uses.
 */
export async function readOptOutSet(): Promise<Set<string>> {
  return new Set((await readOptOuts()).map((e) => e.e164));
}

/**
 * The same list, but a database failure raises instead of returning empty.
 *
 * Used by anything that is about to send. Failing a broadcast is recoverable;
 * messaging someone who asked you to stop is not.
 */
export async function readOptOutSetStrict(): Promise<Set<string>> {
  const rows = await db()<{ phone: string }[]>`select phone from whatsapp_opt_outs`;
  return new Set(rows.map((r) => r.phone));
}

export async function addOptOut(e164: string, reason?: string): Promise<OptOutEntry[]> {
  const digits = e164.replace(/\D/g, "");
  if (!digits) throw new Error("A phone number is required.");

  // Idempotent: asking twice keeps the original timestamp and reason, because
  // when they first asked is the fact worth keeping.
  await db()`
    insert into whatsapp_opt_outs (phone, reason)
    values (${digits}, ${reason ?? null})
    on conflict (phone) do nothing
  `;
  return readOptOuts();
}

export async function removeOptOut(e164: string): Promise<OptOutEntry[]> {
  const digits = e164.replace(/\D/g, "");
  await db()`delete from whatsapp_opt_outs where phone = ${digits}`;
  return readOptOuts();
}

/** Whether one number has opted out. An indexed primary-key lookup. */
export async function isOptedOut(e164: string): Promise<boolean> {
  const digits = e164.replace(/\D/g, "");
  if (!digits) return false;
  const rows = await db()`select 1 from whatsapp_opt_outs where phone = ${digits}`;
  return rows.length > 0;
}
