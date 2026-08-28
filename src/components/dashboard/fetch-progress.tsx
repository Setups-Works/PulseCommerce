"use client";

import { useEffect, useState } from "react";
import { useAnalytics } from "@/components/providers/analytics-provider";

/**
 * What a load is doing, said honestly.
 *
 * The server cannot report real progress: a cold request is one call that walks
 * the whole order history upstream, and there is no percentage to send back. So
 * nothing here pretends to have one. It shows elapsed time and explains what is
 * happening, which is the difference between "this is broken" and "this is a
 * first load and it is working".
 *
 * The thresholds are taken from measured behaviour, not guessed: a warm request
 * is under a second, and a cold pull of a twenty-thousand-order store took
 * around four and a half minutes.
 */

interface Stage {
  /** Seconds elapsed at which this message takes over. */
  after: number;
  message: string;
  detail?: string;
}

const STAGES: Stage[] = [
  { after: 0, message: "Loading analytics…" },
  {
    after: 4,
    message: "Fetching from WooCommerce…",
    detail: "Nothing was cached for this range, so it is being read from your store.",
  },
  {
    after: 20,
    message: "Pulling your order history…",
    detail:
      "Every metric needs the whole history, not a page of it. This happens once — afterwards it is cached and loads in under a second.",
  },
  {
    after: 90,
    message: "Still pulling…",
    detail:
      "A large store takes a few minutes. Orders are fetched at a deliberate pace so your storefront is never slowed down.",
  },
  {
    after: 240,
    message: "Nearly there…",
    detail:
      "This is the longest it gets. If it has not finished in another minute or two, check Settings — the store may be rate-limiting us.",
  },
];

function stageFor(seconds: number): Stage {
  let current = STAGES[0];
  for (const stage of STAGES) if (seconds >= stage.after) current = stage;
  return current;
}

/**
 * Seconds since this mounted.
 *
 * No reset branch: the panel is only mounted while a load is in flight and
 * unmounts when it finishes, so the timer's lifetime is the load's lifetime.
 * State is only set from the interval callback, never from the effect body.
 */
function useElapsed(): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  return seconds;
}

/**
 * A thin indeterminate bar across the top of the app.
 *
 * Shown for every fetch, not just the first, so changing a date range gives
 * immediate feedback rather than a page that appears frozen while it reloads.
 */
export function FetchProgressBar() {
  const { loading } = useAnalytics();
  if (!loading) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading analytics"
      aria-busy="true"
      /*
       * z-40, not z-50: the mobile sidebar's drawer (components/ui/sidebar.tsx)
       * is a Sheet at z-50, and this bar rendering while a background refresh
       * happens to overlap an open drawer previously tied with it at the same
       * z-index — which one painted on top then depended on DOM/portal order
       * rather than anything intentional. Above the topbar (z-30), below any
       * sheet or dialog, is the layer this bar actually belongs on.
       */
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-transparent"
    >
      <div className="h-full w-2/5 animate-[pulse-sweep_1.15s_ease-in-out_infinite] bg-primary" />
    </div>
  );
}

/**
 * The full-page version, for a load with nothing on screen yet.
 * Rendered above the skeleton so the wait is explained rather than just drawn.
 */
export function FetchProgressPanel() {
  const seconds = useElapsed();
  const stage = stageFor(seconds);

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
      <span className="relative mt-0.5 flex size-4 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50" />
        <span className="relative inline-flex size-4 rounded-full bg-primary" />
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">{stage.message}</p>
          {/* Elapsed time rather than a fake percentage: it is the one honest
              number available, and it tells you whether anything is stuck. */}
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatElapsed(seconds)}
          </span>
        </div>
        {stage.detail ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{stage.detail}</p>
        ) : null}
      </div>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}
