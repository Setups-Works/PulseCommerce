"use client";

import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LogOut,
  ShieldCheck,
  Store,
  Trash2,
  TriangleAlert,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AUTH_MESSAGES } from "@/components/auth-outcome";
import { useAnalytics } from "@/components/providers/analytics-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/format";

interface RedactedConfig {
  url: string;
  consumerKey: string;
  historyMonths: number;
  maxPages: number;
  updatedAt: string | null;
}

export default function SettingsPage() {
  const { data, refresh } = useAnalytics();
  const [config, setConfig] = useState<RedactedConfig | null>(null);
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<{ enabled: boolean; signedIn: boolean } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [storeUrl, setStoreUrl] = useState("");
  const [historyMonths, setHistoryMonths] = useState(24);
  const [maxPages, setMaxPages] = useState(300);
  const [savingWindow, setSavingWindow] = useState(false);
  const [authOutcome, setAuthOutcome] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      setConnected(Boolean(json.connected));
      setConfig(json.config);
      if (json.config) {
        setStoreUrl(json.config.url);
        setHistoryMonths(json.config.historyMonths);
        setMaxPages(json.config.maxPages);
      }
      const auth = await fetch("/api/auth/session")
        .then((r) => r.json())
        .catch(() => null);
      if (auth) setSession(auth);
    } catch {
      toast.error("Could not read the current connection settings.");
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthOutcome(new URLSearchParams(window.location.search).get("auth"));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConfig();
  }, [loadConfig]);

  const saveWindow = async () => {
    setSavingWindow(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyMonths, maxPages }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save.");
      toast.success("Data window updated", { description: "Re-syncing from WooCommerce." });
      await loadConfig();
      refresh();
    } catch (error) {
      toast.error("Could not save", {
        description: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setSavingWindow(false);
    }
  };

  const disconnect = async () => {
    await fetch("/api/settings", { method: "DELETE" });
    toast.success("Disconnected", { description: "The stored key and every cached order were removed." });
    await loadConfig();
    refresh();
  };

  const signOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.href = "/login";
  };

  const outcome = authOutcome ? AUTH_MESSAGES[authOutcome] : null;

  return (
    <>
      {outcome ? (
        <Alert>
          {outcome.tone === "good" ? <CheckCircle2 /> : <TriangleAlert />}
          <AlertTitle>{outcome.title}</AlertTitle>
          <AlertDescription>{outcome.detail}</AlertDescription>
        </Alert>
      ) : null}

      {/* --- Current connection ------------------------------------------ */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">WooCommerce connection</CardTitle>
              <CardDescription className="text-xs">
                Authorized through WooCommerce with read-only scope. Nothing is ever written back to your store.
              </CardDescription>
            </div>
            <Badge variant={connected ? "secondary" : "outline"} className="gap-1.5">
              {connected ? (
                <>
                  <CheckCircle2 className="size-3.5" /> Connected
                </>
              ) : (
                <>
                  <Unplug className="size-3.5" /> Not connected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loadingConfig ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : connected && config ? (
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field label="Store URL">
                <a
                  href={config.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  {config.url} <ExternalLink className="size-3" />
                </a>
              </Field>
              <Field label="Store name">{data?.meta.storeName ?? "—"}</Field>
              <Field label="Issued key">
                <code className="text-xs">{config.consumerKey}</code>
              </Field>
              <Field label="Authorized">{config.updatedAt ? formatDateTime(config.updatedAt) : "—"}</Field>
              <Field label="Currency">{data?.meta.currency ?? "—"}</Field>
              <Field label="Last synced">{data ? formatDateTime(data.meta.fetchedAt) : "—"}</Field>
            </dl>
          ) : (
            <Alert>
              <Store />
              <AlertTitle>No store connected</AlertTitle>
              <AlertDescription>
                This dashboard analyses your real orders and carries no sample data, so every page stays empty
                until a store is authorized.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        {connected ? (
          <CardFooter className="gap-2 border-t pt-4">
            <Button variant="outline" size="sm" onClick={refresh}>
              Re-sync now
            </Button>
            <Button variant="outline" size="sm" onClick={disconnect} className="gap-1.5">
              <Trash2 className="size-3.5" />
              Disconnect
            </Button>
            {session?.enabled ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="ml-auto gap-1.5">
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            ) : null}
          </CardFooter>
        ) : null}
      </Card>

      {/* --- Authorize ---------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            {connected ? "Authorize a different store" : "Authorize your store"}
          </CardTitle>
          <CardDescription className="text-xs">
            Enter your store address and approve read-only access in your own WordPress admin. WooCommerce issues
            the key and delivers it here directly, so you never handle a secret.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action="/api/auth/woo/start" method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1 space-y-1.5">
              <Label htmlFor="store-url">Store URL</Label>
              <Input
                id="store-url"
                name="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="https://yourstore.com"
                autoComplete="url"
              />
            </div>
            <Button type="submit" className="gap-1.5" disabled={storeUrl.trim().length < 4}>
              Continue to WooCommerce
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-4 space-y-1.5 rounded-lg border p-3">
            <p className="text-xs font-medium">What this needs to work</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              WooCommerce sends the issued key by POSTing from <em>your store&apos;s server</em> to this app. That
              means this app must be on a public HTTPS address: <code>localhost</code> can never receive the
              callback, however the browser reaches it.
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              For local development, open a tunnel and point <code>APP_URL</code> at it:
            </p>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-[11px] leading-relaxed">
{`npm run dev:https                                  # serve over local HTTPS
cloudflared tunnel --url https://localhost:3000    # or: ngrok http https://localhost:3000
# then set APP_URL to the public https:// address it prints, and restart`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* --- Data window --------------------------------------------------- */}
      {connected ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Data window</CardTitle>
            <CardDescription className="text-xs">
              How much history to pull, and the pagination safety cap.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="months">History window (months)</Label>
              <Input
                id="months"
                type="number"
                min={1}
                max={120}
                value={historyMonths}
                onChange={(e) => setHistoryMonths(Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                Cohort retention and lifetime value need real history. 24 months is a sensible floor.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pages">Page limit</Label>
              <Input
                id="pages"
                type="number"
                min={1}
                max={500}
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                100 orders per page. The dashboard warns you if this cap truncates your history.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button size="sm" onClick={saveWindow} disabled={savingWindow}>
              {savingWindow ? <Loader2 className="size-4 animate-spin" /> : null}
              Save and re-sync
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {/* --- How data is handled ------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-muted-foreground" />
            How your data is handled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Point title="Read-only">
            Only GET requests, to <code>/orders</code>, <code>/customers</code> and <code>/products</code>. The key
            WooCommerce issues carries read scope, so there is no path by which this app could change your store.
          </Point>
          <Separator />
          <Point title="No sample data">
            There is no demo dataset anywhere in this app. Every number came from your store, so a figure can never
            be a placeholder you mistook for real.
          </Point>
          <Separator />
          <Point title="Stored locally">
            The issued key lives in an owner-only file under <code>.data/</code> on the machine running this app. It
            is gitignored and never sent to the browser.
          </Point>
          <Separator />
          <Point title="Cached, not warehoused">
            A fetched snapshot is cached in memory for 10 minutes and on disk for an hour so large stores load
            instantly. Disconnecting deletes both, along with the key.
          </Point>
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-medium break-all">{children}</dd>
    </div>
  );
}

function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
