import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  isSupabaseConfigured,
  serviceRoleKey,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/env";

/**
 * Server-side Supabase clients.
 *
 * `server-only` at the top is load-bearing: this module can reach the
 * service-role key, and the import makes bundling it into a client component a
 * build error rather than a silent credential leak.
 */

export type SupabaseServerClient = ReturnType<typeof createServerClient<Database>>;

/**
 * The request-scoped client. Reads the signed-in user's cookies, so every
 * query runs as that user and row level security applies.
 *
 * Not cached across requests — the cookie store belongs to one request, and a
 * client held in a module-level variable would serve one user's session to the
 * next.
 */
export async function createClient(): Promise<SupabaseServerClient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /*
           * Called from a Server Component, where the response headers are
           * already sent and cookies cannot be written. Safe to swallow: the
           * proxy refreshes the session on every request, so the only cookie
           * write that matters has already happened there.
           */
        }
      },
    },
  });
}

/**
 * A client that bypasses row level security.
 *
 * For work that is genuinely not on behalf of a user — a webhook, a scheduled
 * job, a first-run bootstrap. Every call site should be obvious about why it
 * needs this; if the answer is "the query was failing", the answer is wrong and
 * the policy needs fixing instead.
 */
export function createAdminClient() {
  const key = serviceRoleKey();
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It is required for admin-level database access.",
    );
  }
  return createSupabaseClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A read-only client for public content, with no user session attached.
 *
 * Used by the marketing pages: they are statically rendered and have no
 * cookies to read, and RLS already limits anonymous reads to published rows.
 * Returns null when Supabase is not configured, which is the signal for
 * callers to fall back to the compiled-in defaults.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
