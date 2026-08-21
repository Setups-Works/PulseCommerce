import { NextResponse } from "next/server";
import { z } from "zod";
import { pollDeviceLogin } from "@/lib/auth/cli-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step three of `pulse login` — called on the `interval` `start` returned,
 * until the response is no longer "pending". Public, like `start`: the CLI
 * calling this holds a device code, not a key.
 */

const schema = z.object({ deviceCode: z.string().min(1) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A deviceCode is required." }, { status: 400 });
  }

  const result = await pollDeviceLogin(parsed.data.deviceCode);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
