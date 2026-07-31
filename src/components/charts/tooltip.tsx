"use client";

import type { ReactNode } from "react";

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
}

/**
 * Shared tooltip surface. Values sit in text ink with a colour chip alongside —
 * never coloured text, which would make the number itself carry identity.
 */
export function TooltipCard({
  title,
  subtitle,
  rows,
  footer,
}: {
  title: string;
  subtitle?: string;
  rows: TooltipRow[];
  footer?: ReactNode;
}) {
  return (
    <div className="min-w-[11rem] rounded-lg border bg-popover/95 p-2.5 text-popover-foreground shadow-lg backdrop-blur-sm">
      <p className="text-xs font-semibold">{title}</p>
      {subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              {row.color ? (
                <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: row.color }} />
              ) : null}
              <span className="truncate">{row.label}</span>
            </span>
            <span className={row.muted ? "tabular text-muted-foreground" : "tabular font-medium"}>{row.value}</span>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-2 border-t pt-1.5 text-[11px] text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
