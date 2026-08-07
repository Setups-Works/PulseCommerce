"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/auth-service";
import { can, type AppRole } from "@/lib/auth/rbac";

/**
 * Role and account changes.
 *
 * Three layers guard these, doing different jobs:
 *
 *   1. The UI hides the controls from anyone who is not an admin.
 *   2. These functions re-check, because hiding a control is not a boundary.
 *   3. `guard_user_privileges` in the foundation migration refuses to demote
 *      or deactivate the last admin, whoever asks.
 *
 * The third is the one that actually holds. The first two exist so a refusal
 * reads as a sentence rather than as a Postgres exception.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireAdmin(): Promise<ActionResult | null> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "You are not signed in." };
  if (!can(profile.role, "users.write")) {
    return { ok: false, error: "Only an admin can change roles." };
  }
  return null;
}

async function audit(action: string, targetId: string, after: unknown) {
  try {
    const profile = await getProfile();
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      actor_id: profile?.id ?? null,
      actor_email: profile?.email ?? null,
      action,
      entity: "users",
      entity_id: targetId,
      after: after as never,
    });
  } catch {
    // An audit write must not roll back a change the admin watched succeed.
  }
}

export async function setUserRole(userId: string, role: AppRole): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ role }).eq("id", userId);

  // The database trigger raises for the last-admin case; surface its message,
  // which is written for a person, rather than a generic failure.
  if (error) return { ok: false, error: error.message };

  await audit("role changed", userId, { role });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ is_active: isActive }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await audit(isActive ? "reactivated" : "deactivated", userId, { is_active: isActive });
  revalidatePath("/admin/users");
  return { ok: true };
}
