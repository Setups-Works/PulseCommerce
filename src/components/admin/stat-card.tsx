import * as React from "react";
import { Card, Chip } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

/**
 * The KPI tile used across the admin panel.
 *
 * A server component: there is nothing interactive about a number. Keeping it
 * off the client is what lets a dashboard of twelve tiles cost no JavaScript.
 *
 * `delta` is a fraction (0.124 → +12.4%), matching lib/format.ts, so a figure
 * shown here and the same figure on a customer-facing dashboard are formatted
 * by the same rules. `invertDelta` is for metrics where up is bad — churn,
 * refunds, bounce.
 */

export interface StatCardProps {
  label: string;
  value: string;
  icon?: IconDefinition;
  delta?: number | null;
  invertDelta?: boolean;
  hint?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  delta = null,
  invertDelta = false,
  hint,
  className,
}: StatCardProps) {
  const isGood = delta === null ? null : invertDelta ? delta <= 0 : delta >= 0;

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted">{label}</p>
        {icon ? <FontAwesomeIcon icon={icon} className="w-3.5 text-muted" /> : null}
      </div>

      <p className="mt-2 text-2xl leading-none font-semibold tracking-tight tabular-nums">{value}</p>

      <div className="mt-2.5 flex items-center gap-2">
        {delta !== null ? (
          // HeroUI puts semantic meaning on `color`; `variant` is the fill
          // style. Passing "success" as a variant silently falls back to the
          // default and the tile loses its up/down signal.
          <Chip size="sm" color={isGood ? "success" : "danger"} className="gap-1 text-[11px] tabular-nums">
            <FontAwesomeIcon icon={delta >= 0 ? faArrowUp : faArrowDown} className="w-2.5" />
            {`${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`}
          </Chip>
        ) : null}
        {hint ? <span className="truncate text-[11px] text-muted">{hint}</span> : null}
      </div>
    </Card>
  );
}

/** Peer tiles on one grid, so no screen invents its own KPI row. */
export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      aria-label="Key figures"
      className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
    >
      {children}
    </section>
  );
}
