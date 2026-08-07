import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getProfile } from "@/services/auth-service";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isStaff } from "@/lib/auth/rbac";

/**
 * The admin sign-in screen.
 *
 * Sits outside the (panel) route group on purpose. That group's layout calls
 * `requireStaff()`, which redirects here — nesting this page inside it is an
 * infinite redirect, which is precisely the bug the group was introduced to
 * fix. Styling comes from the parent /admin layout.
 */

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/admin/unavailable");

  const { next } = await searchParams;

  // Already signed in and allowed through: skip the form.
  const profile = await getProfile();
  if (profile && isStaff(profile.role)) redirect(next ?? "/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <AdminLoginForm
        nextPath={next ?? "/admin"}
        // A signed-in customer reaching this page is not unauthenticated —
        // they simply are not staff. Saying so beats a login form that
        // appears to fail for no reason.
        notStaff={Boolean(profile && !isStaff(profile.role))}
      />
    </main>
  );
}
