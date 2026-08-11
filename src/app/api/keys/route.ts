import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiKey, listApiKeys, SCOPES } from "@/lib/auth/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Managing the keys that grant access to this API.
 *
 * Session only. Proxy sets `x-pulse-key-id` when it authenticated a request
 * with an API key, and its presence is what this refuses: a key that can mint
 * keys is a key that cannot meaningfully be revoked, because whoever holds it
 * issues a replacement the moment you revoke it — and a read-only key would
 * become a way to grant itself write access.
 *
 * Issuing a key therefore requires proving control of the store, which means
 * the WooCommerce authorization flow.
 */
function sessionOnly(request: Request): NextResponse | null {
  if (!request.headers.get("x-pulse-key-id")) return null;
  return NextResponse.json(
    {
      error: "API keys cannot be managed with an API key.",
      hint: "Sign in through the dashboard — connecting your WooCommerce store establishes the session this needs.",
    },
    { status: 403 },
  );
}

export async function GET(request: Request) {
  const blocked = sessionOnly(request);
  if (blocked) return blocked;

  return NextResponse.json({ keys: await listApiKeys() });
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Give the key a name.").max(60),
  scopes: z.array(z.enum(SCOPES)).min(1, "Choose at least one scope."),
});

export async function POST(request: Request) {
  const blocked = sessionOnly(request);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { record, key } = await createApiKey(parsed.data.name, parsed.data.scopes);

  /*
   * The only response that will ever contain the key itself. It is not stored
   * in a recoverable form, so there is no endpoint that can return it again —
   * see api-key.ts. The client is responsible for showing it once.
   */
  return NextResponse.json(
    { key, record: { ...record, hash: undefined } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
