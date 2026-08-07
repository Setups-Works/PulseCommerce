import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { authConfigured, passwordConfigured, SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * The sign-in page, which signed-in people should never see.
 *
 * A login form shown to somebody who is already authenticated is a dead end:
 * they either re-enter a password for no reason or assume the session broke.
 * The check happens on the server so the redirect is decided before any form
 * renders, rather than flashing the form and then navigating away.
 *
 * The same applies when the deployment has no password at all — auth is opt-in,
 * and with it switched off there is nothing here to do but move on.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.next === "string" ? params.next : "/dashboard";
  // Only ever bounce to a path on this origin; an absolute URL here would make
  // the login page an open redirect.
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value).catch(() => null);
  if (session) redirect(next);

  // With no password configured the middleware lets everything through, so a
  // sign-in screen would gate nothing.
  const passwordEnabled = authConfigured() && passwordConfigured();
  if (!passwordEnabled && next !== "/login") {
    // Still reachable directly, but never as an interruption on the way
    // somewhere else.
    if (params.next) redirect(next);
  }

  return <LoginForm passwordEnabled={passwordEnabled} />;
}
