import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase on the server, reading the session from cookies.
 *
 * Used to answer one question — who is making this request — in route handlers
 * and server components. The answer becomes the tenant that every query is
 * scoped to.
 */
export async function supabaseServer(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured on the server.");

  const jar = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          /*
           * Server components cannot set cookies. That is fine and expected:
           * a refreshed token is written by Proxy, which runs before the
           * render and can. Throwing here would break every page that merely
           * asks who the user is.
           */
        }
      },
    },
  });
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

/**
 * The signed-in user, or null.
 *
 * Uses `getUser`, never `getSession`. `getSession` returns whatever is in the
 * cookie without checking it, and a cookie is something the client controls —
 * trusting it would let anyone claim any user id. `getUser` validates the
 * token against the Auth server, which is the difference between reading a
 * claim and verifying one.
 */
export async function currentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) return null;

    const meta = data.user.user_metadata ?? {};
    return {
      id: data.user.id,
      email: data.user.email,
      name: (meta.full_name as string) ?? (meta.name as string) ?? null,
      avatarUrl: (meta.avatar_url as string) ?? null,
    };
  } catch {
    return null;
  }
}
