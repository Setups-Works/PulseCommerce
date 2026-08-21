import { NextResponse } from "next/server";
import { z } from "zod";
import { approveDeviceLogin, denyDeviceLogin } from "@/lib/auth/cli-login";
import { resolveTenant } from "@/lib/auth/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step two of `pulse login` — the human in the browser approving or denying
 * the code their terminal printed. Session only, the same reasoning as
 * `/api/keys`: an API key must not be able to mint a login for itself or
 * anyone else, so this requires proving control of the account directly.
 */

const schema = z.object({
  userCode: z.string().min(1),
  action: z.enum(["approve", "deny"]),
});

export async function POST(request: Request) {
  const tenant = await resolveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Sign in to approve a CLI login." }, { status: 401 });
  }
  if (tenant.via === "api-key") {
    return NextResponse.json(
      { error: "A CLI login cannot be approved with an API key.", hint: "Open this page signed in through the dashboard." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A userCode and action are required." }, { status: 400 });
  }

  const ok =
    parsed.data.action === "approve"
      ? await approveDeviceLogin(parsed.data.userCode, tenant.userId)
      : await denyDeviceLogin(parsed.data.userCode);

  if (!ok) {
    return NextResponse.json(
      { error: "That code has already been used, denied, or has expired." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
