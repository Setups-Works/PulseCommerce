"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * The browser client.
 *
 * `createBrowserClient` already memoises per (url, key) pair, so calling this
 * from several components does not open several connections or several token
 * refresh timers. It is wrapped rather than used directly so the generated
 * `Database` type is applied in exactly one place.
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
