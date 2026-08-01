"use client";

import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  ShieldAlert,
  Square,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { AudienceFilter } from "@/lib/audience";

interface Preview {
  matched: number;
  deliverable: number;
  skipped: { noPhone: number; unparseable: number; optedOut: number; duplicate: number };
  sample: string[];
  preview: string | null;
  estimatedMs: number;
  delayBetweenMessagesMs: number;
}

interface Progress {
  id: string;
  status: "sending" | "paused" | "completed" | "cancelled" | "failed";
  total: number;
  handedOff: number;
  remaining: number;
  percent: number;
  error: string | null;
  estimatedMsRemaining: number;
  waiting?: boolean;
  retryAfterMs?: number;
}

/**
 * Sends the current audience a WhatsApp message.
 *
 * The order of the controls is the safety model: you cannot reach the send
 * button without first resolving the real recipient list, and the confirmation
 * requires typing the count you were shown. A test send is available throughout
 * and only ever goes to a number typed by hand, so a template can be checked
 * without touching the customer base.
 */
export function WhatsAppSendPanel({
  filter,
  range,
  audienceSize,
}: {
  filter: AudienceFilter;
  range?: { from: string; to: string };
  audienceSize: number;
}) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  const [type, setType] = useState<"text" | "image" | "video">("text");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");

  const [previewState, setPreviewState] = useState<{ sig: string; data: Preview } | null>(null);
  const [confirmValue, setConfirmValue] = useState("");
  const [testPhone, setTestPhone] = useState("");

  const [busy, setBusy] = useState<null | "preview" | "test" | "start">(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void (async () => {
      try {
        const res = await fetch("/api/whatsapp/settings", { cache: "no-store" });
        const body = await res.json();
        setConnected(Boolean(body.connected));
        setReady(Boolean(body.ready));
      } catch {
        setConnected(false);
      }
    })();
  }, []);

  const message = { type, text, ...(type === "text" ? {} : { mediaUrl }) };

  /*
   * Any change to the audience or the message invalidates the preview, because
   * the confirmation has to refer to the list actually about to be sent. This
   * is derived rather than reset in an effect, so there is no render where a
   * stale count is on screen next to a live send button.
   */
  const signature = JSON.stringify({ filter, range, type, text, mediaUrl });
  const preview = previewState?.sig === signature ? previewState.data : null;
  const composed = text.trim().length > 0 && (type === "text" || mediaUrl.trim().length > 0);

  const runPreview = async () => {
    setBusy("preview");
    try {
      const res = await fetch("/api/whatsapp/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter, range, message }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "The audience could not be resolved.");
        return;
      }
      setPreviewState({ sig: signature, data: body as Preview });
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("test");
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "The test message could not be sent.");
        return;
      }
      toast.success(`Test sent to ${testPhone}.`);
    } finally {
      setBusy(null);
    }
  };

  const tick = useCallback((id: string) => {
    const run = async () => {
      try {
        const res = await fetch(`/api/whatsapp/broadcast/${id}`, { method: "POST" });
        const body = (await res.json()) as Progress;
        setProgress(body);

        if (body.status === "sending") {
          // Wait out the batch the gateway is still pacing through rather than
          // hammering it; the server says how long that is.
          const wait = body.waiting ? (body.retryAfterMs ?? 15_000) : 5_000;
          timer.current = setTimeout(run, Math.min(wait, 60_000));
        } else if (body.status === "completed") {
          toast.success("Broadcast complete.");
        } else if (body.status === "failed") {
          toast.error(body.error ?? "The broadcast failed.");
        }
      } catch {
        timer.current = setTimeout(run, 15_000);
      }
    };
    void run();
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const start = async () => {
    if (!preview) return;
    setBusy("start");
    try {
      const res = await fetch("/api/whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter, range, message, confirm: preview.deliverable }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "The broadcast could not be started.");
        return;
      }
      setProgress(body as Progress);
      tick(body.id);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!progress) return;
    if (timer.current) clearTimeout(timer.current);
    const res = await fetch(`/api/whatsapp/broadcast/${progress.id}`, { method: "DELETE" });
    setProgress((await res.json()) as Progress);
    toast.info("Broadcast stopped. Messages already handed to the gateway will still go out.");
  };

  if (connected === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle className="size-4 text-muted-foreground" />
            Send on WhatsApp
          </CardTitle>
          <CardDescription className="text-xs">
            No gateway is connected yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings">Connect a WhatsApp gateway</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const running = progress?.status === "sending";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="size-4 text-muted-foreground" />
              Send on WhatsApp
            </CardTitle>
            <CardDescription className="text-xs">
              Goes to the {audienceSize.toLocaleString()} customers matching the filters above,
              minus anyone unreachable or opted out.
            </CardDescription>
          </div>
          {!ready ? (
            <Badge variant="secondary" className="shrink-0 gap-1">
              <TriangleAlert className="size-3" />
              Not linked
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!ready ? (
          <Alert>
            <TriangleAlert className="size-4" />
            <AlertTitle className="text-xs font-medium">Session is not ready</AlertTitle>
            <AlertDescription className="text-xs">
              The gateway is connected but no number is linked, so nothing can be sent. Scan the
              QR in OpenWA, then reload.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3">
          <div className="flex gap-1.5">
            {(["text", "image", "video"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={type === t ? "default" : "outline"}
                onClick={() => setType(t)}
                className="capitalize"
                disabled={running}
              >
                {t}
              </Button>
            ))}
          </div>

          {type !== "text" ? (
            <div className="space-y-1.5">
              <Label htmlFor="wa-media">Media URL</Label>
              <Input
                id="wa-media"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://naturesjoystore.com/wp-content/uploads/offer.jpg"
                disabled={running}
              />
              <p className="text-[11px] text-muted-foreground">
                The gateway fetches this itself, so it has to be publicly reachable.
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="wa-text">{type === "text" ? "Message" : "Caption"}</Label>
            <Textarea
              id="wa-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={"Hi {{name}}, we saved your favourite Manjistha soap for you..."}
              disabled={running}
            />
            <p className="text-[11px] text-muted-foreground">
              <code>{"{{name}}"}</code> becomes the customer&apos;s first name. Guest checkouts
              without a usable name get a greeting that reads correctly without one.
            </p>
          </div>
        </div>

        <Separator />

        {/* Test send: isolated from the audience by design. */}
        <div className="space-y-1.5">
          <Label htmlFor="wa-test">Send a test first</Label>
          <div className="flex gap-2">
            <Input
              id="wa-test"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+91 98765 43210"
              disabled={running}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={sendTest}
              disabled={!composed || testPhone.trim().length < 6 || busy !== null || !ready}
              className="shrink-0 gap-1.5"
            >
              {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Test
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Goes only to the number you type here. It cannot reach a customer.
          </p>
        </div>

        <Separator />

        {!preview ? (
          <Button
            type="button"
            variant="outline"
            onClick={runPreview}
            disabled={!composed || busy !== null || running}
            className="w-full gap-1.5"
          >
            {busy === "preview" ? <Loader2 className="size-4 animate-spin" /> : null}
            Check who this would reach
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Stat label="In audience" value={preview.matched.toLocaleString()} />
              <Stat label="Reachable" value={preview.deliverable.toLocaleString()} strong />
              <Stat
                label="Dropped"
                value={(
                  preview.skipped.noPhone +
                  preview.skipped.unparseable +
                  preview.skipped.optedOut +
                  preview.skipped.duplicate
                ).toLocaleString()}
              />
              <Stat label="Takes about" value={humanDuration(preview.estimatedMs)} />
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Dropped: {preview.skipped.noPhone.toLocaleString()} with no phone,{" "}
              {preview.skipped.unparseable.toLocaleString()} unreadable,{" "}
              {preview.skipped.duplicate.toLocaleString()} duplicate numbers,{" "}
              {preview.skipped.optedOut.toLocaleString()} opted out.
              {preview.sample.length ? ` Sample: ${preview.sample.join(", ")}.` : ""}
            </p>

            {preview.preview ? (
              <div className="rounded-md bg-muted p-2.5">
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                  As the first recipient will see it
                </p>
                <p className="whitespace-pre-wrap text-xs">{preview.preview}</p>
              </div>
            ) : null}
          </div>
        )}

        {preview && !running && progress?.status !== "completed" ? (
          <div className="space-y-2 rounded-lg border border-destructive/40 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <ShieldAlert className="size-3.5 text-destructive" />
              This sends to {preview.deliverable.toLocaleString()} real customers
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Messages cannot be recalled once delivered. Type{" "}
              <strong>{preview.deliverable}</strong> to confirm.
            </p>
            <div className="flex gap-2">
              <Input
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                placeholder={String(preview.deliverable)}
                inputMode="numeric"
              />
              <Button
                type="button"
                onClick={start}
                disabled={
                  confirmValue.trim() !== String(preview.deliverable) || busy !== null || !ready
                }
                className="shrink-0 gap-1.5"
              >
                {busy === "start" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send broadcast
              </Button>
            </div>
          </div>
        ) : null}

        {progress ? (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium">
                {progress.status === "completed" ? (
                  <CheckCircle2 className="size-3.5 text-muted-foreground" />
                ) : progress.status === "sending" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <TriangleAlert className="size-3.5" />
                )}
                {progress.handedOff.toLocaleString()} of {progress.total.toLocaleString()} handed to
                the gateway
                {progress.status === "sending" ? ` · ${humanDuration(progress.estimatedMsRemaining)} left` : ""}
              </p>
              {running ? (
                <Button type="button" variant="outline" size="sm" onClick={cancel} className="gap-1.5">
                  <Square className="size-3.5" />
                  Stop
                </Button>
              ) : (
                <Badge variant="secondary" className="capitalize">{progress.status}</Badge>
              )}
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground transition-[width] duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {progress.error ? (
              <p className="text-[11px] text-destructive">{progress.error}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                The gateway paces sends itself. Leaving this page pauses the broadcast — anything
                already handed over still goes out, and reopening resumes where it stopped.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground">{label}</p>
      <p className={strong ? "text-sm font-semibold tabular-nums" : "tabular-nums"}>{value}</p>
    </div>
  );
}

function humanDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
