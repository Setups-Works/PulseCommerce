import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * The network boundary.
 *
 * Renamed from `middleware.ts` per Next 16, which deprecated the filename and
 * the named export. Behaviour is unchanged for the existing routes; the file
 * now also carries Supabase session refresh and the /admin gate.
 *
 * Two independent auth systems run side by side, on purpose:
 *
 *   * The signed cookie in lib/auth/session.ts gates the *product* — the
 *     merchant's own analytics screens. It is opt-in (no AUTH_SECRET means the
 *     app runs open), which is what makes "clone and run" work, and it is tied
 *     to a WooCommerce authorization rather than to an account.
 *
 *   * Supabase Auth gates the *platform* — /admin. It is account-based, has
 *     roles, and is the only thing that can reach the CMS.
 *
 *   Merging them would mean either forcing every self-hosted deployment to
 *   stand up a Supabase project, or weakening the admin panel to the shared
 *   password the product uses. Neither is worth it.
 */

/**
 * Every route behind the sidebar.
 *
 * This list has to match the app's routes exactly — a page that exists but is
 * missing here is served to anybody who knows the URL. If you add a route
 * under `(app)`, add it here in the same commit.
 *
 * `/connect` is deliberately absent: it is the page that failed authorizations
 * redirect back to with their error, and gating it would bounce the merchant to
 * a login screen that cannot explain what went wrong.
 */
const PROTECTED = [
  "/dashboard",
  "/forecast",
  "/customers",
  "/acquisition",
  "/cohorts",
  "/products",
  "/inventory",
  "/orders",
  "/assistant",
  "/campaigns",
  "/flows",
  "/menu",
  "/inbox",
  "/reports",
  "/settings",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Carried through every branch below so Supabase's refreshed cookies survive
  // whichever response we end up returning.
  let response = NextResponse.next({ request });
  let supabaseUserId: string | null = null;

  if (isSupabaseConfigured()) {
    ({ response, userId: supabaseUserId } = await updateSession(request, response));
  }

  // ---- The admin panel ----------------------------------------------------
  if (pathname.startsWith("/admin")) {
    // The sign-in screen has to stay reachable, or there is no way back in.
    if (pathname === "/admin/login" || pathname.startsWith("/admin/auth")) {
      return response;
    }

    if (!isSupabaseConfigured()) {
      // Nothing to sign in against. Say so on a real page rather than
      // redirecting to a login form that cannot work.
      return NextResponse.rewrite(new URL("/admin/unavailable", request.url), response);
    }

    if (!supabaseUserId) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login, { headers: response.headers });
    }

    /*
     * Authenticated, but the *role* check happens in the admin layout rather
     * than here. Reading it needs a database query, and doing that in the
     * proxy would add a round trip to every request including static assets.
     * The layout is a Server Component that runs once per navigation and can
     * cache the lookup for the render.
     */
    return response;
  }

  // ---- The product --------------------------------------------------------
  const authEnabled = Boolean(process.env.AUTH_SECRET && process.env.APP_PASSWORD);
  if (!authEnabled) return response;

  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return response;
  }

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (session) return response;

  const login = new URL("/login", request.url);
  // Bring them back where they were headed once they sign in.
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login, { headers: response.headers });
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, static assets and the auth endpoints
     * themselves — the WooCommerce callback must stay reachable
     * unauthenticated, since it is the store calling us, not a browser.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
