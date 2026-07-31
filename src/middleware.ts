import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Gates the dashboard when the deployment has auth switched on.
 *
 * Auth is opt-in: with no AUTH_SECRET and no APP_PASSWORD the app runs open,
 * which is what makes "clone and run" work. Set both and every analytics route
 * requires a session.
 */
const PROTECTED = [
  "/dashboard",
  "/forecast",
  "/customers",
  "/acquisition",
  "/companies",
  "/cohorts",
  "/products",
  "/orders",
  "/campaigns",
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
