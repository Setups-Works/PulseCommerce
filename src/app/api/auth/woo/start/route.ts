import { NextResponse } from "next/server";
import { createState, MissingAuthSecretError } from "@/lib/auth/pending";
import { storageIsDurable } from "@/lib/store/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kicks off the WooCommerce app authorization flow.
 *
 * This is Woo's own key-exchange endpoint (`/wc-auth/v1/authorize`), not OAuth2:
 * the store owner approves the app inside their own WordPress admin, and Woo
 * then issues a REST key and POSTs it to our callback. The upside over pasting
 * keys by hand is that the merchant never handles a secret.
 *
 * Everything that could make the round trip fail is checked here, because the
 * alternative is a merchant approving an app that was never going to work.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const raw = params.get("url");

  const fail = (code: string, detail?: string) =>
    NextResponse.redirect(
      new URL(
        `/?auth=${code}${detail ? `&detected=${encodeURIComponent(detail)}` : ""}`,
        request.url,
      ),
    );

  if (!raw?.trim()) return fail("missing_store_url");

  let storeUrl: string;
  try {
    storeUrl = normalise(raw);
    new URL(storeUrl);
  } catch {
    return fail("bad_store_url");
  }

  // Without durable storage the credentials would arrive and vanish.
  if (!storageIsDurable()) return fail("no_storage");

  const appUrl = publicAppUrl(request);
  const problem = describeCallbackProblem(appUrl);
  if (problem) return fail(problem, appUrl);

  let state: string;
  try {
    state = await createState(storeUrl);
  } catch (error) {
    if (error instanceof MissingAuthSecretError) return fail("missing_auth_secret");
    throw error;
  }

  const authorize = new URL(`${storeUrl}/wc-auth/v1/authorize`);
  authorize.searchParams.set("app_name", "PulseCommerce Analytics");
  /*
   * read_write, for one reason only: creating discount coupons for WhatsApp
   * campaigns. WooCommerce has no finer-grained scope than "read" or
   * "read_write", so there is no way to ask for coupon writes alone.
   *
   * The narrowing is therefore enforced in this codebase rather than by the
   * key: WooClient exposes exactly one mutating method, createCoupon, and no
   * path in the app writes to orders, products, customers or settings. If you
   * do not need generated coupons, set this back to "read" and re-authorize —
   * everything else works unchanged.
   */
  authorize.searchParams.set("scope", "read_write");
  authorize.searchParams.set("user_id", state);
  authorize.searchParams.set("return_url", `${appUrl}/api/auth/woo/return`);
  authorize.searchParams.set("callback_url", `${appUrl}/api/auth/woo/callback`);

  return NextResponse.redirect(authorize.toString());
}

/**
 * Two independent requirements on the address WooCommerce calls back on:
 *
 *  1. HTTPS — Woo refuses to hand credentials to a plain-HTTP endpoint.
 *  2. Publicly resolvable — the callback is a server-to-server POST from the
 *     store, so `localhost` points the store at itself, not at us. Serving the
 *     app over local HTTPS is necessary but not sufficient.
 */
function describeCallbackProblem(appUrl: string): string | null {
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

function normalise(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

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
