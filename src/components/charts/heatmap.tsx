"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { rampCellProps, rampStep, SEQUENTIAL_RAMP } from "./palette";

export interface HeatmapCell {
  row: number;
  col: number;
  value: number;
  secondary?: number;
}

/**
 * Magnitude grid on a single-hue sequential ramp — never a rainbow.
 * Every cell carries a hover tooltip, and the scale legend below states the
 * range in words so the encoding isn't colour-only.
 */
export function Heatmap({
  cells,
  rowLabels,
  colLabels,
  format,
  secondaryFormat,
  secondaryLabel,
  valueLabel = "Value",
  cellHeight = 26,
}: {
  cells: HeatmapCell[];
  rowLabels: string[];
  colLabels: string[];
  format: (value: number) => string;
  secondaryFormat?: (value: number) => string;
  secondaryLabel?: string;
  valueLabel?: string;
  cellHeight?: number;
}) {
  const max = Math.max(...cells.map((c) => c.value), 1);
  const grid = new Map(cells.map((c) => [`${c.row}:${c.col}`, c]));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="min-w-160">
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `minmax(64px, auto) repeat(${colLabels.length}, minmax(0, 1fr))` }}
          >
            <div />
            {colLabels.map((label, c) => (
              <div
                key={`col-${c}`}
                className="pb-1 text-center text-[10px] text-muted-foreground tabular"
              >
                {/* Only every other column is labelled at 24 columns. */}
                {colLabels.length > 14 ? (c % 3 === 0 ? label : "") : label}
              </div>
            ))}

            {rowLabels.map((rowLabel, r) => (
              <FragmentRow
                key={`row-${r}`}
                rowLabel={rowLabel}
                r={r}
                colLabels={colLabels}
                grid={grid}
                max={max}
                format={format}
                secondaryFormat={secondaryFormat}
                secondaryLabel={secondaryLabel}
                valueLabel={valueLabel}
                cellHeight={cellHeight}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>None</span>
        <div className="flex h-2.5 flex-1 overflow-hidden rounded-full">
          {SEQUENTIAL_RAMP.map((color, i) => (
            <span key={i} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="tabular">{format(max)}</span>
      </div>
    </div>
  );
}

function FragmentRow({
  rowLabel,
  r,
  colLabels,
  grid,
  max,
  format,
  secondaryFormat,
  secondaryLabel,
  valueLabel,
  cellHeight,
}: {
  rowLabel: string;
  r: number;
  colLabels: string[];
  grid: Map<string, HeatmapCell>;
  max: number;
  format: (value: number) => string;
  secondaryFormat?: (value: number) => string;
  secondaryLabel?: string;
  valueLabel: string;
  cellHeight: number;
}) {
  return (
    <>
      <div className="flex items-center pr-2 text-[11px] text-muted-foreground">{rowLabel}</div>
      {colLabels.map((colLabel, c) => {
        const cell = grid.get(`${r}:${c}`);
        const value = cell?.value ?? 0;
        const t = value / max;
        return (
          <Tooltip key={`${r}-${c}`}>
            <TooltipTrigger asChild>
              <div
                {...(value === 0 ? {} : rampCellProps(t))}
                className="rounded-[3px] transition-transform hover:scale-[1.18] hover:ring-2 hover:ring-ring/40"
                style={{
                  height: cellHeight,
                  ...(value === 0
                    ? { backgroundColor: "var(--muted)" }
                    : { backgroundColor: `var(--ramp-${rampStep(t)})` }),
                }}
                data-step={value === 0 ? undefined : rampStep(t)}
                role="img"
                aria-label={`${rowLabel} ${colLabel}: ${format(value)}`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-semibold">
                {rowLabel} · {colLabel}
              </p>
              <p className="tabular">
                {valueLabel}: {format(value)}
              </p>
              {secondaryFormat && cell?.secondary !== undefined ? (
                <p className="tabular text-muted-foreground">
                  {secondaryLabel}: {secondaryFormat(cell.secondary)}
                </p>
              ) : null}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
