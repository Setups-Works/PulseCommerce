import { NextResponse } from "next/server";
import { z } from "zod";
import { publicAppUrl } from "@/lib/woo/app-url";
import { SCOPES } from "@/lib/auth/api-key";
import { startDeviceLogin } from "@/lib/auth/cli-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step one of `pulse login`. Public — there is no key to send yet, that's
 * the entire point of a device-authorization flow.
 */

const schema = z.object({
  scopes: z.array(z.enum(SCOPES)).min(1).optional(),
});

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { deviceCode, userCode, expiresIn, interval } = await startDeviceLogin(
    parsed.data.scopes ?? ["read", "write"],
  );

  return NextResponse.json(
    {
      deviceCode,
      userCode,
      verificationUrl: `${publicAppUrl(request)}/cli-login?user_code=${encodeURIComponent(userCode)}`,
      expiresIn,
      interval,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
