"use client";

import { Database, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SyncState {
  lastSyncAt: string | null;
  orders: number;
  customers: number;
  products: number;
  lastRun: {
    status: string;
    mode: string;
    error: string | null;
    finishedAt: string | null;
  } | null;
}

/**
 * How current the mirrored store data is, and a way to pull it now.
 *
 * The dashboard reads a local copy of the store rather than WooCommerce
 * directly, which is what makes it fast — but it also means every figure is as
 * old as the last sync. Somewhere has to say how old, or a merchant comparing
 * this against their WooCommerce admin has no way to explain a difference.
 *
 * A failed run is shown rather than swallowed, for the same reason: silently
 * stale numbers are worse than numbers labelled stale.
 */
export function SyncCard() {
  const [state, setState] = useState<SyncState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (res.status === 401) return setUnavailable("Sign in to see sync status.");
      if (res.status === 409) return setUnavailable("Connect a store first.");
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not read sync status.");
      setUnavailable(null);
      setState(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read sync status.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const sync = async (full: boolean) => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`/api/sync${full ? "?full=1" : ""}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail ?? json.error ?? "The sync failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Database className="size-4" />
          Store data
        </CardTitle>
        <CardDescription className="text-xs">
          Your orders are mirrored into the database so the dashboard reads them locally instead of
          calling WooCommerce on every request. It refreshes every two hours.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {unavailable ? (
          <p className="text-xs text-muted-foreground">{unavailable}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Figure label="Orders" value={state?.orders} />
              <Figure label="Customers" value={state?.customers} />
              <Figure label="Products" value={state?.products} />
            </div>

            <p className="text-[11px] text-muted-foreground">
              {state?.lastSyncAt
                ? `Last updated ${relative(state.lastSyncAt)}.`
                : "Not synced yet — run the first pull below."}
            </p>

            {state?.lastRun?.status === "failed" ? (
              <Alert>
                <TriangleAlert />
                <AlertTitle>The last sync failed</AlertTitle>
                <AlertDescription className="text-xs">
                  {state.lastRun.error ?? "No reason was recorded."} The figures above are from
                  before it ran.
                </AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert>
                <AlertTitle>Sync failed</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => sync(false)} disabled={syncing} className="gap-1.5">
                {syncing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Sync now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => sync(true)}
                disabled={syncing}
                className="gap-1.5"
              >
                Full re-sync
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              A normal sync fetches only what changed since last time. A full re-sync re-reads your
              whole history — slow on a large store, and only needed if something looks wrong.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Figure({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">
        {value === undefined ? "—" : value.toLocaleString()}
      </p>
    </div>
  );
}

function relative(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
