import { Activity } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CliLoginApproval } from "@/components/cli-login-approval";
import { currentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Where `pulse login` sends a browser.
 *
 * Same shape as `/connect`: a session is required before anything here can
 * happen, so a signed-out visit round-trips through `/login` and comes back.
 */
export default async function CliLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const userCode = typeof params.user_code === "string" ? params.user_code : null;

  const user = await currentUser();
  if (!user) {
    const next = userCode ? `/cli-login?user_code=${encodeURIComponent(userCode)}` : "/cli-login";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-4 py-16">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="size-4.5" strokeWidth={2.5} />
        </span>
        <span className="text-base font-semibold tracking-tight">PulseCommerce</span>
      </Link>

      {userCode ? (
        <div className="w-full">
          <CliLoginApproval userCode={userCode} />
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Missing a login code. Run <code className="rounded bg-muted px-1 py-0.5 font-mono">pulse login</code>{" "}
          again — it opens this page with the right one.
        </p>
      )}
    </main>
  );
}
