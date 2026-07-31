"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPercent } from "@/lib/format";
import { seriesColor } from "./palette";
import { TooltipCard } from "./tooltip";

export interface ParetoDatum {
  label: string;
  share: number;
  cumulativeShare: number;
  value: number;
}

/**
 * Pareto view.
 *
 * The textbook version puts counts on the left axis and cumulative percent on
 * the right — a dual-axis chart, which is the single most misleading chart
 * form. Both series are expressed as percentages of the whole instead, so one
 * 0–100% axis carries everything and the crossover point is honest.
 */
export function ParetoChart({
  data,
  height = 300,
  format,
  valueLabel = "Revenue",
}: {
  data: ParetoDatum[];
  height?: number;
  format: (value: number) => string;
  valueLabel?: string;
}) {
  const shareColor = seriesColor(0);
  const cumulativeColor = seriesColor(1);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={data.length > 16 ? Math.ceil(data.length / 10) : 0}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          tickMargin={8}
          height={48}
          angle={-30}
          textAnchor="end"
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v: number) => `${v}%`}
        />

        {/* The 80% line is what makes a Pareto chart readable at a glance. */}
        <ReferenceLine
          y={80}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{ value: "80%", position: "right", fill: "var(--muted-foreground)", fontSize: 10 }}
        />

        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as ParetoDatum;
            return (
              <TooltipCard
                title={row.label}
                rows={[
                  { label: valueLabel, value: format(row.value) },
                  { label: "Share of total", value: formatPercent(row.share), color: shareColor },
                  { label: "Cumulative", value: formatPercent(row.cumulativeShare), color: cumulativeColor },
                ]}
              />
            );
          }}
        />

        <Bar
          dataKey="share"
          name="Share of total"
          fill={shareColor}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
          stroke="var(--card)"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="cumulativeShare"
          name="Cumulative share"
          stroke={cumulativeColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
