"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { Insight } from "@/lib/analytics/types";

const SEVERITY = {
  positive: { icon: CircleCheck, color: "var(--good)", label: "Positive" },
  neutral: { icon: Info, color: "var(--chart-1)", label: "Note" },
  warning: { icon: TriangleAlert, color: "var(--warning)", label: "Watch" },
  critical: { icon: CircleAlert, color: "var(--critical)", label: "Act on this" },
} as const;

/**
 * Status colour never carries meaning alone here — every row pairs it with an
 * icon and a written severity label.
 */
export function InsightList({ insights, limit }: { insights: Insight[]; limit?: number }) {
  const rows = limit ? insights.slice(0, limit) : insights;

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No findings for this period.</p>;
  }

  return (
    <ul className="divide-y">
      {rows.map((insight) => {
        const severity = SEVERITY[insight.severity];
        const Icon = severity.icon;
        return (
          <li key={insight.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in oklab, ${severity.color} 14%, transparent)` }}
            >
              <Icon className="size-4" style={{ color: severity.color }} />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-medium">{insight.title}</p>
                <span className="text-[11px] font-medium" style={{ color: severity.color }}>
                  {severity.label}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{insight.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
