"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase in the browser.
 *
 * Only ever used for authentication — signing in, signing up, signing out and
 * reading who the current user is. It is deliberately not used to query data:
 * every table holding store data has row level security that would allow a
 * user their own rows, but reads still go through this app's API so that the
 * shape of a response is decided in one place and so phone numbers cannot be
 * selected from a browser at all.
 *
 * The anon key is public by design. It is embedded in the bundle, and it is
 * safe there because it grants nothing on its own: what it can reach is
 * exactly what RLS allows for whoever is signed in.
 */

let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  // One instance per tab. A second would keep its own copy of the session and
  // the two would drift apart after a token refresh.
  cached = createBrowserClient(url, key);
  return cached;
}

/** True when the browser has enough configuration to attempt a sign-in. */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
