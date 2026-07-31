"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleDollarSign, Repeat, TrendingDown, TriangleAlert, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChartCard, legendFromLabels } from "@/components/charts/chart-card";
import { ParetoChart } from "@/components/charts/pareto-chart";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { SCATTER_BANDS, SegmentScatter } from "@/components/charts/segment-scatter";
import { seriesColor } from "@/components/charts/palette";
import { TrendChart } from "@/components/charts/trend-chart";
import { RiskBadge, SegmentBadge, TierBadge } from "@/components/dashboard/badges";
import { DataTable } from "@/components/dashboard/data-table";
import { AnalyticsPage, EmptySection } from "@/components/dashboard/page-state";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsResult, CustomerRecord } from "@/lib/analytics/types";
import { formatDate, formatDays, initials } from "@/lib/format";
import { useFormatters, type Formatters } from "@/lib/use-currency";

export default function CustomersPage() {
  return <AnalyticsPage>{(data) => <CustomersContent data={data} />}</AnalyticsPage>;
}

type CohortTab = "top" | "low" | "risk" | "rising" | "all";

function CustomersContent({ data }: { data: AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  const { customers, kpis } = data;
  const [tab, setTab] = useState<CohortTab>("top");
  const router = useRouter();

  const columns = useMemo(() => buildColumns(fmt), [fmt]);

  const paretoData = useMemo(
    () =>
      customers.deciles.map((d) => ({
        label: d.label,
        share: d.share,
        cumulativeShare: d.cumulativeShare,
        value: d.revenue,
      })),
    [customers.deciles],
  );

  const rows: Record<CohortTab, CustomerRecord[]> = {
    top: customers.topCustomers,
    low: customers.lowValueCustomers,
    risk: customers.atRiskCustomers,
    rising: customers.risingCustomers,
    all: customers.records,
  };

  const TAB_COPY: Record<CohortTab, string> = {
    top: "Your highest-spending customers this period. These are the accounts a retention programme should protect first.",
    low: "Lowest-spending customers who still bought something. Worth testing a reactivation offer before writing them off.",
    risk: "Customers whose silence has run well past their own usual reorder gap, ranked by how much revenue is at stake.",
    rising: "Bought recently, more than once, and building momentum — the natural audience for an upsell.",
    all: "Every customer active in the selected period.",
  };

  if (customers.records.length === 0) {
    return (
      <EmptySection
        title="No customer activity in this period"
        description="No revenue-bearing orders fell inside the selected date range, so there is nothing to segment. Widen the range from the picker above."
        icon={Users}
      />
    );
  }

  return (
    <>
      <StatStrip>
        <StatTile
          label="Active customers"
          value={fmt.number(kpis.activeCustomers.value)}
          metric={kpis.activeCustomers}
          icon={Users}
          footer={`${fmt.number(kpis.newCustomers.value)} new · ${fmt.number(kpis.returningCustomers.value)} returning`}
        />
        <StatTile
          label="Average predicted CLV"
          value={fmt.currency(customers.averages.clv)}
          icon={CircleDollarSign}
          hint="Revenue booked so far plus a 12-month projection at each customer's observed order rate, discounted by their churn risk."
          footer={`${fmt.currency(kpis.revenuePerCustomer.value)} realised per customer this period`}
        />
        <StatTile
          label="Repeat rate in period"
          value={fmt.percent(customers.averages.repeatRate)}
          icon={Repeat}
          hint="Share of customers who placed more than one order inside the selected range. On a short range this will always be far below the returning-customer rate."
          footer={`${fmt.percent(customers.averages.oneTimeBuyerShare)} bought exactly once`}
        />
        <StatTile
          label="Revenue concentration"
          value={fmt.percent(customers.concentration.top10Share)}
          icon={TrendingDown}
          hint="Share of revenue held by the top 10% of customers. A Gini above 0.6 means the business leans heavily on a small group."
          footer={`Gini ${customers.concentration.giniCoefficient.toFixed(2)} · bottom half contributes ${fmt.percent(
            customers.concentration.bottom50Share,
          )}`}
        />
      </StatStrip>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-3"
          title="Value distribution across the customer base"
          description="Customers ranked best-first and split into ten equal groups"
          footnote="Both series are percentages of total revenue, so a single axis carries the bars and the cumulative curve. The dashed line marks the 80% threshold."
          legend={[
            { label: "Share of revenue", color: seriesColor(0) },
            { label: "Cumulative share", color: seriesColor(1) },
          ]}
        >
          <ParetoChart data={paretoData} format={fmt.currency} valueLabel="Revenue" />
        </ChartCard>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Concentration checkpoints</CardTitle>
            <CardDescription className="text-xs">Share of net revenue held by each slice</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarChart
              data={[
                { label: "Top 1% of customers", value: customers.concentration.top1Share },
                { label: "Top 5%", value: customers.concentration.top5Share },
                { label: "Top 10%", value: customers.concentration.top10Share },
                { label: "Top 20%", value: customers.concentration.top20Share },
                { label: "Bottom 50%", value: customers.concentration.bottom50Share },
              ]}
              format={fmt.percent}
              maxRows={5}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="RFM segments"
          description="Recency, frequency and monetary scores mapped to the standard segment matrix"
          footnote="Scores are quintiles within your own customer base, so segments stay meaningful whatever the absolute numbers look like."
        >
          <RankedBarChart
            data={customers.segmentBreakdown.map((s) => ({
              label: s.segment,
              value: s.revenue,
              secondary: `${s.customers} customers`,
            }))}
            format={fmt.currency}
            maxRows={10}
          />
        </ChartCard>

        <ChartCard
          title="Recency versus frequency"
          description="Each bubble is a customer; size is net revenue"
          legend={SCATTER_BANDS}
          footnote="Bubbles toward the top-left are your best accounts: buying often, and recently. The far right is where churn lives."
        >
          <SegmentScatter customers={customers.records.slice(0, 600)} currency={data.meta.currency} />
        </ChartCard>
      </div>

      <ChartCard
        title="New versus returning customers"
        description="Monthly acquisition against repeat business"
        legend={legendFromLabels(["New customers", "Returning customers"])}
      >
        <TrendChart
          data={customers.newVsReturning}
          xKey="label"
          height={260}
          stacked
          yFormat={fmt.compact}
          series={[
            { key: "newCustomers", label: "New customers", type: "bar", format: fmt.number },
            { key: "returning", label: "Returning customers", type: "bar", format: fmt.number },
          ]}
          tooltipSubtitle={(row) =>
            `${fmt.currency(row.newRevenue)} from new · ${fmt.currency(row.returningRevenue)} from returning`
          }
        />
      </ChartCard>

      {/* --- The ledger --------------------------------------------------- */}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">Customer ledger</CardTitle>
              <CardDescription className="text-xs">{TAB_COPY[tab]}</CardDescription>
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as CohortTab)}>
              <TabsList>
                <TabsTrigger value="top">High value</TabsTrigger>
                <TabsTrigger value="low">Low value</TabsTrigger>
                <TabsTrigger value="risk" className="gap-1.5">
                  <TriangleAlert className="size-3.5" />
                  At risk
                </TabsTrigger>
                <TabsTrigger value="rising">Rising</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab}>
            <TabsContent value={tab} forceMount>
              <DataTable
                data={rows[tab]}
                columns={columns}
                searchAccessor={(c) => `${c.name} ${c.email} ${c.company} ${c.segment} ${c.tier}`}
                searchPlaceholder="Search by name, email, company or segment…"
                initialSorting={[{ id: "netRevenue", desc: true }]}
                emptyMessage="No customers match this view for the selected period."
                onRowClick={(c) => router.push(`/customers/${encodeURIComponent(c.key)}`)}
                stickyFirstColumn
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}

