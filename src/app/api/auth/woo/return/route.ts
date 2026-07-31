import { NextResponse } from "next/server";
import { consumePending, getPending } from "@/lib/auth/pending";
import { authConfigured, createSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { DEFAULT_HISTORY_MONTHS, DEFAULT_MAX_PAGES, writeStoreConfig } from "@/lib/store/config";
import { invalidateSnapshotCache } from "@/lib/store/snapshot";
import { WooClient } from "@/lib/woo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where the merchant's browser lands after approving (or denying) the app.
 *
 * The credentials arrive on the separate server-to-server callback, so by the
 * time this runs the pending record either has them or the merchant declined.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const state = params.get("state");
  const denied = params.get("success") === "0";

  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!state) return redirect("/settings?auth=missing_state");
  if (denied) {
    await consumePending(state);
    return redirect("/settings?auth=denied");
  }

  // The callback POST and this redirect race; Woo normally sends the callback
  // first, but give it a moment before giving up.
  let pending = await getPending(state);
  for (let attempt = 0; attempt < 10 && !pending?.completed; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    pending = await getPending(state);
  }

  if (!pending) return redirect("/settings?auth=expired");
  if (!pending.completed) return redirect("/settings?auth=no_credentials");

  const config = {
    url: pending.storeUrl,
    consumerKey: pending.completed.consumerKey,
    consumerSecret: pending.completed.consumerSecret,
    historyMonths: DEFAULT_HISTORY_MONTHS,
    maxPages: DEFAULT_MAX_PAGES,
  };

  // Never persist credentials without confirming they actually read the store.
  try {
    await new WooClient(config).testConnection();
  } catch {
    await consumePending(state);
    return redirect("/settings?auth=verification_failed");
  }

  await writeStoreConfig(config);
  invalidateSnapshotCache();
  await consumePending(state);

  const response = redirect("/dashboard?auth=connected");

  // Completing the store authorization is itself proof of access, so it also
  // establishes a session when auth is configured.
  if (authConfigured()) {
    const token = await createSession({ via: "woo-auth", storeUrl: pending.storeUrl });
    response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  }

  return response;
}
