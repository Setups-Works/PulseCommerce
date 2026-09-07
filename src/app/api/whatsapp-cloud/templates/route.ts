import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/auth/tenant";
import { listCloudMessageTemplates, WhatsAppCloudApiError } from "@/lib/whatsapp-cloud/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUL-16 pilot: lists message templates on the test WABA, using
 * whatsapp_business_management. See test-send/route.ts's own comment for
 * why this exists as a real, minimal, working call rather than nothing --
 * App Review needs to see each permission actually exercised by the app.
 */
export async function GET(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;

  try {
    const templates = await listCloudMessageTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    const message =
      error instanceof WhatsAppCloudApiError ? error.message : "Could not list message templates.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