function buildColumns(fmt: Formatters): ColumnDef<CustomerRecord, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              {initials(c.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{c.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{c.email || "guest checkout"}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) =>
        row.original.company ? (
          <span className="text-xs">{row.original.company}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "tier",
      header: "Tier",
      cell: ({ row }) => <TierBadge tier={row.original.tier} />,
    },
    {
      accessorKey: "segment",
      header: "Segment",
      cell: ({ row }) => <SegmentBadge segment={row.original.segment} />,
    },
    {
      accessorKey: "orders",
      header: "Orders",
      meta: { align: "right" },
      cell: ({ row }) => fmt.number(row.original.orders),
    },
    {
      accessorKey: "netRevenue",
      header: "Net revenue",
      meta: { align: "right" },
      cell: ({ row }) => <span className="font-medium">{fmt.currency(row.original.netRevenue)}</span>,
    },
    {
      accessorKey: "averageOrderValue",
      header: "AOV",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.averageOrderValue),
    },
    {
      accessorKey: "predictedClv",
      header: "Predicted CLV",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.predictedClv),
    },
    {
      accessorKey: "recencyDays",
      header: "Last order",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span title={formatDate(row.original.lastOrderDate)}>{formatDays(row.original.recencyDays)} ago</span>
      ),
    },
    {
      accessorKey: "churnRisk",
      header: "Churn risk",
      meta: { align: "right" },
      cell: ({ row }) => <RiskBadge risk={row.original.churnRisk} />,
    },
    {
      id: "rfm",
      header: "R/F/M",
      meta: { align: "center" },
      cell: ({ row }) => {
        const c = row.original;
        return (
          <Badge variant="outline" className="tabular text-[10px] font-mono">
            {c.recencyScore}·{c.frequencyScore}·{c.monetaryScore}
          </Badge>
        );
      },
    },
    {
      id: "topProduct",
      header: "Top product",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.topProducts[0]?.name ?? "—"}</span>
      ),
    },
  ];
}
