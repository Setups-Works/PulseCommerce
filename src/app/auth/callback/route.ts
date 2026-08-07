import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * The OAuth / magic-link return leg.
 *
 * Supabase sends the browser here with a one-time `code`; this route exchanges
 * it for a session and writes the cookies. It has to be a Route Handler rather
 * than a page — a Server Component cannot set cookies, and the whole purpose
 * of this request is to set them.
 *
 * The redirect target is validated before use. `next` arrives in the query
 * string, so accepting it unchecked would turn this into an open redirect:
 * a link to our own domain that lands the visitor, freshly authenticated, on
 * someone else's. Only same-origin paths are allowed through.
 */

function safeRedirect(next: string | null): string {
  if (!next) return "/onboarding";
  // Must be a root-relative path. `//evil.com` and `https://evil.com` are both
  // rejected — the first is protocol-relative and would leave the origin.
  if (!next.startsWith("/") || next.startsWith("//")) return "/onboarding";
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirect(searchParams.get("next"));

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/admin/unavailable`);
  }

  if (!code) {
    const error = searchParams.get("error_description") ?? "No authorization code was returned.";
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(error)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent("That sign-in link has expired. Request a new one.")}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
