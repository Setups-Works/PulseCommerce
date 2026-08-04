import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Gates the dashboard when the deployment has auth switched on.
 *
 * Auth is opt-in: with no AUTH_SECRET and no APP_PASSWORD the app runs open,
 * which is what makes "clone and run" work. Set both and every analytics route
 * requires a session.
 */
/**
 * Every route behind the sidebar.
 *
 * This list has to match the app's routes exactly — a page that exists but is
 * missing here is served to anybody who knows the URL, which is how
 * `/assistant`, `/flows`, `/inbox` and `/menu` were reachable unauthenticated.
 * If you add a route under `(app)`, add it here in the same commit.
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

export async function middleware(request: NextRequest) {
  const authEnabled = Boolean(process.env.AUTH_SECRET && process.env.APP_PASSWORD);
  if (!authEnabled) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (session) return NextResponse.next();

  const login = new URL("/login", request.url);
  // Bring them back where they were headed once they sign in.
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, static assets and the auth endpoints
     * themselves — the WooCommerce callback must stay reachable unauthenticated,
     * since it is the store calling us, not a browser.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
