import { NextResponse } from "next/server";
import { z } from "zod";
import { isSessionSendable, WhatsAppApiError, WhatsAppClient } from "@/lib/whatsapp/client";
import { readWhatsAppConfig } from "@/lib/whatsapp/config";
import { readOptOutSet } from "@/lib/whatsapp/opt-out";
import { normalisePhone } from "@/lib/whatsapp/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Messages in one conversation, oldest first for rendering. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  const config = await readWhatsAppConfig();
  if (!config) {
    return NextResponse.json({ error: "No WhatsApp gateway is connected." }, { status: 409 });
  }

  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit")) || 60, 200);

  try {
    const messages = await new WhatsAppClient(config).getMessages(decodeURIComponent(chatId), limit);
    return NextResponse.json({
      messages: [...messages].sort((a, b) => a.timestamp - b.timestamp),
    });
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status === 0 ? 502 : error.status },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the conversation." },
      { status: 500 },
    );
  }
}

const schema = z.object({
  type: z.enum(["text", "image", "video"]).default("text"),
  text: z.string().min(1).max(4000),
  mediaUrl: z.string().url().optional(),
});

/**
 * Replies in a conversation.
 *
 * One-to-one, so no audience machinery is involved — but the opt-out list still
 * applies. Someone who asked to stop hearing from the business asked the
 * business, not one campaign, and a reply window is not a loophole.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId: rawParam } = await params;
  const raw = decodeURIComponent(rawParam);

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
  if (parsed.data.type !== "text" && !parsed.data.mediaUrl) {
    return NextResponse.json(
      { error: "An image or video message needs a publicly reachable media URL." },
      { status: 422 },
    );
  }

  const config = await readWhatsAppConfig();
  if (!config) {
    return NextResponse.json({ error: "No WhatsApp gateway is connected." }, { status: 409 });
  }

  // A bare number is accepted so a new conversation can be started by typing
  // one; anything already addressed is left alone.
  const chatId = raw.includes("@")
    ? raw
    : (normalisePhone(raw, { defaultDialCode: config.defaultDialCode })?.chatId ?? "");
  if (!chatId) {
    return NextResponse.json(
      { error: `"${raw}" could not be read as a phone number.` },
      { status: 422 },
    );
  }

  const digits = chatId.split("@")[0];
  if ((await readOptOutSet()).has(digits)) {
    return NextResponse.json(
      { error: "That number is on the opt-out list and will not be messaged." },
      { status: 409 },
    );
  }

  const client = new WhatsAppClient(config);

  try {
    const session = await client.ensureSendable();
    if (!isSessionSendable(session)) {
      return NextResponse.json(
        {
          error: `The WhatsApp session cannot send right now (status "${session.status}", engine ${session.engineLoaded ? "loaded" : "not loaded"}).`,
        },
        { status: 409 },
      );
    }

    const { type, text, mediaUrl } = parsed.data;
    const sent =
      type === "image"
        ? await client.sendImage(chatId, mediaUrl!, text)
        : type === "video"
          ? await client.sendVideo(chatId, mediaUrl!, text)
          : await client.sendText(chatId, text);

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
