import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getProfile } from "@/services/auth-service";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isStaff } from "@/lib/auth/rbac";
import "@/app/heroui.css";

/**
 * The admin sign-in screen.
 *
 * Sits *outside* the admin layout on purpose — that layout calls
 * `requireStaff()`, which redirects here, so nesting the login page inside it
 * would be an infinite loop. That means this file imports heroui.css and
 * applies `.heroui-scope` itself.
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
    <div className="heroui-scope">
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
        <AdminLoginForm
          nextPath={next ?? "/admin"}
          // A signed-in customer reaching this page is not unauthenticated —
          // they simply are not staff. Saying so beats a login form that
          // appears to fail for no reason.
          notStaff={Boolean(profile && !isStaff(profile.role))}
        />
      </main>
    </div>
  );
}
