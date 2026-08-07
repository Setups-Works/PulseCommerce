import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Session refresh at the network boundary.
 *
 * Supabase access tokens are short-lived. Something has to exchange the
 * refresh token for a new one and write the cookies back, and the proxy is the
 * only place that runs before every request and can still set headers — a
 * Server Component cannot, which is why the cookie writer in
 * lib/supabase/server.ts is allowed to fail silently.
 *
 * The `getClaims()` call is not decoration. `@supabase/ssr` only performs the
 * refresh as a side effect of reading the session, so removing it would leave
 * users silently logged out an hour after signing in.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ response: NextResponse; userId: string | null }> {
  if (!isSupabaseConfigured()) return { response, userId: null };

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Written to both: the request so anything later in this pass sees the
        // fresh token, and the response so the browser keeps it.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  /*
   * `getClaims` verifies the JWT locally against the project's public key
   * rather than calling the auth server, so this costs no network round trip
   * on the hot path. It is also the only supported way to trust the token in
   * middleware — `getSession()` reads the cookie without verifying it, and
   * would accept a forged one.
   */
  const { data } = await supabase.auth.getClaims();
  return { response, userId: data?.claims?.sub ?? null };
}
