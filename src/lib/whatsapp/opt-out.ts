import { getStore } from "@/lib/store/kv";

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
 */

const KEY = "whatsapp-opt-out";

export interface OptOutEntry {
  e164: string;
  reason?: string;
  addedAt: string;
}

export async function readOptOuts(): Promise<OptOutEntry[]> {
  try {
    const raw = await getStore().get(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OptOutEntry[];
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.e164 === "string") : [];
  } catch {
    return [];
  }
}

/** Set of E.164 digits, for the membership test a send performs per recipient. */
export async function readOptOutSet(): Promise<Set<string>> {
  return new Set((await readOptOuts()).map((e) => e.e164));
}

export async function addOptOut(e164: string, reason?: string): Promise<OptOutEntry[]> {
  const digits = e164.replace(/\D/g, "");
  if (!digits) throw new Error("A phone number is required.");

  const existing = await readOptOuts();
  if (existing.some((e) => e.e164 === digits)) return existing;

  const next = [...existing, { e164: digits, reason, addedAt: new Date().toISOString() }];
  await getStore().set(KEY, JSON.stringify(next));
  return next;
}

export async function removeOptOut(e164: string): Promise<OptOutEntry[]> {
  const digits = e164.replace(/\D/g, "");
  const next = (await readOptOuts()).filter((e) => e.e164 !== digits);
  await getStore().set(KEY, JSON.stringify(next));
  return next;
}
