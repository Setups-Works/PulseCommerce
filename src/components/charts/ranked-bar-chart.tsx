"use client";

import { cn } from "@/lib/utils";
import { seriesColor } from "./palette";

export interface RankedBarDatum {
  label: string;
  value: number;
  /** Optional right-hand figure, e.g. order count next to revenue. */
  secondary?: string;
  color?: string;
  href?: string;
}

/**
 * Ranked horizontal bars, built in plain HTML rather than a chart library.
 *
 * For "which of these is biggest" the label belongs beside the bar, not on a
 * rotated axis — and every value is directly labelled, which is also the relief
 * required for the palette's sub-3:1 slots.
 */
export function RankedBarChart({
  data,
  format,
  colorBy = "uniform",
  maxRows = 10,
  emptyMessage = "No data in this period.",
}: {
  data: RankedBarDatum[];
  format: (value: number) => string;
  /** uniform = one hue (magnitude), series = fixed slot per row (identity). */
  colorBy?: "uniform" | "series";
  maxRows?: number;
  emptyMessage?: string;
}) {
  const rows = data.slice(0, maxRows);
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ol className="space-y-2.5">
      {rows.map((row, i) => {
        const width = Math.max(1.5, (Math.abs(row.value) / max) * 100);
        const color = row.color ?? (colorBy === "series" ? seriesColor(i) : "var(--chart-1)");
        return (
          <li key={`${row.label}-${i}`} className="group space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate font-medium" title={row.label}>
                <span className="mr-1.5 tabular text-muted-foreground">{i + 1}.</span>
                {row.label}
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                {row.secondary ? (
                  <span className="tabular text-[11px] text-muted-foreground">{row.secondary}</span>
                ) : null}
                <span className="tabular font-semibold">{format(row.value)}</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500")}
                style={{ width: `${width}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
