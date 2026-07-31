"use client";

import { useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { seriesColor } from "./palette";
import { TooltipCard } from "./tooltip";

export interface TrendSeries {
  key: string;
  label: string;
  /** area = filled trend, line = comparison overlay, bar = discrete counts. */
  type?: "area" | "line" | "bar";
  format: (value: number) => string;
  /** Overrides the fixed slot order — only for semantically fixed series. */
  color?: string;
}

interface TrendChartProps<T extends object> {
  data: T[];
  series: TrendSeries[];
  xKey: keyof T & string;
  height?: number;
  /** Formats the left axis. All series must share one scale — never two axes. */
  yFormat?: (value: number) => string;
  stacked?: boolean;
  tooltipSubtitle?: (row: T) => string | undefined;
}

export function TrendChart<T extends object>({
  data,
  series,
  xKey,
  height = 280,
  yFormat,
  stacked = false,
  tooltipSubtitle,
}: TrendChartProps<T>) {
  const colors = useMemo(
    () => series.map((s, i) => s.color ?? seriesColor(i)),
    [series],
  );

  // With many buckets, label every nth tick so they never collide.
  const tickInterval = data.length > 40 ? Math.ceil(data.length / 12) : data.length > 14 ? 1 : 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--grid)" strokeDasharray="0" vertical={false} />

        <XAxis
          // Recharts 3 keys its dataKey type off the row generic; the runtime
          // accepts any string, which is what we want for a reusable chart.
          dataKey={xKey as never}
          tickLine={false}
          axisLine={false}
          interval={tickInterval}
          minTickGap={12}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={yFormat}
        />

        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as T;
            const cells = row as Record<string, unknown>;
            return (
              <TooltipCard
                title={String(label)}
                subtitle={tooltipSubtitle?.(row)}
                rows={series.map((s, i) => ({
                  label: s.label,
                  color: colors[i],
                  value: s.format(Number(cells[s.key] ?? 0)),
                }))}
              />
            );
          }}
        />

        {series.map((s, i) => {
          if (s.type === "bar") {
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={colors[i]}
                stackId={stacked ? "stack" : undefined}
                radius={[4, 4, 0, 0]}
                maxBarSize={38}
                // 2px surface gap keeps adjacent and stacked fills from merging.
                stroke="var(--card)"
                strokeWidth={2}
              />
            );
          }
          if (s.type === "line") {
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={colors[i]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
            );
          }
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colors[i]}
              strokeWidth={2}
              // Flat low-opacity wash rather than a gradient: the fill marks
              // area, it isn't decoration, so it shouldn't fade.
              fill={colors[i]}
              fillOpacity={0.12}
              stackId={stacked ? "stack" : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
