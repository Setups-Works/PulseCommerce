import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getProfile } from "@/services/auth-service";
import { isStaff } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a PulseCommerce account and connect your WooCommerce store.",
  robots: { index: false, follow: false },
};

/**
 * Customer sign-up.
 *
 * The first account created on a deployment becomes `admin` — the trigger in
 * the foundation migration decides that, not this page — so a fresh install is
 * never locked out of its own admin panel. Every later signup is a `customer`
 * and goes to onboarding.
 */
export default async function SignUpPage({
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
      <AuthForm mode="sign-up" initialError={error} />
    </main>
  );
}
