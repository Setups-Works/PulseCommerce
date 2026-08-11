import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where Supabase sends the browser back after Google sign-in or an emailed
 * confirmation link.
 *
 * The provider returns a one-time code, not a session. Exchanging it has to
 * happen on the server because that is where the resulting cookies can be
 * written with HttpOnly set — doing it in the browser would leave the refresh
 * token readable by any script on the page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", url.origin));
  }

  const jar = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) jar.set(name, value, options);
        },
      },
    },
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, url.origin),
    );
  }

  /*
   * `next` comes from the query string, so it is attacker-controllable. Only a
   * path is accepted — an absolute URL here would turn sign-in into an open
   * redirect, which is a credible phishing primitive precisely because the
   * link genuinely does start at this site.
   */
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
