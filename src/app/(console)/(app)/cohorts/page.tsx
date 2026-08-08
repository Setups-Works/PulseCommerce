"use client";

import { CalendarRange, Repeat, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { CohortMatrix } from "@/components/charts/cohort-matrix";
import { TrendChart } from "@/components/charts/trend-chart";
import { AnalyticsPage, EmptySection } from "@/components/dashboard/page-state";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Card } from "@heroui/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsResult } from "@/lib/analytics/types";
import { useFormatters } from "@/lib/use-currency";

export default function CohortsPage() {
  return <AnalyticsPage>{(data) => <CohortsContent data={data} />}</AnalyticsPage>;
}

function CohortsContent({ data }: { data: AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  const { cohorts, customers } = data;
  const [mode, setMode] = useState<"retention" | "revenue">("retention");

  if (cohorts.rows.length === 0) {
    return (
      <EmptySection
        icon={CalendarRange}
        title="Not enough history for cohort analysis"
        description="Cohorts need several months of orders to say anything useful. Widen the history window in Settings, or come back once the store has more trading history."
      />
    );
  }

  const monthOne = cohorts.averageRetention[1];
  const monthThree = cohorts.averageRetention[3];
  const monthSix = cohorts.averageRetention[6];
  const totalAcquired = cohorts.rows.reduce((s, r) => s + r.size, 0);
  const ltv12 = cohorts.ltvCurve.at(-1)?.value ?? 0;

  return (
    <>
      <StatStrip>
        <StatTile
          label="Customers acquired"
          value={fmt.number(totalAcquired)}
          icon={Users}
          footer={`across ${cohorts.rows.length} monthly cohort${cohorts.rows.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Month-1 retention"
          value={monthOne === null || monthOne === undefined ? "—" : fmt.percent(monthOne)}
          icon={Repeat}
          hint="Average share of each cohort that placed another order in the month after they first bought."
        />
        <StatTile
          label="Month-3 retention"
          value={monthThree === null || monthThree === undefined ? "—" : fmt.percent(monthThree)}
          icon={Repeat}
          footer={
            monthSix === null || monthSix === undefined ? undefined : `Month 6: ${fmt.percent(monthSix)}`
          }
        />
        <StatTile
          label="Cumulative LTV"
          value={fmt.currency(ltv12)}
          icon={TrendingUp}
          hint="Average revenue per acquired customer accumulated over the months since acquisition — the realised counterpart to the predicted CLV on the Customers page."
          footer={`Predicted CLV averages ${fmt.currency(customers.averages.clv)}`}
        />
      </StatStrip>

      <Card>
        <Card.Header className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <Card.Title className="text-sm font-semibold">Acquisition cohorts</Card.Title>
              <Card.Description className="text-xs">
                Each row is everyone who first bought in that month. M0 is the acquisition month itself; blank cells
                haven&apos;t elapsed yet, so they read as missing rather than as zero.
              </Card.Description>
            </div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "retention" | "revenue")}>
              <TabsList>
                <TabsTrigger value="retention">Retention</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card.Header>
        <Card.Content>
          <CohortMatrix
            rows={cohorts.rows}
            periods={cohorts.periods}
            averageRetention={cohorts.averageRetention}
            currencyFormat={fmt.currency}
            mode={mode}
          />
        </Card.Content>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Average retention curve"
          description="Share of a cohort still buying, by month since acquisition"
          footnote="A curve that flattens after month 2 or 3 is healthy — it means a loyal core has formed. One that keeps falling means retention work has more headroom than acquisition."
        >
          <TrendChart
            data={cohorts.averageRetention
              .map((value, month) => ({ label: `M${month}`, retention: value ?? 0, month }))
              .filter((d) => d.month === 0 || d.retention > 0)}
            xKey="label"
            height={260}
            yFormat={(v) => `${v.toFixed(0)}%`}
            series={[{ key: "retention", label: "Retention", type: "area", format: fmt.percent }]}
          />
        </ChartCard>

        <ChartCard
          title="Cumulative revenue per acquired customer"
          description="How much an average customer is worth as months pass"
          footnote="Compare the plateau against your customer acquisition cost to see how long payback takes."
        >
          <TrendChart
            data={cohorts.ltvCurve.map((d) => ({ label: `M${d.month}`, value: d.value }))}
            xKey="label"
            height={260}
            yFormat={fmt.compact}
            series={[{ key: "value", label: "Cumulative revenue", type: "area", format: fmt.currency }]}
          />
        </ChartCard>
      </div>

      <Card>
        <Card.Header>
          <Card.Title className="text-sm font-semibold">Cohort totals</Card.Title>
          <Card.Description className="text-xs">
            Total revenue each cohort has produced since acquisition, alongside its size.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <TrendChart
            data={cohorts.rows.map((r) => ({
              label: r.label,
              revenue: r.totalRevenue,
              size: r.size,
              perCustomer: r.size ? r.totalRevenue / r.size : 0,
            }))}
            xKey="label"
            height={240}
            yFormat={fmt.compact}
            series={[{ key: "revenue", label: "Cohort revenue", type: "bar", format: fmt.currency }]}
            tooltipSubtitle={(row) =>
              `${fmt.number(row.size)} customers · ${fmt.currency(row.perCustomer)} each`
            }
          />
        </Card.Content>
      </Card>
    </>
  );
}
