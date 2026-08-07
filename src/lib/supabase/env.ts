/**
 * Supabase configuration, and the switch that makes it optional.
 *
 * This app has always been runnable with `git clone && npm run dev` — no
 * services, no accounts, no keys. Making the CMS mandatory would end that, so
 * every read path falls back to the compiled-in defaults when Supabase is not
 * configured, and only the admin panel actually requires it.
 *
 * `isSupabaseConfigured()` is the single place that decides. Nothing else
 * should test the env vars directly, because a second test written slightly
 * differently is how "works locally, blank in production" happens.
 */

/** Browser-safe. Both the URL and the anon key are designed to be public. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Supabase renamed the anon key to the publishable key. Both spellings are
 * accepted so a project created before or after the rename works unchanged.
 */
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

/**
 * The service-role key. Server-only, and deliberately not prefixed with
 * NEXT_PUBLIC — it bypasses row level security entirely, so shipping it to a
 * browser would hand every visitor full read and write on the database.
 *
 * Read through a function rather than exported as a constant so that importing
 * this module from a client component cannot inline the value into the bundle.
 */
export function serviceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("The Supabase service-role key must never be read in the browser.");
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
}

export function hasServiceRole(): boolean {
  return typeof window === "undefined" && serviceRoleKey().length > 0;
}

/** The storage bucket created by the platform migration. */
export const MEDIA_BUCKET = "media";
