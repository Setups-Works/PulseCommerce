import { NextResponse } from "next/server";
import { revokeApiKey } from "@/lib/auth/api-key";
import { resolveTenant } from "@/lib/auth/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Revokes a key. Session only, for the reason given in ../route.ts.
 *
 * Revocation is immediate: verification is a single indexed lookup against a
 * partial index that excludes revoked keys, with no cache in front of it, so
 * the next request made with this key fails.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await resolveTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Sign in to manage API keys." }, { status: 401 });
  }
  if (tenant.via === "api-key") {
    return NextResponse.json(
      {
        error: "API keys cannot be managed with an API key.",
        hint: "Sign in through the dashboard to revoke a key.",
      },
      { status: 403 },
    );
  }

  const { id } = await params;
  const revoked = await revokeApiKey(id, tenant.userId);

  if (!revoked) {
    /*
     * One answer for "never existed", "belongs to someone else" and "already
     * revoked". All three mean the same thing to this caller — the key is not
     * usable by them — and distinguishing them would let someone probe for
     * which key ids exist.
     */
    return NextResponse.json({ error: "No active key with that id." }, { status: 404 });
  }

  return NextResponse.json({ revoked: true });
}
