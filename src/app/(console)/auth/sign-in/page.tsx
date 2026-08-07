import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getProfile } from "@/services/auth-service";
import { isStaff } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to PulseCommerce to see who is buying, and who has stopped.",
  robots: { index: false, follow: false },
};

/**
 * Customer sign-in.
 *
 * Distinct from `/login`, which is the self-hosted deployment's shared-password
 * gate and predates accounts entirely. That one protects a single-tenant
 * install; this one signs a person into an account.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Already signed in: send them where they belong rather than showing a form
  // that would immediately redirect anyway.
  const profile = await getProfile();
  if (profile) redirect(isStaff(profile.role) ? "/admin" : "/onboarding");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <AuthForm mode="sign-in" initialError={error} />
    </main>
  );
}
