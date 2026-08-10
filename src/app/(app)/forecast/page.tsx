"use client";

import { CalendarClock, ChartSpline, Sigma, TrendingUp } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { seriesColor } from "@/components/charts/palette";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { AiSummary } from "@/components/dashboard/ai-summary";
import { InsightList } from "@/components/dashboard/insight-list";
import { AnalyticsPage, EmptySection } from "@/components/dashboard/page-state";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsResult } from "@/lib/analytics/types";
import { formatDate } from "@/lib/format";
import { useFormatters } from "@/lib/use-currency";

export default function ForecastPage() {
  return <AnalyticsPage>{(data) => <ForecastContent data={data} />}</AnalyticsPage>;
}

function ForecastContent({ data }: { data: AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  const { forecast, timeseries, operations, kpis } = data;

  const projected = forecast.filter((f) => f.actual === null);
  const horizon = projected.length;

  if (horizon === 0) {
    return (
      <EmptySection
        icon={ChartSpline}
        title="Not enough data points to forecast"
        description="A trend and weekday-seasonality fit needs at least two weeks of daily history inside the selected range. Widen the range and this page will populate."
      />
    );
  }

  const projectedTotal = projected.reduce((s, f) => s + (f.forecast ?? 0), 0);
  const lowerTotal = projected.reduce((s, f) => s + (f.lower ?? 0), 0);
  const upperTotal = projected.reduce((s, f) => s + (f.upper ?? 0), 0);

  const actualDays = forecast.filter((f) => f.actual !== null).length;
  const recentDaily = kpis.netRevenue.value / Math.max(1, actualDays);
  const projectedDaily = projectedTotal / horizon;
  const pace = recentDaily > 0 ? projectedDaily / recentDaily - 1 : null;

  return (
    <>
      <StatStrip>
        <StatTile
          label={`Projected next ${horizon} days`}
          value={fmt.currency(projectedTotal)}
          icon={TrendingUp}
          footer={`Range ${fmt.currencyCompact(lowerTotal)} – ${fmt.currencyCompact(upperTotal)}`}
        />
        <StatTile
          label="Projected daily average"
          value={fmt.currency(projectedDaily)}
          icon={Sigma}
          footer={`Recent actual average ${fmt.currency(recentDaily)}`}
        />
        <StatTile
          label="Implied pace"
          value={pace === null ? "—" : `${pace >= 0 ? "+" : ""}${(pace * 100).toFixed(1)}%`}
          icon={ChartSpline}
          hint="How the projected daily run-rate compares with the average actual day inside the selected range."
        />
        <StatTile
          label="Forecast horizon"
          value={`${horizon} days`}
          icon={CalendarClock}
          footer={`To ${formatDate(projected.at(-1)?.date ?? "")}`}
        />
      </StatStrip>

      <AiSummary question="Summarise the outlook: the revenue trend, what next month looks like, and how much confidence the figures support. Three sentences." />

      <ChartCard
        title="Revenue forecast"
        description="Daily net revenue, actuals then projection"
        legend={[
          { label: "Actual", color: seriesColor(0) },
          { label: "Forecast (dashed)", color: seriesColor(1) },
        ]}
        footnote="Ordinary least squares on the level, multiplied by day-of-week factors, with a 95% band from in-sample residuals. It answers 'are we pacing ahead or behind' — it does not know about your promotions, stockouts or seasonality beyond the selected window."
      >
        <ForecastChart data={forecast} format={fmt.currency} axisFormat={fmt.currencyCompact} />
      </ChartCard>

      <Alert>
        <ChartSpline />
        <AlertTitle>How to read this</AlertTitle>
        <AlertDescription>
          The band widens with uncertainty, not with time — it is a constant 95% interval on how far actual days
          scattered around the fitted line. If your actuals routinely fall outside it, the underlying trend has
          changed and the fit is stale; refresh with a longer range.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Weekday seasonality"
          description="The pattern the forecast leans on"
          footnote="These multipliers are what shape the sawtooth in the projection above."
        >
          <RankedBarChart
            data={operations.weekdayPerformance.map((d) => ({
              label: d.label,
              value: d.revenue,
              secondary: `${d.orders} orders`,
            }))}
            format={fmt.currency}
            maxRows={7}
          />
        </ChartCard>

        <ChartCard
          title="Actual daily revenue in range"
          description="What the model was fitted on"
        >
          <TrendChart
            data={timeseries}
            xKey="label"
            height={260}
            yFormat={fmt.currencyCompact}
            series={[{ key: "netRevenue", label: "Net revenue", type: "area", format: fmt.currency }]}
            tooltipSubtitle={(row) => `${fmt.number(row.orders)} orders`}
          />
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Context for the projection</CardTitle>
          <CardDescription className="text-xs">
            Findings that would move the forecast if they went unaddressed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InsightList
            insights={data.insights.filter((i) =>
              ["revenue-trend", "forecast", "stock-risk", "churn-risk", "repeat-rate"].includes(i.id),
            )}
          />
        </CardContent>
      </Card>
    </>
  );
}
