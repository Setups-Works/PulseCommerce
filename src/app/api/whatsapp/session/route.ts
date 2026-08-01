import { NextResponse } from "next/server";
import { READY_STATUS, WhatsAppApiError, WhatsAppClient } from "@/lib/whatsapp/client";
import { readWhatsAppConfig } from "@/lib/whatsapp/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Session state and, while one is on offer, the pairing QR.
 *
 * The QR is proxied rather than linked to directly: fetching it from the
 * browser would mean putting the gateway's API key in a page, and that key can
 * send messages to real customers. Only the rendered image crosses.
 */
export async function GET() {
  const config = await readWhatsAppConfig();
  if (!config) {
    return NextResponse.json({ error: "No WhatsApp gateway is connected." }, { status: 409 });
  }

  const client = new WhatsAppClient(config);

  try {
    const session = await client.getSession();
    const ready = session.status === READY_STATUS;

    // A linked session has no QR to show, and asking for one is pointless work.
    const qr = ready ? { qrCode: null, status: null } : await client.getQr().catch(() => ({
      qrCode: null,
      status: null,
    }));

    return NextResponse.json({ session, ready, qrCode: qr.qrCode, qrStatus: qr.status });
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status === 0 ? 502 : error.status },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the session." },
      { status: 500 },
    );
  }
}

/** Starts the engine so it begins offering a QR. */
export async function POST() {
  const config = await readWhatsAppConfig();
  if (!config) {
    return NextResponse.json({ error: "No WhatsApp gateway is connected." }, { status: 409 });
  }

  const client = new WhatsAppClient(config);

  try {
    const session = await client.startSession();
    // The engine needs a moment before a QR exists; one immediate read here
    // saves the browser a wasted poll.
    const qr =
      session.status === READY_STATUS
        ? { qrCode: null, status: null }
        : await client.getQr().catch(() => ({ qrCode: null, status: null }));

    return NextResponse.json({
      session,
      ready: session.status === READY_STATUS,
      qrCode: qr.qrCode,
      qrStatus: qr.status,
    });
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status === 0 ? 502 : error.status },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start the session." },
      { status: 500 },
    );
  }
}
