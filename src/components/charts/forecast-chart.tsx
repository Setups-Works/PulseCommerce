"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastPoint } from "@/lib/analytics/types";
import { seriesColor } from "./palette";
import { TooltipCard } from "./tooltip";

/**
 * Actuals and projection on one axis, with the uncertainty band drawn as a
 * range area. The forecast line is visually distinct by dash pattern as well as
 * hue, so the actual/projected split doesn't rely on colour alone.
 */
export function ForecastChart({
  data,
  height = 300,
  format,
  axisFormat,
}: {
  data: ForecastPoint[];
  height?: number;
  format: (value: number) => string;
  axisFormat: (value: number) => string;
}) {
  const actualColor = seriesColor(0);
  const forecastColor = seriesColor(1);

  // Recharts stacks the band as [lower, height-of-band].
  const shaped = data.map((p) => ({
    ...p,
    band: p.lower !== null && p.upper !== null ? [p.lower, p.upper] : null,
  }));

  const firstForecast = data.find((p) => p.actual === null)?.label;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={shaped} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={Math.ceil(data.length / 10)}
          minTickGap={12}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={axisFormat}
        />

        {firstForecast ? (
          <ReferenceLine
            x={firstForecast}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: "Forecast →",
              position: "insideTopRight",
              fill: "var(--muted-foreground)",
              fontSize: 10,
            }}
          />
        ) : null}

        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as ForecastPoint & { band: [number, number] | null };
            const rows = [];
            if (row.actual !== null) rows.push({ label: "Actual", value: format(row.actual), color: actualColor });
            if (row.forecast !== null)
              rows.push({ label: "Forecast", value: format(row.forecast), color: forecastColor });
            if (row.band)
              rows.push({
                label: "95% range",
                value: `${format(row.band[0])} – ${format(row.band[1])}`,
                muted: true,
              });
            return <TooltipCard title={String(label)} rows={rows} />;
          }}
        />

        <Area
          dataKey="band"
          stroke="none"
          fill={forecastColor}
          fillOpacity={0.14}
          isAnimationActive={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke={actualColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          name="Forecast"
          stroke={forecastColor}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
