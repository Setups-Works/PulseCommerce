import { NextResponse } from "next/server";
import { createState, MissingAuthSecretError } from "@/lib/auth/pending";
import { resolveTenant } from "@/lib/auth/tenant";
import { databaseConfigured } from "@/lib/db/client";
import { describeCallbackProblem, publicAppUrl } from "@/lib/woo/app-url";

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

  // Without a database the credentials would arrive and vanish.
  if (!databaseConfigured()) return fail("no_storage");

  /*
   * The store is attached to an account, and the callback that delivers the
   * credentials carries no session — so the account has to be established
   * here, while there is one to read, and signed into the state token.
   */
  const tenant = await resolveTenant(request);
  if (!tenant) return fail("not_signed_in");

  const appUrl = publicAppUrl(request);
  const problem = describeCallbackProblem(appUrl);
  if (problem) return fail(problem, appUrl);

  let state: string;
  try {
    state = await createState(storeUrl, tenant.userId);
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

function normalise(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
