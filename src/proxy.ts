import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readPresentedKey, verifyApiKey, type Scope } from "@/lib/auth/api-key";
import { databaseConfigured } from "@/lib/db/client";

/**
 * The single place a request is allowed in.
 *
 * This replaces `middleware.ts`, which Next 16 deprecated. The rename is not
 * cosmetic here: Proxy runs on the Node.js runtime, so this file can reach
 * Postgres directly to verify an API key. On the Edge runtime it could not,
 * and that check would have had to be repeated in twenty-eight route handlers
 * — where the first one anybody forgot would be a silent hole.
 *
 * ─── What it protects ──────────────────────────────────────────────────────
 *
 * Two layers, because they fail differently.
 *
 * The API requires a session or an API key. That is the layer that matters: it
 * is the response carrying the order history, and it is what an attacker would
 * request directly rather than by loading a page.
 *
 * The dashboard pages additionally require a session, and redirect to sign-in
 * without one. That is not what stops data leaking — the API check already
 * does — it is so a signed-out visitor never lands on an application shell
 * full of empty panels and failed requests, wondering what is broken.
 *
 * Marketing pages, sign-in, sign-up and the API reference stay open.
 *
 * ─── Why it also touches cookies ───────────────────────────────────────────
 *
 * Supabase access tokens are short-lived and refreshed against the refresh
 * token. A server component cannot set a cookie, so if the refresh did not
 * happen here it would never be persisted, and every request would arrive with
 * an expired token and re-refresh. This runs before the render and can write,
 * which makes it the right and only place for it.
 */

/**
 * Paths that must stay reachable unauthenticated, and why. Anything not listed
 * needs a session or a key — the default is closed.
 */
const PUBLIC_API = new Set([
  // The store calls this one, not a browser, and it authenticates itself with
  // the signed state we issued — which is also the only thing that says whose
  // account the store attaches to.
  "/api/auth/woo/callback",
  // The browser legs of the connect flow.
  "/api/auth/woo/start",
  "/api/auth/woo/return",
  // Reports whether you are signed in. Gating it would be circular.
  "/api/auth/session",
  // Describes the API's shape. No store data, no credentials — and it is what
  // a developer reads to find out how to authenticate in the first place.
  "/api/openapi",
  // Authenticates with CRON_SECRET itself, checked in the handler. The
  // scheduler has no session and no key.
  "/api/cron/flows",
  "/api/cron/sync",
]);

/**
 * Endpoints that are POSTs but change nothing a merchant would miss.
 *
 * Mapping scope to method alone would demand a write key to export a report,
 * which is wrong: these read and render. Listed rather than inferred, because
 * the list is short and the inference would be wrong in both directions.
 *
 * `/api/ai/chat` is here on the same reasoning — it answers questions about
 * existing data. Note it does bill against GROQ_API_KEY, so a read key can
 * cost money even though it cannot change anything.
 */
const READ_ONLY_POSTS = new Set([
  "/api/reports/export",
  "/api/whatsapp/preview",
  "/api/ai/chat",
]);

function scopeFor(pathname: string, method: string): Scope {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return "read";
  return READ_ONLY_POSTS.has(pathname) ? "read" : "write";
}

function deny(status: number, error: string, hint: string) {
  return NextResponse.json(
    { error, hint, docs: "/api-docs" },
    {
      status,
      // Tells a client library which scheme to retry with, instead of leaving
      // it to guess from a bare 401.
      headers: { "WWW-Authenticate": 'Bearer realm="PulseCommerce API"' },
    },
  );
}

/**
 * Pages that require a session. Everything not listed — marketing, sign-in,
 * sign-up, the API reference — is open.
 */
const PROTECTED_PAGES = [
  "/dashboard",
  "/forecast",
  "/customers",
  "/acquisition",
  "/cohorts",
  "/products",
  "/inventory",
  "/orders",
  "/campaigns",
  "/reports",
  "/settings",
  "/assistant",
  "/inbox",
  "/flows",
  "/menu",
  "/connect",
  "/onboarding",
];

export async function proxy(request: NextRequest) {
  // Carries any refreshed auth cookies, whatever the outcome below.
  const response = NextResponse.next({ request });

  const supabase = createSupabase(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    const isProtected = PROTECTED_PAGES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (!isProtected || user) return response;

    /*
     * Remember where they were headed so signing in returns them there rather
     * than dumping everyone on the dashboard. `next` is read back through a
     * path-only check on the other side — see the auth callback — because a
     * value from a URL is attacker-controllable and an absolute one would turn
     * sign-in into an open redirect.
     */
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (PUBLIC_API.has(pathname)) return response;

  /*
   * Without a database nothing can be verified, and serving the order history
   * to the open internet is not an acceptable failure mode. This is the shape
   * of the bug that put real customer data on a public URL: "misconfigured"
   * must never read the same as "no auth wanted".
   */
  if (!databaseConfigured()) {
    return deny(
      503,
      "This deployment cannot authenticate requests.",
      "SUPABASE_DB_POOL_URL is not set, so sessions and API keys cannot be checked.",
    );
  }

  if (user) return response;

  const presented = readPresentedKey(request.headers);
  if (!presented) {
    return deny(
      401,
      "Authentication required.",
      "Sign in, or send an API key as `Authorization: Bearer pc_live_…`. Create one in Settings → API keys.",
    );
  }

  const key = await verifyApiKey(presented);
  if (!key) {
    return deny(
      401,
      "That API key is not valid.",
      "It may have been revoked, or mistyped. Keys start with `pc_live_`.",
    );
  }

  const needed = scopeFor(pathname, request.method);
  if (!key.scopes.includes(needed)) {
    return deny(
      403,
      `This key does not have the "${needed}" scope.`,
      `"${key.name}" is limited to: ${key.scopes.join(", ")}. Issue a key with the "${needed}" scope to call this endpoint.`,
    );
  }

  return response;
}

/**
 * A Supabase client wired to this request's cookies.
 *
 * `getUser` is what validates the token — never `getSession`, which returns
 * whatever the cookie says without checking it. A cookie is client-controlled,
 * so trusting it would let anyone claim any account.
 */
function createSupabase(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // No Supabase configured: no sessions exist, so every caller falls through
    // to the API-key path below.
    return { auth: { getUser: async () => ({ data: { user: null } }) } } as ReturnType<
      typeof createServerClient
    >;
  }

  return createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static assets. The API is included
     * on purpose — its absence from the old matcher is what left it open.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
