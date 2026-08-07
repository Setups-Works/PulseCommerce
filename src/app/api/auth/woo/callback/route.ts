import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyState } from "@/lib/auth/pending";
import { DEFAULT_HISTORY_MONTHS, DEFAULT_MAX_PAGES, upsertStore } from "@/lib/store/config";
import { WooClient } from "@/lib/woo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-to-server callback from WooCommerce carrying the freshly issued key.
 *
 * This is called by the store, not the browser, so there is no session here.
 * The `user_id` we set when starting the flow is a signed token carrying the
 * store URL, and verifying it is what stops anyone POSTing arbitrary
 * credentials at this endpoint.
 *
 * The connection is persisted *here* rather than on the browser's return leg,
 * because on serverless the two legs can land on different instances.
 */
const schema = z.object({
  key_id: z.number().optional(),
  user_id: z.string(),
  consumer_key: z.string().min(10),
  consumer_secret: z.string().min(10),
  key_permissions: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Unexpected callback payload." }, { status: 400 });
  }

  const { user_id: state, consumer_key, consumer_secret } = parsed.data;

  const verified = await verifyState(state);
  const storeUrl = verified?.storeUrl ?? null;
  if (!storeUrl) {
    return NextResponse.json(
      { success: false, error: "Unknown or expired authorization." },
      { status: 400 },
    );
  }

  const config = {
    url: storeUrl,
    consumerKey: consumer_key,
    consumerSecret: consumer_secret,
    historyMonths: DEFAULT_HISTORY_MONTHS,
    maxPages: DEFAULT_MAX_PAGES,
  };

  // Never persist credentials without confirming they can actually read the
  // store, and capture its name while we are there.
  let storeName: string | undefined;
  try {
    const meta = await new WooClient(config).testConnection();
    storeName = meta.storeName;
  } catch {
    return NextResponse.json(
      { success: false, error: "The issued key could not read the store." },
      { status: 400 },
    );
  }

  try {
    /*
     * Attributed to the organization carried in the signed state token, not to
     * a session — there is none on this leg. `upsertStoreForOrganization` uses
     * the service-role client for the same reason, which is safe precisely
     * because the organization came from a token we signed and verified rather
     * than from anything the caller supplied.
     *
     * No organization means a self-hosted deployment, where the key/value path
     * is correct and single-tenant by design.
     */
    if (verified?.organizationId) {
      const { upsertStoreForOrganization } = await import("@/repositories/store-repository");
      const saved = await upsertStoreForOrganization(verified.organizationId, {
        ...config,
        name: storeName,
      });
      if (!saved) throw new Error("The connection could not be saved for that account.");
    } else {
      await upsertStore({ ...config, name: storeName });
    }
  } catch (error) {
    console.error("[woo-auth] could not persist the connection", error);
    return NextResponse.json({ success: false, error: "Could not persist the connection." }, { status: 500 });
  }

  // Woo only checks for a 200; the body is ignored.
  return NextResponse.json({ success: true });
}
