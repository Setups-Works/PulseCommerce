import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Tables } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { can, isStaff, type Capability } from "@/lib/auth/rbac";

/**
 * Who is signed in, and what they may do.
 *
 * Every function here is wrapped in React's `cache`, so a render that asks
 * five times — the layout, the sidebar, a page, two components — issues one
 * database query. Without it, a moderately nested admin page opens a dozen
 * connections to answer the same question.
 *
 * The cache is per-request, not global, so one user's identity can never be
 * served to another.
 */

export type StaffProfile = Tables<"users">;

/**
 * The verified auth user, or null.
 *
 * `getUser()` rather than `getSession()`: the latter reads the cookie and
 * trusts it, which on a server is exactly the thing not to do. This one
 * validates the token with the auth server.
 */
export const getAuthUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});

/** The profile row, carrying the role. Null when signed out or deactivated. */
export const getProfile = cache(async (): Promise<StaffProfile | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  // A deactivated account keeps a valid token until it expires, so the flag
  // has to be honoured here as well as in the database policies.
  return data.is_active ? data : null;
});

/**
 * Guard for the admin panel.
 *
 * Redirects rather than throwing: a customer who follows a stale /admin link
 * should land somewhere useful, not on an error page. Customers go to the
 * product they actually pay for; everyone else goes to sign in.
 */
export async function requireStaff(): Promise<StaffProfile> {
  const profile = await getProfile();

  if (!profile) redirect("/admin/login");
  if (!isStaff(profile.role)) redirect("/dashboard");

  return profile;
}

/**
 * Guard for a specific capability.
 *
 * Use at the top of any admin page or server action that writes. Checking in
 * the UI alone is a suggestion; row level security is the real boundary, but
 * failing here gives a clean redirect instead of a Postgres error surfacing as
 * a 500.
 */
export async function requireCapability(capability: Capability): Promise<StaffProfile> {
  const profile = await requireStaff();
  if (!can(profile.role, capability)) redirect("/admin?denied=" + encodeURIComponent(capability));
  return profile;
}

/** Non-redirecting variant, for deciding whether to render a control. */
export async function currentCapabilities() {
  const profile = await getProfile();
  return {
    profile,
    can: (capability: Capability) => can(profile?.role, capability),
  };
}
