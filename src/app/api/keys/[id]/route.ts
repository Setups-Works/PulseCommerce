import { NextResponse } from "next/server";
import { revokeApiKey } from "@/lib/auth/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Revokes a key. Session only, for the reason given in ../route.ts.
 *
 * Revocation is not instant everywhere: the key list is cached in-process for
 * a few seconds on each running instance, so an already-warm one can honour a
 * revoked key until its cache lapses. If a key is known to be compromised,
 * treat the store's credentials as compromised too and re-authorize.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("x-pulse-key-id")) {
    return NextResponse.json(
      {
        error: "API keys cannot be managed with an API key.",
        hint: "Sign in through the dashboard to revoke a key.",
      },
      { status: 403 },
    );
  }

  const { id } = await params;
  const revoked = await revokeApiKey(id);

  if (!revoked) {
    // Same answer for "never existed" and "already revoked": both mean the key
    // is not usable, which is all the caller asked for.
    return NextResponse.json({ error: "No active key with that id." }, { status: 404 });
  }

  return NextResponse.json({ revoked: true });
}
