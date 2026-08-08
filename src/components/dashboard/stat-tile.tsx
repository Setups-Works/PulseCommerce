"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { Skeleton } from "@heroui/react";
import { Tooltip } from "@heroui/react";
import type { Metric } from "@/lib/analytics/types";
import { formatChange } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  metric?: Metric;
  /** Set when a rise is bad — refunds, cancellations, churn. */
  invertChange?: boolean;
  icon?: LucideIcon;
  trend?: number[];
  hint?: string;
  footer?: ReactNode;
  className?: string;
}

export function StatTile({
  label,
  value,
  metric,
  invertChange = false,
  icon: Icon,
  trend,
  hint,
  footer,
  className,
}: StatTileProps) {
  const change = metric?.change ?? null;
  const isGood = change === null ? null : invertChange ? change <= 0 : change >= 0;
  const Arrow = change === null ? ArrowRight : change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : ArrowRight;

  /*
   * A stat is a label, a value and its qualifier on a shared baseline — not a
   * boxed card. Four bordered rectangles in a row read as four equally
   * important containers; an aligned strip lets the numbers themselves carry
   * the hierarchy, with a single rule separating peers.
   */
  const body = (
    <div className={cn("flex flex-col py-1", className)}>
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 shrink-0 text-muted-foreground" /> : null}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>

      <p className="mt-1.5 text-[26px] leading-none font-semibold tracking-tight">{value}</p>

      <div className="mt-2 flex items-end justify-between gap-3">
        {/*
         * Only comparative metrics get a change line. A tile with no `metric`
         * isn't a period-over-period figure at all, so claiming "no prior
         * period" would invent a comparison that was never intended.
         */}
        {metric ? (
          change !== null ? (
            <span
              className="inline-flex items-center gap-0.5 text-[11px] font-medium tabular"
              style={{ color: isGood ? "var(--good)" : "var(--critical)" }}
            >
              <Arrow className="size-3" strokeWidth={2.5} />
              {formatChange(change)}
              <span className="ml-1 font-normal text-muted-foreground">vs previous</span>
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">no prior period to compare</span>
          )
        ) : (
          <span />
        )}

        {trend && trend.length > 1 ? (
          <Sparkline values={trend} width={64} height={22} className="shrink-0" />
        ) : null}
      </div>

      {footer ? <p className="mt-1.5 text-[11px] text-muted-foreground">{footer}</p> : null}
    </div>
  );

  if (!hint) return body;

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div>{body}</div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        {hint}
      </Tooltip.Content>
    </Tooltip>
  );
}

export function StatTileSkeleton() {
  return (
    <div className="py-1">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-2 h-7 w-28" />
      <Skeleton className="mt-2.5 h-3.5 w-20" />
    </div>
  );
}

/**
 * Peer stats on one shared rule. Dividers between items rather than a border
 * around each keeps the row reading as a single band of evidence.
 */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      aria-label="Headline metrics"
      className={cn(
        "grid gap-x-6 gap-y-6 border-y py-5",
        "sm:grid-cols-2 sm:divide-x sm:*:px-6 sm:[&>*:first-child]:pl-0",
        "xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </section>
  );
}
