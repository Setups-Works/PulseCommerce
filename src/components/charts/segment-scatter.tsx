"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { CustomerRecord } from "@/lib/analytics/types";
import { formatCurrency, formatDays, formatNumber } from "@/lib/format";
import { ALL_PAIRS_SAFE_SLOTS, seriesColor } from "./palette";
import { TooltipCard } from "./tooltip";

/**
 * Recency vs frequency, sized by spend — the visual form of the RFM table.
 *
 * A scatter compares every pair of colours at once, and the palette only
 * validates three slots under all-pairs, so customers are bucketed into exactly
 * three value bands rather than ten segments.
 */
const BANDS = [
  { id: "high", label: "High value (top 20%)", test: (c: CustomerRecord) => c.revenuePercentile >= 80 },
  { id: "mid", label: "Mid value", test: (c: CustomerRecord) => c.revenuePercentile >= 40 },
  { id: "low", label: "Low value (bottom 40%)", test: () => true },
] as const;

export function SegmentScatter({
  customers,
  currency,
  height = 320,
}: {
  customers: CustomerRecord[];
  currency: string;
  height?: number;
}) {
  const grouped = BANDS.map((band, i) => ({
    ...band,
    color: seriesColor(Math.min(i, ALL_PAIRS_SAFE_SLOTS - 1)),
    points: [] as CustomerRecord[],
  }));

  for (const c of customers) {
    const band = grouped.find((b) => b.test(c)) ?? grouped[grouped.length - 1];
    band.points.push(c);
  }

  const maxRevenue = Math.max(...customers.map((c) => c.netRevenue), 1);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: 0 }}>
        <CartesianGrid stroke="var(--grid)" />
        <XAxis
          type="number"
          dataKey="recencyDays"
          name="Days since last order"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          label={{
            value: "Days since last order →",
            position: "insideBottom",
            offset: -8,
            fill: "var(--muted-foreground)",
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          dataKey="orders"
          name="Orders"
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          label={{
            value: "Orders",
            angle: -90,
            position: "insideLeft",
            fill: "var(--muted-foreground)",
            fontSize: 11,
          }}
        />
        <ZAxis type="number" dataKey="netRevenue" range={[36, 420]} domain={[0, maxRevenue]} />

        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "var(--muted-foreground)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const c = payload[0].payload as CustomerRecord;
            return (
              <TooltipCard
                title={c.name}
                subtitle={c.company || c.email}
                rows={[
                  { label: "Net revenue", value: formatCurrency(c.netRevenue, currency) },
                  { label: "Orders", value: formatNumber(c.orders) },
                  { label: "Last order", value: formatDays(c.recencyDays) + " ago" },
                  { label: "Segment", value: c.segment, muted: true },
                  { label: "Predicted CLV", value: formatCurrency(c.predictedClv, currency), muted: true },
                ]}
              />
            );
          }}
        />

        {grouped.map((band) => (
          <Scatter
            key={band.id}
            name={band.label}
            data={band.points}
            fill={band.color}
            fillOpacity={0.55}
            // 2px surface ring keeps overlapping marks separable.
            stroke="var(--card)"
            strokeWidth={2}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export const SCATTER_BANDS = BANDS.map((b, i) => ({
  label: b.label,
  color: seriesColor(Math.min(i, ALL_PAIRS_SAFE_SLOTS - 1)),
}));
