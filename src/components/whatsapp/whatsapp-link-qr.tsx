"use client";

import { CheckCircle2, Loader2, QrCode, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SessionPayload {
  session?: { status: string; phone: string | null; pushName: string | null };
  ready?: boolean;
  qrCode?: string | null;
  qrStatus?: string | null;
  error?: string;
}

/**
 * Links a WhatsApp number by showing the gateway's pairing QR in place.
 *
 * The QR rotates every few seconds and is only offered while a session is
 * unauthenticated, so this polls rather than fetching once: the image is
 * refreshed on a timer, and the same poll notices the moment the scan lands and
 * stops on its own.
 */
export function WhatsAppLinkQr({ onLinked }: { onLinked?: () => void }) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const poll = useCallback(
    (firstRun: boolean) => {
      // Recursion goes through this local function rather than the callback's
      // own binding, which is not in scope while it is being declared.
      const run = async (isFirst: boolean) => {
      try {
        // The first call starts the engine; later ones only read, so a refresh
        // never restarts a session that is mid-handshake.
        const res = await fetch("/api/whatsapp/session", {
          method: isFirst ? "POST" : "GET",
          cache: "no-store",
        });
        const body = (await res.json()) as SessionPayload;

        if (!res.ok) {
          toast.error(body.error ?? "Could not reach the gateway.");
          setBusy(false);
          return;
        }

        setStatus(body.session?.status ?? null);

        if (body.ready) {
          setLinked(true);
          setQrCode(null);
          setBusy(false);
          stop();
          toast.success(
            body.session?.phone ? `Linked to ${body.session.phone}.` : "WhatsApp number linked.",
          );
          onLinked?.();
          return;
        }

        if (body.qrCode) setQrCode(body.qrCode);
        setBusy(false);

        /*
         * No QR and not linked means the engine is stopped — the gateway
         * answers "Session is not started" and there is nothing to render, so
         * the panel would otherwise spin forever. Re-running with a start
         * request boots it and a QR appears on the following pass.
         */
        const stalled = !body.ready && !body.qrCode;

        // Faster than the QR's own rotation, so the image on screen is always
        // one WhatsApp will still accept.
        timer.current = setTimeout(() => void run(stalled), 4000);
      } catch {
        setBusy(false);
        timer.current = setTimeout(() => void run(false), 8000);
      }
      };
      void run(firstRun);
    },
    [onLinked, stop],
  );

  const begin = () => {
    setOpen(true);
    setBusy(true);
    setLinked(false);
    poll(true);
  };

  if (linked) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5" />
        Number linked. Reload to refresh the connection details.
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={begin} className="gap-1.5">
        <QrCode className="size-4" />
        Link a number
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Scan with WhatsApp</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            stop();
            setBusy(true);
            poll(false);
          }}
          className="gap-1.5"
          disabled={busy}
        >
          <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
        <div className="flex size-[200px] shrink-0 items-center justify-center rounded-md border bg-white">
          {qrCode ? (
            <Image
              // A data URL is already the final bytes; optimising it would mean
              // round-tripping an image that changes every few seconds.
              unoptimized
              src={qrCode}
              alt="WhatsApp pairing QR code"
              width={192}
              height={192}
              className="size-[192px]"
            />
          ) : (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          )}
        </div>

        <ol className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
          <li>1. Open WhatsApp on the phone you send from.</li>
          <li>2. Settings → Linked Devices → Link a Device.</li>
          <li>3. Scan this code. It refreshes by itself while you look.</li>
          {status ? <li className="pt-1 font-mono">session: {status}</li> : null}
        </ol>
      </div>
    </div>
  );
}
