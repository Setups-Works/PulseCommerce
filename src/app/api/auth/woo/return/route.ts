import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/auth/tenant";
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

  if (declined) return redirect("/?auth=denied");

  /*
   * The session already exists — the flow could not have started without one,
   * because the account has to be signed into the state token. All this leg
   * does is find out whether the credentials arrived.
   */
  const tenant = await resolveTenant(request);
  if (!tenant) return redirect("/login?next=/settings");

  // The callback POST and this redirect race. Woo normally sends the callback
  // first, but give it a moment before concluding it never arrived.
  let config = await readStoreConfig(tenant.userId);
  for (let attempt = 0; attempt < 12 && !config; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    config = await readStoreConfig(tenant.userId);
  }

  if (!config) return redirect("/settings?auth=no_credentials");

  // Straight into the first sync: a store with no data behind it looks broken,
  // and the pull is the slow part worth starting immediately.
  return redirect("/onboarding/sync?auth=connected");
}
