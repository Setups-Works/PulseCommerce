import { NextResponse, type NextRequest } from "next/server";
import { readPresentedKey, verifyApiKey, type Scope } from "@/lib/auth/api-key";
import { authConfigured, SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { needsFirstAccount } from "@/lib/auth/users";
import { isServerless } from "@/lib/store/kv";

/**
 * The single place a request is allowed in.
 *
 * This replaces `middleware.ts`, which Next 16 deprecated. The rename is not
 * cosmetic here: Proxy runs on the Node.js runtime, so this file can reach the
 * key store through the same `getStore()` abstraction as everything else,
 * including the filesystem backend a local install uses. On the Edge runtime
 * it could not, and API-key checking would have had to be repeated in all
 * twenty-five route handlers — where the first one anybody forgot would be a
 * silent hole.
 *
 * ─── What this fixes ───────────────────────────────────────────────────────
 *
 * The previous gate had two independent faults, and either alone was enough to
 * leave the API fully public:
 *
 *   1. It armed on `AUTH_SECRET && APP_PASSWORD`. But a password is only one
 *      way in — completing the WooCommerce authorization also mints a session.
 *      A deployment with AUTH_SECRET and no APP_PASSWORD had working sessions
 *      and no gate, which was this deployment.
 *   2. Its protected list named pages only. `/api/analytics` — the whole order
 *      history — was never covered, so even correctly armed it would have
 *      served that to anyone.
 *
 * Both are addressed by gating on `authConfigured()` alone and by treating
 * `/api` as protected by default, with exceptions written down below rather
 * than arrived at by omission.
 */

/**
 * Paths that must stay reachable unauthenticated, and why. Anything not listed
 * here needs a session or a key — the default is closed.
 */
const PUBLIC_API = new Set([
  // The store calls this one, not a browser, and it authenticates itself with
  // the signed `user_id` state we issued. It cannot carry our session.
  "/api/auth/woo/callback",
  // The two browser legs of the connect flow. By definition they run before
  // there is anything to authenticate with.
  "/api/auth/woo/start",
  "/api/auth/woo/return",
  // Establishes and clears the session; gating it would be circular.
  "/api/auth/session",
  // Self-gating: open only while the deployment has no owner, and thereafter
  // it requires a session of its own. See the handler.
  "/api/auth/register",
  // Describes the API's shape. No store data, no credentials — and it is what
  // a developer reads to find out how to authenticate in the first place.
  "/api/openapi",
  // Checks a bearer token against CRON_SECRET itself, and the scheduler has no
  // session. Verified in the handler, not skipped.
  "/api/cron/flows",
]);

/** Pages that require a session. Everything else is public marketing. */
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
];

/**
 * Endpoints that are POSTs but change nothing a merchant would miss.
 *
 * Mapping scope to HTTP method alone would demand a write key to export a
 * report, which is wrong: these read the store and render something. They are
 * listed rather than inferred because the list is short and the inference
 * would be wrong in both directions.
 *
 * `/api/ai/chat` is included on the same reasoning — it answers questions
 * about existing data. Note that it does bill against GROQ_API_KEY, so a read
 * key can cost money even though it cannot change anything.
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
      // Tells a client library which scheme to retry with instead of leaving it
      // to guess from a bare 401.
      headers: { "WWW-Authenticate": 'Bearer realm="PulseCommerce API"' },
    },
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) return gateApi(request, pathname);

  const isProtected = PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  // With no AUTH_SECRET there are no sessions to check, so a local `git clone`
  // and `npm run dev` still opens straight onto the dashboard.
  if (!authConfigured()) return NextResponse.next();

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (session) return NextResponse.next();

  /*
   * A deployment nobody has claimed yet sends you to create the first account
   * rather than to a sign-in form with no account to sign in to. A storage
   * failure resolves to the sign-in form: it is the safe direction, since
   * /signup refuses on the same error anyway.
   */
  let unclaimed = false;
  try {
    unclaimed = await needsFirstAccount();
  } catch {
    unclaimed = false;
  }

  const destination = new URL(unclaimed ? "/signup" : "/login", request.url);
  destination.searchParams.set("next", pathname);
  return NextResponse.redirect(destination);
}

async function gateApi(request: NextRequest, pathname: string) {
  if (PUBLIC_API.has(pathname)) return NextResponse.next();

  /*
   * A hosted deployment with no AUTH_SECRET cannot verify anything, so it
   * refuses rather than serving the order history to the open internet. This
   * is the failure mode that put real customer data on a public URL, and
   * "misconfigured" must not read the same as "no auth wanted".
   *
   * Locally it stays open: no AUTH_SECRET on a dev machine means clone-and-run.
   */
  if (!authConfigured()) {
    if (!isServerless()) return NextResponse.next();
    return deny(
      503,
      "This deployment cannot authenticate requests.",
      "AUTH_SECRET is not set, so sessions and API keys cannot be verified. Generate one with `openssl rand -hex 32`, set it on the host, and redeploy.",
    );
  }

  // The dashboard's own fetches. Same session the pages use.
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (session) return NextResponse.next();

  const presented = readPresentedKey(request.headers);
  if (!presented) {
    return deny(
      401,
      "Authentication required.",
      "Send an API key as `Authorization: Bearer pc_live_…`. Create one in Settings → API keys.",
    );
  }

  const key = await verifyApiKey(presented);
  if (!key) {
    return deny(401, "That API key is not valid.", "It may have been revoked, or mistyped. Keys start with `pc_live_`.");
  }

  const needed = scopeFor(pathname, request.method);
  if (!key.scopes.includes(needed)) {
    return deny(
      403,
      `This key does not have the "${needed}" scope.`,
      `"${key.name}" is limited to: ${key.scopes.join(", ")}. Issue a key with the "${needed}" scope to call this endpoint.`,
    );
  }

  /*
   * Pass the caller's identity to the handler. Anything already carrying these
   * names is stripped first — they arrive from the public internet, and a
   * handler must not be able to be told who it is talking to by the request
   * itself.
   */
  const headers = new Headers(request.headers);
  headers.delete("x-pulse-key-id");
  headers.delete("x-pulse-scopes");
  headers.set("x-pulse-key-id", key.id);
  headers.set("x-pulse-scopes", key.scopes.join(","));

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static assets. The API is included
     * on purpose — its absence here is what left it open.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
