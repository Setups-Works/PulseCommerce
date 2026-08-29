/**
 * The public HTTPS address WooCommerce must be able to call this app back
 * on — for two independent server-to-server flows: the app-authorization
 * callback (src/app/api/auth/woo/callback/route.ts, kicked off from
 * src/app/api/auth/woo/start/route.ts) and, since a store's own server has
 * the same "publicly reachable" requirement, webhook registration
 * (src/app/api/whatsapp/order-confirmations/route.ts).
 *
 * Extracted to a shared module rather than imported from a route.ts file:
 * Next's App Router route handlers are meant to export HTTP method handlers
 * and segment config only, not double as a general-purpose module.
 */

/**
 * The address WooCommerce must call back on. Behind a proxy the request host is
 * the internal one, so an explicit APP_URL wins when set.
 */
export function publicAppUrl(request: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  // Vercel exposes the deployment host but not the scheme; it is always HTTPS.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

/**
 * Two independent requirements on an address WooCommerce calls back on:
 *
 *  1. HTTPS — Woo refuses to hand credentials to, or deliver webhooks to, a
 *     plain-HTTP endpoint.
 *  2. Publicly resolvable — the call is server-to-server from the store, so
 *     `localhost` points the store at itself, not at us. Serving the app
 *     over local HTTPS is necessary but not sufficient.
 */
export function describeCallbackProblem(appUrl: string): string | null {
  if (!appUrl.startsWith("https://")) return "https_required";

  let host: string;
  try {
    host = new URL(appUrl).hostname.toLowerCase();
  } catch {
    return "bad_app_url";
  }

  const isLoopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".localhost") ||
    // RFC1918 ranges are reachable on your LAN but not from the store.
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  return isLoopback ? "not_reachable" : null;
}
