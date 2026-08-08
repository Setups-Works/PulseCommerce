"use client";

import type { ReactNode } from "react";
import { Card } from "@heroui/react";
import { cn } from "@/lib/utils";
import { seriesColor } from "./palette";

export interface SeriesLegendItem {
  label: string;
  color: string;
}

interface ChartCardProps {
  title: string;
  description?: string;
  /** Rendered top-right — filters, toggles, a "view as table" switch. */
  action?: ReactNode;
  /**
   * A legend is mandatory for two or more series, so identity is never carried
   * by colour alone. A single-series chart names itself in the title instead.
   */
  legend?: SeriesLegendItem[];
  footnote?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function ChartCard({
  title,
  description,
  action,
  legend,
  footnote,
  className,
  contentClassName,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <Card.Header className="gap-1 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Card.Title className="text-sm font-semibold tracking-tight">{title}</Card.Title>
            {description ? <Card.Description className="text-xs">{description}</Card.Description> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
        {legend && legend.length > 1 ? (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </li>
            ))}
          </ul>
        ) : null}
      </Card.Header>
      <Card.Content className={cn("pt-0", contentClassName)}>{children}</Card.Content>
      {footnote ? (
        <div className="border-t px-6 py-2.5 text-xs text-muted-foreground">{footnote}</div>
      ) : null}
    </Card>
  );
}

export function legendFromLabels(labels: string[]): SeriesLegendItem[] {
  return labels.map((label, i) => ({ label, color: seriesColor(i) }));
}

export function ChartEmpty({ message = "No data in this period." }: { message?: string }) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-1 rounded-md border border-dashed text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70">Try widening the date range.</p>
    </div>
  );
}
