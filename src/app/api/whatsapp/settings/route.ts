import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearWhatsAppConfig,
  DEFAULT_SEND_DELAY_MS,
  MIN_SEND_DELAY_MS,
  normaliseBaseUrl,
  readWhatsAppConfig,
  redactWhatsAppConfig,
  writeWhatsAppConfig,
  type WhatsAppConfig,
} from "@/lib/whatsapp/config";
import { READY_STATUS, WhatsAppApiError, WhatsAppClient } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Connection state, plus the gateway's live view of the session. */
export async function GET() {
  const config = await readWhatsAppConfig();
  if (!config) {
    return NextResponse.json({ connected: false, config: null, session: null });
  }

  let session = null;
  let error: string | null = null;
  try {
    session = await new WhatsAppClient(config).getSession();
  } catch (err) {
    error = err instanceof Error ? err.message : "The gateway could not be reached.";
  }

  return NextResponse.json({
    connected: true,
    config: redactWhatsAppConfig(config),
    session,
    ready: session?.status === READY_STATUS,
    error,
  });
}

const schema = z.object({
  baseUrl: z.string().min(4),
  apiKey: z.string().min(8),
  /** Optional: when absent the only ready session on the gateway is adopted. */
  sessionId: z.string().optional(),
  defaultDialCode: z.string().optional(),
  delayBetweenMessagesMs: z.coerce.number().int().min(MIN_SEND_DELAY_MS).max(60_000).optional(),
});

/**
 * Verifies a gateway before saving it. A connection that cannot answer is worse
 * than none: it would surface as a failed broadcast halfway through a campaign.
 */
export async function PUT(request: Request) {
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

  let baseUrl: string;
  try {
    baseUrl = normaliseBaseUrl(parsed.data.baseUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid gateway URL." },
      { status: 422 },
    );
  }

  const { apiKey } = parsed.data;

  try {
    let sessionId = parsed.data.sessionId?.trim();

    if (!sessionId) {
      // Adopting the session saves the operator copying a UUID by hand, but
      // only when there is no ambiguity about which one they meant.
      const sessions = await new WhatsAppClient({ baseUrl, apiKey, sessionId: "" }).listSessions();
      if (sessions.length === 0) {
        return NextResponse.json(
          {
            error:
              "The gateway has no WhatsApp sessions yet. Create one and link a number in OpenWA, then connect here.",
          },
          { status: 409 },
        );
      }
      const ready = sessions.filter((s) => s.status === READY_STATUS);
      const chosen = ready.length === 1 ? ready[0] : sessions.length === 1 ? sessions[0] : null;
      if (!chosen) {
        return NextResponse.json(
          {
            error: `The gateway has ${sessions.length} sessions. Enter the session ID you want to send from.`,
            sessions: sessions.map((s) => ({ id: s.id, name: s.name, status: s.status })),
          },
          { status: 409 },
        );
      }
      sessionId = chosen.id;
    }

    const session = await new WhatsAppClient({ baseUrl, apiKey, sessionId }).getSession();

    /*
     * The dial code arrives from the client, which already knows the store's
     * currency from the analytics payload it is rendering.
     *
     * It is deliberately NOT inferred from a snapshot here. Doing that made
     * connecting a gateway depend on the WooCommerce order history being
     * cached, and on a cold cache the pull outlived the serverless request —
     * so saving a WhatsApp connection failed for a reason that had nothing to
     * do with WhatsApp.
     */
    const defaultDialCode = (parsed.data.defaultDialCode ?? "").replace(/\D/g, "");

    const config: WhatsAppConfig = {
      baseUrl,
      apiKey,
      sessionId,
      sessionName: session.name,
      phone: session.phone ?? undefined,
      defaultDialCode,
      delayBetweenMessagesMs: parsed.data.delayBetweenMessagesMs ?? DEFAULT_SEND_DELAY_MS,
    };
    await writeWhatsAppConfig(config);

    return NextResponse.json({
      connected: true,
      config: redactWhatsAppConfig(config),
      session,
      ready: session.status === READY_STATUS,
      warning:
        session.status === READY_STATUS
          ? null
          : `The session is "${session.status}", not "ready". Link a number in OpenWA before sending.`,
    });
  } catch (err) {
    if (err instanceof WhatsAppApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status === 0 ? 502 : err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not verify the gateway." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  await clearWhatsAppConfig();
  return NextResponse.json({ connected: false, config: null, session: null });
}
