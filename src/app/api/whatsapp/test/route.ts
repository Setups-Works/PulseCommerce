import { NextResponse } from "next/server";
import { z } from "zod";
import { isSessionSendable, WhatsAppApiError, WhatsAppClient } from "@/lib/whatsapp/client";
import { readWhatsAppConfig } from "@/lib/whatsapp/config";
import { normalisePhone } from "@/lib/whatsapp/phone";
import { readOptOutSet } from "@/lib/whatsapp/opt-out";
import { messageSchema } from "@/lib/whatsapp/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  /** Typed by hand. This endpoint never accepts a customer key or an audience. */
  phone: z.string().min(6),
  message: messageSchema,
});

/**
 * Sends one message to a number the operator typed themselves.
 *
 * Deliberately isolated from the audience machinery: there is no way to reach a
 * customer's number through this route, so testing a template can never
 * accidentally message the customer base. The opt-out list still applies —
 * being a test is not a reason to message someone who asked you to stop.
 */
export async function POST(request: Request) {
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

  const config = await readWhatsAppConfig();
  if (!config) {
    return NextResponse.json(
      { error: "No WhatsApp gateway is connected. Add one in Settings first." },
      { status: 409 },
    );
  }

  const normalised = normalisePhone(parsed.data.phone, {
    defaultDialCode: config.defaultDialCode,
  });
  if (!normalised) {
    return NextResponse.json(
      {
        error: `"${parsed.data.phone}" could not be read as a phone number. Include the country code, for example +91 98765 43210.`,
      },
      { status: 422 },
    );
  }

  if ((await readOptOutSet()).has(normalised.e164)) {
    return NextResponse.json(
      { error: "That number is on the opt-out list and will not be messaged." },
      { status: 409 },
    );
  }

  const client = new WhatsAppClient(config);

  try {
    const session = await client.getSession();
    if (!isSessionSendable(session)) {
      return NextResponse.json(
        {
          error: `The WhatsApp session cannot send right now (status "${session.status}", engine ${session.engineLoaded ? "loaded" : "not loaded"}). Link or restart the number in Settings before sending.`,
        },
        { status: 409 },
      );
    }

    const check = await client.checkNumber(normalised.e164);
    if (!check.exists) {
      return NextResponse.json(
        { error: `${parsed.data.phone} is not registered on WhatsApp.` },
        { status: 422 },
      );
    }

    const chatId = check.whatsappId ?? normalised.chatId;
    const { message } = parsed.data;

    const sent =
      message.type === "image"
        ? await client.sendImage(chatId, message.mediaUrl!, message.text)
        : message.type === "video"
          ? await client.sendVideo(chatId, message.mediaUrl!, message.text)
          : await client.sendText(chatId, message.text);

    return NextResponse.json({ sent: true, ...sent });
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status === 0 ? 502 : error.status },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The message could not be sent." },
      { status: 500 },
    );
  }
}
