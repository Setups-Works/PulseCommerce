import { NextResponse } from "next/server";
import { z } from "zod";
import { completePending } from "@/lib/auth/pending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-to-server callback from WooCommerce carrying the freshly issued REST
 * key. This is called by the store, not the browser, so there is no session
 * here — the `user_id` we set when starting the flow is our state token, and it
 * is the only thing tying this delivery to the browser that requested it.
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

  const { user_id: state, consumer_key, consumer_secret, key_permissions } = parsed.data;

  const pending = await completePending(state, {
    consumerKey: consumer_key,
    consumerSecret: consumer_secret,
    keyPermissions: key_permissions ?? "read",
  });

  if (!pending) {
    // Unknown or expired state: refuse rather than store credentials we cannot
    // attribute to a request we started.
    return NextResponse.json({ success: false, error: "Unknown or expired authorization." }, { status: 400 });
  }

  // Woo only checks for a 200; the body is ignored.
  return NextResponse.json({ success: true });
}
