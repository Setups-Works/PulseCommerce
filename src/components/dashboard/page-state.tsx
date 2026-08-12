"use client";

import { AlertTriangle, ArrowRight, Loader2, PlugZap, Store , Database } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FetchProgressPanel } from "@/components/dashboard/fetch-progress";
import { useAnalytics } from "@/components/providers/analytics-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsResult } from "@/lib/analytics/types";

/**
 * The page canvas: padding and the gap between stacked sections.
 *
 * `AnalyticsPage` applies this itself, so pages that render analytics get it
 * for free. Pages that don't (Settings) have to opt in, and forgetting left
 * their cards butted edge to edge with no page padding at all.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return <div className="space-y-5 p-4 sm:p-6">{children}</div>;
}

/**
 * Every analytics page renders through this: it owns the loading, error and
 * warning states so no page has to re-implement them, and it hands down a
 * guaranteed non-null result.
 */
export function AnalyticsPage({ children }: { children: (data: AnalyticsResult) => ReactNode }) {
  const { data, initialising, error, refresh, loading, notConnected, notSynced } =
    useAnalytics();

  if (initialising) return <LoadingState />;

  // No demo fallback by design: without a store there is nothing honest to show.
  if (notConnected) return <NotConnectedState />;

  /*
   * Connected, but the first pull has not run. Sending them to the sync screen
   * is the actual next step; the generic failure card offered "Try again",
   * which retries a read that cannot succeed until a sync happens.
   */
  if (notSynced) return <NotSyncedState />;

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="mx-auto max-w-lg gap-4 p-6 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--critical)_14%,transparent)]">
            <PlugZap className="size-5 text-[var(--critical)]" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-semibold">Couldn&apos;t load analytics</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex justify-center gap-2">
            <Button onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings">Check connection</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) return <LoadingState />;

  return (
    <PageShell>
      {data.meta.warnings.length > 0 ? (
        <Alert>
          <AlertTriangle />
          <AlertTitle>Partial data</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-0.5">
              {data.meta.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert>
          <AlertTriangle />
          <AlertTitle>Showing the last successful load</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {children(data)}
    </PageShell>
  );
}

function NotConnectedState() {
  return (
    <div className="p-4 sm:p-6">
      <Card className="mx-auto max-w-lg gap-4 p-6 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted">
          <Store className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-semibold">Connect your WooCommerce store</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every figure in this dashboard is computed from your own orders, so there is nothing to show until a
            store is authorized. You will approve read-only access inside your own WordPress admin.
          </p>
        </div>
        <div className="flex justify-center">
          <Button asChild>
            <Link href="/settings">
              Authorize a store <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function NotSyncedState() {
  return (
    <div className="p-4 sm:p-6">
      <Card className="mx-auto max-w-lg gap-4 p-6 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted">
          <Database className="size-5" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-semibold">Your store is still being copied</h2>
          <p className="text-sm text-muted-foreground">
            Orders are mirrored into the database so the dashboard reads them instantly. The first
            pull takes a few minutes.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link href="/onboarding/sync">See progress</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings">Settings</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <FetchProgressPanel />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="gap-0 p-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-3 h-7 w-28" />
            <Skeleton className="mt-3 h-4 w-16" />
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-[260px] w-full" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-[200px] w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-[200px] w-full" />
        </Card>
      </div>
    </div>
  );
}

/** Shown when a section genuinely has nothing to display, with a reason. */
export function EmptySection({
  title,
  description,
  action,
  icon: Icon = AlertTriangle,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: typeof AlertTriangle;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
