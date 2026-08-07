"use server";

import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/auth-service";
import { can, type Capability } from "@/lib/auth/rbac";

/**
 * Write path for CMS content.
 *
 * Every editable section goes through these functions rather than each screen
 * writing its own. Three things then happen consistently and cannot be
 * forgotten per-screen:
 *
 *   1. The capability is checked before the write. Row level security is the
 *      real boundary, but a policy rejection surfaces as an opaque Postgres
 *      error; checking here produces a sentence a person can act on.
 *   2. The change is written to audit_logs, with the before and after rows.
 *      An audit trail that depends on each screen remembering to write to it
 *      has holes exactly where someone was careless.
 *   3. The public pages are revalidated, so an edit is visible without a
 *      deploy — which is the entire point of moving the content into a CMS.
 *
 * Typed against the generated Database, so a column renamed in a migration is
 * a compile error here rather than a silent no-op at runtime.
 */

type Tables = Database["public"]["Tables"];

/** The tables these actions may touch. Anything not listed is not editable. */
export type ContentTable = Extract<
  keyof Tables,
  | "faqs"
  | "testimonials"
  | "features"
  | "pricing_plans"
  | "hero_sections"
  | "partners"
  | "announcements"
  | "navigation"
  | "footer_links"
  | "integrations"
  | "seo_entries"
  | "analytics_modules"
>;

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Public routes a content change can affect.
 *
 * Revalidated as a set rather than per-table, because most sections appear on
 * more than one page — pricing is on `/` and `/pricing`, the FAQ is on both,
 * and navigation is in the layout of every one. Mapping each table to a
 * precise list would be a second thing to keep in step with the components.
 */
const PUBLIC_ROUTES = [
  "/",
  "/features",
  "/features/ai",
  "/features/campaigns",
  "/whatsapp",
  "/integrations",
  "/pricing",
];

function revalidatePublic() {
  for (const route of PUBLIC_ROUTES) revalidatePath(route);
}

async function authorise(capability: Capability): Promise<string | null> {
  const profile = await getProfile();
  if (!profile) return "You are not signed in.";
  if (!can(profile.role, capability)) return "Your role cannot make that change.";
  return null;
}

/**
 * Records what changed.
 *
 * Failures are swallowed: an audit write that fails should not roll back the
 * edit the user just made and watched succeed. The log is for accountability
 * after the fact, not a precondition of the change.
 */
async function audit(
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  try {
    const profile = await getProfile();
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      actor_id: profile?.id ?? null,
      actor_email: profile?.email ?? null,
      action,
      entity,
      entity_id: entityId,
      before: (before ?? null) as never,
      after: (after ?? null) as never,
    });
  } catch {
    /* see above */
  }
}

export async function createContentRow(
  table: ContentTable,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const denied = await authorise("content.write");
  if (denied) return { ok: false, error: denied };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .insert(values as never)
    .select()
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  await audit("created", table, (data as { id?: string } | null)?.id ?? null, null, data);
  revalidatePublic();
  return { ok: true };
}

export async function updateContentRow(
  table: ContentTable,
  id: string,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const denied = await authorise("content.write");
  if (denied) return { ok: false, error: denied };

  const supabase = await createClient();

  // Read first, so the audit entry can show what it was. One extra query per
  // edit against a table of tens of rows — cheap for a real answer to "who
  // changed this, and what did it say before".
  const { data: before } = await supabase.from(table).select("*").eq("id", id).maybeSingle();

  const { data: after, error } = await supabase
    .from(table)
    .update(values as never)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  await audit("updated", table, id, before, after);
  revalidatePublic();
  return { ok: true };
}

export async function deleteContentRow(table: ContentTable, id: string): Promise<ActionResult> {
  const denied = await authorise("content.write");
  if (denied) return { ok: false, error: denied };

  const supabase = await createClient();
  const { data: before } = await supabase.from(table).select("*").eq("id", id).maybeSingle();

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit("deleted", table, id, before, null);
  revalidatePublic();
  return { ok: true };
}

/**
 * Publishes or unpublishes a row.
 *
 * Separate from `updateContentRow` because it is the one change with an
 * immediate effect on what the public sees, and worth finding in the audit log
 * by action name rather than by diffing a status column.
 */
export async function setContentStatus(
  table: ContentTable,
  id: string,
  status: Database["public"]["Enums"]["content_status"],
): Promise<ActionResult> {
  const denied = await authorise("content.publish");
  if (denied) return { ok: false, error: denied };

  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ status } as never)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await audit(status === "published" ? "published" : `set ${status}`, table, id, null, { status });
  revalidatePublic();
  return { ok: true };
}

/**
 * Moves a row up or down within its section.
 *
 * Swaps the two `position` values rather than renumbering the whole list, so a
 * reorder is two writes regardless of list length and concurrent edits
 * elsewhere in the list are unaffected.
 */
export async function moveContentRow(
  table: ContentTable,
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const denied = await authorise("content.write");
  if (denied) return { ok: false, error: denied };

  const supabase = await createClient();
  const { data: rows } = await supabase.from(table).select("id, position").order("position");
  if (!rows) return { ok: false, error: "Could not read the current order." };

  const list = rows as unknown as { id: string; position: number }[];
  const index = list.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;

  // Already at the end of the list. Not an error — the button just does nothing.
  if (index < 0 || swapWith < 0 || swapWith >= list.length) return { ok: true };

  const a = list[index];
  const b = list[swapWith];

  const [first, second] = await Promise.all([
    supabase
      .from(table)
      .update({ position: b.position } as never)
      .eq("id", a.id),
    supabase
      .from(table)
      .update({ position: a.position } as never)
      .eq("id", b.id),
  ]);

  if (first.error || second.error) {
    return { ok: false, error: first.error?.message ?? second.error?.message };
  }

  revalidatePublic();
  return { ok: true };
}
