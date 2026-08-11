import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiKey, listApiKeys, SCOPES } from "@/lib/auth/api-key";
import { resolveTenant } from "@/lib/auth/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The keys that grant access to this API.
 *
 * Session only. A key that can mint keys cannot meaningfully be revoked —
 * whoever holds it issues a replacement the moment you revoke it — and a
 * read-only key would become a way to grant itself write access. So managing
 * keys requires being signed in, which means proving control of the account
 * rather than merely holding one of its credentials.
 */
async function requireSession() {
  const tenant = await resolveTenant();
  if (!tenant) {
    return {
      tenant: null,
      response: NextResponse.json(
        { error: "Sign in to manage API keys.", hint: "Open Settings → API keys while signed in." },
        { status: 401 },
      ),
    };
  }
  if (tenant.via === "api-key") {
    return {
      tenant: null,
      response: NextResponse.json(
        {
          error: "API keys cannot be managed with an API key.",
          hint: "Sign in through the dashboard instead.",
        },
        { status: 403 },
      ),
    };
  }
  return { tenant, response: null };
}

export async function GET() {
  const { tenant, response } = await requireSession();
  if (!tenant) return response;

  return NextResponse.json({ keys: await listApiKeys(tenant.userId) });
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Give the key a name.").max(60),
  scopes: z.array(z.enum(SCOPES)).min(1, "Choose at least one scope."),
});

export async function POST(request: Request) {
  const { tenant, response } = await requireSession();
  if (!tenant) return response;

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

  const { record, key } = await createApiKey(parsed.data.name, parsed.data.scopes, tenant.userId);

  /*
   * The only response that will ever carry the key. Only a digest is stored,
   * so no endpoint can return it again — the client has to show it once and
   * the person has to copy it.
   */
  return NextResponse.json(
    { key, record },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
