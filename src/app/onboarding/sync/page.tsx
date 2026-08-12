"use client";

import { CheckCircle2, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The first sync, after a store is connected.
 *
 * A newly connected store has nothing mirrored, so the dashboard would open on
 * "This store has not been synced yet" — which reads as a broken product
 * rather than as a step that has not happened. This is that step, made
 * visible.
 *
 * ─── Why it polls instead of awaiting the POST ─────────────────────────────
 *
 * The first pull walks the WooCommerce REST API a hundred orders at a time and
 * takes minutes on a real store — longer than a serverless invocation is
 * allowed to run, and far longer than a fetch anybody should sit on. So the
 * POST is fired and deliberately not awaited, and progress comes from polling
 * the status endpoint, which reads counters the sync writes as it goes.
 *
 * The consequence is that closing this page does not cancel anything. The sync
 * continues server-side, which is the behaviour you want: it means a dropped
 * connection costs nothing.
 */

/** Slow enough not to hammer the endpoint, fast enough to feel live. */
const POLL_MS = 3000;

interface SyncState {
  lastSyncAt: string | null;
  orders: number;
  customers: number;
  products: number;
  lastRun: {
    status: "running" | "succeeded" | "failed";
    mode: string;
    error: string | null;
    finishedAt: string | null;
  } | null;
}

export default function OnboardingSyncPage() {
  const router = useRouter();
  const [state, setState] = useState<SyncState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login?next=/onboarding/sync");
        return null;
      }
      if (res.status === 409) {
        router.push("/connect");
        return null;
      }
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not read sync status.");
      const next = (await res.json()) as SyncState;
      setState(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read sync status.");
      return null;
    }
  }, [router]);

  useEffect(() => {
    // Guard against React's development double-effect, which would otherwise
    // start two full pulls against the merchant's store.
    if (started.current) return;
    started.current = true;

    void (async () => {
      const current = await poll();
      // Already has data, or a run is in flight: do not start another.
      if (!current || current.orders > 0 || current.lastRun?.status === "running") return;

      // Not awaited — see the note at the top.
      void fetch("/api/sync", { method: "POST" }).catch(() => {
        /* Failures surface through the status endpoint. */
      });
    })();
  }, [poll]);

  const run = state?.lastRun;
  const done = run?.status === "succeeded" || (state?.orders ?? 0) > 0;
  const failed = run?.status === "failed";

  useEffect(() => {
    if (done || failed) return;
    const id = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(id);
  }, [done, failed, poll]);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {done ? (
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            ) : failed ? (
              <TriangleAlert className="size-4" />
            ) : (
              <Loader2 className="size-4 animate-spin" />
            )}
            {done ? "Your store is ready" : failed ? "The first sync failed" : "Setting up your store"}
          </CardTitle>
          <CardDescription className="text-xs">
            {done
              ? "Everything below is now available to the dashboard and the API."
              : failed
                ? "Nothing was lost — the next attempt starts from where this one stopped."
                : "We are copying your orders so the dashboard can read them instantly. This takes a few minutes the first time; you can leave this page and it will keep going."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Figure label="Orders" value={state?.orders} />
            <Figure label="Customers" value={state?.customers} />
            <Figure label="Products" value={state?.products} />
          </div>

          {failed ? (
            <Alert>
              <AlertTitle>What went wrong</AlertTitle>
              <AlertDescription className="text-xs">
                {run?.error ?? "No reason was recorded."}
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert>
              <AlertTitle>Could not check progress</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {done ? (
              <Button asChild className="gap-1.5">
                <Link href="/dashboard">Open the dashboard</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setError(null);
                  void fetch("/api/sync", { method: "POST" }).catch(() => {});
                  void poll();
                }}
              >
                <RefreshCw className="size-3.5" />
                {failed ? "Try again" : "Restart the sync"}
              </Button>
            )}
            <Button variant="ghost" asChild className="text-xs">
              <Link href="/settings">Go to settings</Link>
            </Button>
          </div>

          {!done && !failed ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Counts update as orders arrive. A store with tens of thousands of orders can take
              several minutes.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
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
