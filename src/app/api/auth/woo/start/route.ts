import { NextResponse } from "next/server";
import { createPending } from "@/lib/auth/pending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kicks off the WooCommerce app authorization flow.
 *
 * This is Woo's own key-exchange endpoint (`/wc-auth/v1/authorize`), not OAuth2:
 * the store owner approves the app inside their own WordPress admin, and Woo
 * then issues a REST key and POSTs it to our callback. The upside over pasting
 * keys by hand is that the merchant never handles a secret.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const raw = params.get("url");

  if (!raw) {
    return NextResponse.json({ error: "A store URL is required." }, { status: 400 });
  }

  let storeUrl: string;
  try {
    storeUrl = normalise(raw);
    new URL(storeUrl);
  } catch {
    return NextResponse.json({ error: "That store URL could not be parsed." }, { status: 400 });
  }

  const appUrl = publicAppUrl(request);

  const problem = describeCallbackProblem(appUrl);
  if (problem) {
    // Better to stop here than to let the merchant approve the app in their
    // admin and then watch the credentials never arrive.
    return NextResponse.redirect(
      new URL(`/settings?auth=${problem.code}&detected=${encodeURIComponent(appUrl)}`, request.url),
    );
  }

  const pending = await createPending(storeUrl);

  const authorize = new URL(`${storeUrl}/wc-auth/v1/authorize`);
  authorize.searchParams.set("app_name", "PulseCommerce Analytics");
  authorize.searchParams.set("scope", "read");
  authorize.searchParams.set("user_id", pending.state);
  authorize.searchParams.set("return_url", `${appUrl}/api/auth/woo/return?state=${pending.state}`);
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
function describeCallbackProblem(appUrl: string): { code: string } | null {
  if (!appUrl.startsWith("https://")) return { code: "https_required" };

  let host: string;
  try {
    host = new URL(appUrl).hostname.toLowerCase();
  } catch {
    return { code: "bad_app_url" };
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

  return isLoopback ? { code: "not_reachable" } : null;
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
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = forwardedProto ?? url.protocol.replace(":", "");
  const host = forwardedHost ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}
