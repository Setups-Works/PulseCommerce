import { NextResponse } from "next/server";
import { authConfigured, createSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { readStoreConfig } from "@/lib/store/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where the merchant's browser lands after approving (or declining) the app.
 *
 * The credentials arrive on the separate server-to-server callback, which also
 * persists them, so all this leg has to do is find out whether that happened.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const declined = params.get("success") === "0";

  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (declined) return redirect("/connect?auth=denied");

  // The callback POST and this redirect race. Woo normally sends the callback
  // first, but give it a moment before concluding it never arrived.
  let config = await readStoreConfig();
  for (let attempt = 0; attempt < 12 && !config; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    config = await readStoreConfig();
  }

  if (!config) return redirect("/connect?auth=no_credentials");

  const response = redirect("/dashboard?auth=connected");

  // Completing the store authorization is itself proof of access, so it also
  // establishes a session when auth is configured.
  if (authConfigured()) {
    const token = await createSession({ via: "woo-auth", storeUrl: config.url });
    response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  }

  return response;
}
