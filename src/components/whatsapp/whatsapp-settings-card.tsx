"use client";

import { CheckCircle2, Loader2, MessageCircle, ShieldCheck, TriangleAlert, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnalytics } from "@/components/providers/analytics-provider";
import { WhatsAppLinkQr } from "@/components/whatsapp/whatsapp-link-qr";
import { dialCodeForCurrency } from "@/lib/whatsapp/phone";
import { formatDateTime } from "@/lib/format";

interface RedactedWhatsApp {
  baseUrl: string;
  sessionId: string;
  sessionName: string | null;
  phone: string | null;
  apiKey: string;
  defaultDialCode: string;
  delayBetweenMessagesMs: number;
  updatedAt: string | null;
}

interface SessionState {
  id: string;
  name: string;
  status: string;
  phone: string | null;
  pushName: string | null;
}

interface SettingsResponse {
  connected: boolean;
  /** Set from WHATSAPP_API_URL / WHATSAPP_API_KEY rather than through this form. */
  fromEnv?: boolean;
  config: RedactedWhatsApp | null;
  session: SessionState | null;
  ready?: boolean;
  error?: string | null;
  warning?: string | null;
}

/**
 * Connects a self-hosted OpenWA gateway.
 *
 * The API key is entered once and never comes back to the browser: the server
 * verifies it against the gateway before saving, and afterwards this shows only
 * a masked form of it, the same as the WooCommerce credentials above.
 */
export function WhatsAppSettingsCard() {
  const [state, setState] = useState<SettingsResponse | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [busy, setBusy] = useState(false);

  /*
   * The store's currency is already in the browser, so the country code is
   * suggested from here rather than looked up on the server. An earlier version
   * inferred it from the order snapshot during connect, which meant a cold
   * cache turned a WhatsApp connection into a multi-minute WooCommerce pull and
   * timed the request out.
   */
  const { data } = useAnalytics();
  const suggestedDialCode = data ? dialCodeForCurrency(data.meta.currency) : "";
  const effectiveDialCode = dialCode.trim() || suggestedDialCode;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/settings", { cache: "no-store" });
      const body = (await res.json()) as SettingsResponse;
      setState(body);
      if (body.config) setBaseUrl(body.config.baseUrl);
    } catch {
      setState({ connected: false, config: null, session: null });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const connect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          apiKey,
          ...(sessionId.trim() ? { sessionId: sessionId.trim() } : {}),
          defaultDialCode: effectiveDialCode,
        }),
      });
      const body = (await res.json()) as SettingsResponse & { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "The gateway could not be verified.");
        return;
      }
      setState(body);
      setApiKey("");
      setSessionId("");
      if (body.warning) toast.warning(body.warning);
      else toast.success("WhatsApp gateway connected.");
    } catch {
      toast.error("The connection request failed.", {
        description:
          "This app could not complete the request. Check the browser network tab — the gateway itself may be fine.",
      });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch("/api/whatsapp/settings", { method: "DELETE" });
      setState({ connected: false, config: null, session: null });
      toast.success("WhatsApp gateway disconnected.");
    } finally {
      setBusy(false);
    }
  };

  const session = state?.session;
  const ready = state?.ready ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="size-4 text-muted-foreground" />
              WhatsApp gateway
            </CardTitle>
            <CardDescription className="text-xs">
              A self-hosted OpenWA instance. Campaigns send through it; this app never
              connects to WhatsApp directly.
            </CardDescription>
          </div>
          {state?.fromEnv ? (
            <Badge variant="outline" className="shrink-0 gap-1">
              <ShieldCheck className="size-3" />
              From environment
            </Badge>
          ) : null}
          {state?.connected ? (
            <Badge variant={ready ? "default" : "secondary"} className="shrink-0 gap-1">
              {ready ? <CheckCircle2 className="size-3" /> : <TriangleAlert className="size-3" />}
              {ready ? "Ready" : (session?.status ?? "Unreachable")}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {state?.error ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle className="text-xs font-medium">Gateway unreachable</AlertTitle>
            <AlertDescription className="text-xs">{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {state?.connected && state.config ? (
          <div className="space-y-4">
          <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            <Row label="Gateway" value={state.config.baseUrl} />
            <Row label="API key" value={state.config.apiKey} mono />
            <Row label="Session" value={state.config.sessionName ?? state.config.sessionId} />
            {/*
              The gateway keeps `phone` on the session after a connection
              drops, so it is the last number paired rather than a live one.
              Labelling that "Linked number" reads as connected when it is not.
            */}
            <Row
              label={ready ? "Linked number" : "Last linked"}
              value={
                session?.phone ?? state.config.phone
                  ? `${session?.phone ?? state.config.phone}${ready ? "" : " · not connected"}`
                  : "never linked"
              }
              mono
            />
            <Row
              label="Default country code"
              value={state.config.defaultDialCode ? `+${state.config.defaultDialCode}` : "not set"}
            />
            <Row
              label="Pace"
              value={`${(state.config.delayBetweenMessagesMs / 1000).toFixed(1)}s between messages`}
            />
            {state.config.updatedAt ? (
              <Row label="Connected" value={formatDateTime(state.config.updatedAt)} />
            ) : null}
          </dl>

          {!ready ? <WhatsAppLinkQr onLinked={load} /> : null}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="wa-url">Gateway URL</Label>
              <Input
                id="wa-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://wa.yourdomain.com"
                autoComplete="url"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-key">API key</Label>
              <Input
                id="wa-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="operator key from OpenWA"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-session">
                Session ID <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="wa-session"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="adopted automatically if only one"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-dial">Default country code</Label>
              <Input
                id="wa-dial"
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                placeholder={suggestedDialCode ? `${suggestedDialCode} (from ${data?.meta.currency})` : "91"}
                inputMode="numeric"
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Applied to customer numbers stored without one. Getting this wrong sends to
                the wrong country, so it is worth checking.
              </p>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground sm:col-span-2">
              Use an <strong>operator</strong> key rather than your admin key — sending is all
              this needs. The key is verified against the gateway before it is saved, and is
              never sent back to the browser afterwards.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 border-t pt-4">
        {state?.fromEnv ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Set by <code>WHATSAPP_API_URL</code> and <code>WHATSAPP_API_KEY</code> on the host.
            Change them there and redeploy; this connection cannot be edited or removed here,
            which is what stops it being lost by accident.
          </p>
        ) : state?.connected ? (
          <Button variant="outline" size="sm" onClick={disconnect} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Unplug className="size-4" />}
            Disconnect
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={connect}
            disabled={busy || baseUrl.trim().length < 4 || apiKey.trim().length < 8}
            className="gap-1.5"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Connect gateway
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-[11px]" : ""}>{value}</dd>
    </div>
  );
}
