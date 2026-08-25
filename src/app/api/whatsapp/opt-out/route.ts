import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/auth/tenant";
import { z } from "zod";
import { addOptOut, readOptOuts, removeOptOut } from "@/lib/whatsapp/opt-out";
import { readWhatsAppConfig } from "@/lib/whatsapp/config";
import { maskPhone, normalisePhone } from "@/lib/whatsapp/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Numbers excluded from every send. Masked, since this is read in a browser. */
export async function GET(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const entries = await readOptOuts(userId);
  return NextResponse.json({
    optOuts: entries.map((e) => ({ ...e, masked: maskPhone(e.e164) })),
  });
}

const schema = z.object({
  phone: z.string().min(6),
  reason: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

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

  const config = await readWhatsAppConfig(userId);
  const normalised = normalisePhone(parsed.data.phone, {
    defaultDialCode: config?.defaultDialCode ?? "",
  });
  if (!normalised) {
    return NextResponse.json(
      { error: `"${parsed.data.phone}" could not be read as a phone number.` },
      { status: 422 },
    );
  }

  const entries = await addOptOut(userId, normalised.e164, parsed.data.reason);
  return NextResponse.json({
    optOuts: entries.map((e) => ({ ...e, masked: maskPhone(e.e164) })),
  });
}

export async function DELETE(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const phone = new URL(request.url).searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "A phone number is required." }, { status: 400 });

  const config = await readWhatsAppConfig(userId);
  const normalised = normalisePhone(phone, { defaultDialCode: config?.defaultDialCode ?? "" });
  const entries = await removeOptOut(userId, normalised?.e164 ?? phone);
  return NextResponse.json({
    optOuts: entries.map((e) => ({ ...e, masked: maskPhone(e.e164) })),
  });
}
