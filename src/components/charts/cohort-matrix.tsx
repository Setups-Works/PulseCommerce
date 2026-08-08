"use client";

import { Tooltip } from "@heroui/react";
import type { CohortRow } from "@/lib/analytics/types";
import { formatNumber, formatPercent } from "@/lib/format";
import { rampCellProps } from "./palette";

/**
 * Retention triangle. Cells that haven't elapsed yet stay blank rather than
 * showing 0% — an unelapsed month is missing data, not a total loss.
 */
export function CohortMatrix({
  rows,
  periods,
  averageRetention,
  currencyFormat,
  mode = "retention",
}: {
  rows: CohortRow[];
  periods: number;
  averageRetention: (number | null)[];
  currencyFormat: (value: number) => string;
  mode?: "retention" | "revenue";
}) {
  const visiblePeriods = Math.min(periods, 12);

  // Month 0 is always 100% by construction, so it would flatten the scale.
  const scaleMax =
    mode === "retention"
      ? Math.max(
          ...rows.flatMap((r) => r.retention.slice(1, visiblePeriods).filter((v): v is number => v !== null)),
          1,
        )
      : Math.max(
          ...rows.flatMap((r) => r.revenue.slice(0, visiblePeriods).filter((v): v is number => v !== null)),
          1,
        );

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Not enough order history to build acquisition cohorts yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-separate border-spacing-[2px] text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card px-2 py-1 text-left font-medium text-muted-foreground">
              Cohort
            </th>
            <th className="px-2 py-1 text-right font-medium text-muted-foreground">Size</th>
            {Array.from({ length: visiblePeriods }, (_, i) => (
              <th key={i} className="px-1 py-1 text-center font-medium text-muted-foreground tabular">
                M{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohort}>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-card px-2 py-1 text-left font-medium whitespace-nowrap"
              >
                {row.label}
              </th>
              <td className="px-2 py-1 text-right tabular text-muted-foreground">{formatNumber(row.size)}</td>
              {Array.from({ length: visiblePeriods }, (_, i) => {
                const retention = row.retention[i];
                const revenue = row.revenue[i];
                const value = mode === "retention" ? retention : revenue;

                if (value === null || value === undefined) {
                  return <td key={i} className="rounded-[3px] bg-muted/40" aria-label="Not yet elapsed" />;
                }

                const t = mode === "retention" && i === 0 ? 1 : Math.min(1, value / scaleMax);
                return (
                  <td key={i} className="p-0">
                    <Tooltip>
                      <Tooltip.Trigger>
                        <div
                          {...rampCellProps(t)}
                          className="ramp-cell rounded-[3px] px-1 py-1.5 text-center tabular transition-transform hover:scale-[1.1] hover:ring-2 hover:ring-ring/40"
                        >
                          {mode === "retention" ? `${(retention ?? 0).toFixed(0)}%` : compact(revenue ?? 0)}
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p className="font-semibold">
                          {row.label} · month {i}
                        </p>
                        <p className="tabular">Retention: {formatPercent(retention ?? 0)}</p>
                        <p className="tabular text-muted-foreground">
                          Revenue: {currencyFormat(revenue ?? 0)}
                        </p>
                        <p className="tabular text-muted-foreground">
                          Cumulative per customer: {currencyFormat(row.cumulativeRevenuePerCustomer[i] ?? 0)}
                        </p>
                      </Tooltip.Content>
                    </Tooltip>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="sticky left-0 z-10 bg-card px-2 py-1 text-left font-medium text-muted-foreground">
              Average
            </th>
            <td />
            {Array.from({ length: visiblePeriods }, (_, i) => (
              <td key={i} className="px-1 py-1 text-center tabular font-medium">
                {averageRetention[i] === null || averageRetention[i] === undefined
                  ? "—"
                  : `${averageRetention[i]!.toFixed(0)}%`}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function compact(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
