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
 * ─── Why it calls repeatedly ───────────────────────────────────────────────
 *
 * The first pull walks the WooCommerce REST API a hundred orders at a time.
 * Measured against a real store, that is roughly eleven seconds a page and
 * 21,000 orders — far longer than any single serverless invocation may run. So
 * each request works to a time budget, writes what it read, records a cursor,
 * and reports whether history remains. This page keeps calling until it does
 * not.
 *
 * Closing the page cancels nothing. The cursor lives in the database and the
 * scheduled sync advances it too; being here only makes it faster.
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
  backfillDone?: boolean;
  total?: number | null;
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

  /*
   * Drives the backfill to completion, one invocation at a time.
   *
   * Each request works to a time budget and returns `done: false` while there
   * is history left, so a single call finishes only a small store. This keeps
   * calling until it reports done. The alternative — one request — is what
   * cannot work: the pull takes far longer than any single invocation is
   * allowed to run.
   *
   * Leaving the page does not strand anything. The cursor is in the database
   * and the scheduled sync advances it too; this only makes it faster while
   * somebody is watching.
   */
  useEffect(() => {
    // React's development double-effect would otherwise start two pulls
    // against the merchant's store.
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    void (async () => {
      const current = await poll();
      if (!current) return;

      while (!cancelled) {
        try {
          const res = await fetch("/api/sync", { method: "POST" });
          const body = await res.json();

          if (!res.ok) {
            setError(body.detail ?? body.error ?? "The sync failed.");
            return;
          }

          await poll();
          if (body.done) return;
        } catch {
          // A dropped connection is not a failed sync — the server keeps its
          // cursor. Stop driving and let the poll and the scheduler continue.
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [poll]);

  const run = state?.lastRun;
  /*
   * "Has data" is not the same as "finished". A backfill has orders in the
   * table from its first page onward, so treating any rows as done would send
   * people to a dashboard showing a fraction of their history as if it were
   * all of it.
   */
  const done = state?.backfillDone === true || run?.status === "succeeded";
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
              {state?.total
                ? `${state.orders.toLocaleString()} of about ${state.total.toLocaleString()} orders copied so far.`
                : "Counts update as orders arrive."}{" "}
              WooCommerce serves a hundred orders at a time, so a large history takes a while. You
              can close this page — it carries on without you.
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
