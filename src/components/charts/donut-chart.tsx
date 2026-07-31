"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatPercent } from "@/lib/format";
import { seriesColor } from "./palette";
import { TooltipCard } from "./tooltip";

export interface DonutDatum {
  label: string;
  value: number;
}

/**
 * Part-to-whole for a handful of categories. Anything past the sixth slice is
 * folded into "Other" — a donut with fifteen wedges is a table in disguise.
 */
export function DonutChart({
  data,
  format,
  height = 220,
  centerLabel,
  centerValue,
  maxSlices = 6,
}: {
  data: DonutDatum[];
  format: (value: number) => string;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  maxSlices?: number;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, maxSlices);
  const tail = sorted.slice(maxSlices);
  const slices = tail.length
    ? [...head, { label: `Other (${tail.length})`, value: tail.reduce((s, d) => s + d.value, 0) }]
    : head;

  const total = slices.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DonutDatum;
              const index = slices.findIndex((s) => s.label === d.label);
              return (
                <TooltipCard
                  title={d.label}
                  rows={[
                    { label: "Value", value: format(d.value), color: seriesColor(index) },
                    { label: "Share", value: formatPercent((d.value / total) * 100) },
                  ]}
                />
              );
            }}
          />
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="92%"
            // 2px surface gap so adjacent wedges never merge into one shape.
            paddingAngle={1.5}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {slices.map((slice, i) => (
              <Cell key={slice.label} fill={seriesColor(i)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tracking-tight">{centerValue}</span>
          {centerLabel ? <span className="text-[11px] text-muted-foreground">{centerLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function donutLegend(data: DonutDatum[], maxSlices = 6) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, maxSlices);
  const tailCount = sorted.length - head.length;
  const labels = tailCount > 0 ? [...head.map((d) => d.label), `Other (${tailCount})`] : head.map((d) => d.label);
  return labels.map((label, i) => ({ label, color: seriesColor(i) }));
}
