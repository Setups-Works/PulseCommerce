import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/tenant";
import {
  sendCloudTemplateMessage,
  sendCloudTextMessage,
  WhatsAppCloudApiError,
} from "@/lib/whatsapp-cloud/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  to: z.string().min(6),
  message: z.string().min(1).max(4096).optional(),
  // "template" reliably delivers business-initiated with no open-window
  // requirement (confirmed the hard way -- a "text" send outside an open
  // 24h window returns a real message id from Meta but is never actually
  // delivered). Defaults to template for exactly that reason.
  mode: z.enum(["template", "text"]).default("template"),
});

/**
 * PUL-16 pilot: one real send through Meta's Cloud API, using the temporary
 * test token and test business number from the App Dashboard. Not the
 * merchant-facing send path -- that's PUL-18, gated on the billing decision
 * and template workflow. This exists so App Review has a real, working
 * whatsapp_business_messaging call to review, not a mock.
 *
 * Deliberately no audience/customer-key input, same reasoning as
 * /api/whatsapp/test: this can only ever message a number typed by the
 * operator, never a customer pulled from store data.
 */
export async function POST(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 422 },
    );
  }

  if (parsed.data.mode === "text" && !parsed.data.message) {
    return NextResponse.json({ error: "message is required for a text send." }, { status: 422 });
  }

  try {
    const sent =
      parsed.data.mode === "template"
        ? await sendCloudTemplateMessage(parsed.data.to)
        : await sendCloudTextMessage(parsed.data.to, parsed.data.message!);
    return NextResponse.json({ sent: true, messageId: sent.messageId, mode: parsed.data.mode });
  } catch (error) {
    const message =
      error instanceof WhatsAppCloudApiError ? error.message : "The Cloud API rejected the send.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
