"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Compass, MonitorSmartphone, Repeat2, Timer, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { ChartCard, legendFromLabels } from "@/components/charts/chart-card";
import { DonutChart, donutLegend } from "@/components/charts/donut-chart";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { RiskBadge, SegmentBadge, TierBadge } from "@/components/dashboard/badges";
import { DataTable } from "@/components/dashboard/data-table";
import { AnalyticsPage, EmptySection } from "@/components/dashboard/page-state";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsResult, ChannelRecord, CustomerRecord } from "@/lib/analytics/types";
import { formatDate, formatDays } from "@/lib/format";
import { useFormatters, type Formatters } from "@/lib/use-currency";

export default function AcquisitionPage() {
  return <AnalyticsPage>{(data) => <AcquisitionContent data={data} />}</AnalyticsPage>;
}

function AcquisitionContent({ data }: { data: AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  const { acquisition, kpis, customers } = data;
  const nvr = acquisition.newVsReturning;
  const columns = useMemo(() => buildColumns(fmt), [fmt]);

  const channelGroups = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of acquisition.channels) map.set(c.group, (map.get(c.group) ?? 0) + c.revenue);
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [acquisition.channels]);

  return (
    <>
      <StatStrip>
        <StatTile
          label="New customers"
          value={fmt.number(kpis.newCustomers.value)}
          metric={kpis.newCustomers}
          icon={UserPlus}
          footer={`${fmt.currency(nvr.newRevenue)} from first-time buyers`}
        />
        <StatTile
          label="Returning customers"
          value={fmt.number(kpis.returningCustomers.value)}
          metric={kpis.returningCustomers}
          icon={Repeat2}
          footer={`${fmt.currency(nvr.returningRevenue)} from repeat business`}
        />
        <StatTile
          label="New customer revenue share"
          value={fmt.percent(nvr.newShare)}
          icon={Compass}
          hint="Share of net revenue that came from customers placing their first ever order in this period."
          footer={`New AOV ${fmt.currency(nvr.newAverageOrderValue)} · returning ${fmt.currency(
            nvr.returningAverageOrderValue,
          )}`}
        />
        <StatTile
          label="Median time to second order"
          value={
            acquisition.repeatLatency.median === null
              ? "—"
              : `${Math.round(acquisition.repeatLatency.median)} days`
          }
          icon={Timer}
          hint="Across every customer who has ordered at least twice. This is the window a win-back campaign should target."
          footer={
            acquisition.repeatLatency.sample > 0
              ? `${fmt.number(acquisition.repeatLatency.sample)} repeat customers measured`
              : "No repeat purchases yet"
          }
        />
      </StatStrip>

      {/* --- New versus returning ---------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="New versus returning revenue by month"
          description="Acquisition against repeat business"
          legend={legendFromLabels(["New customers", "Returning customers"])}
          footnote="A store leaning almost entirely on returning revenue has an acquisition problem; one leaning on new revenue has a retention problem. Healthy stores show both growing."
        >
          <TrendChart
            data={customers.newVsReturning}
            xKey="label"
            height={280}
            stacked
            yFormat={fmt.currencyCompact}
            series={[
              { key: "newRevenue", label: "New customer revenue", type: "bar", format: fmt.currency },
              { key: "returningRevenue", label: "Returning revenue", type: "bar", format: fmt.currency },
            ]}
            tooltipSubtitle={(row) =>
              `${fmt.number(row.newCustomers)} new · ${fmt.number(row.returning)} returning customers`
            }
          />
        </ChartCard>

        <ChartCard
          title="Time to second order"
          description="How long repeat customers take to come back"
          footnote="Target win-back campaigns just past the peak bucket, before a customer's habit lapses."
        >
          {acquisition.repeatLatency.sample === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No customer has ordered twice within this range yet.
            </p>
          ) : (
            <>
              <RankedBarChart
                data={acquisition.repeatLatency.buckets.map((b) => ({
                  label: b.label,
                  value: b.customers,
                  secondary: fmt.percent(b.share),
                }))}
                format={(v) => `${fmt.number(v)} customers`}
                maxRows={6}
              />
              <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                Quartiles: 25% return within {Math.round(acquisition.repeatLatency.p25 ?? 0)} days, half within{" "}
                {Math.round(acquisition.repeatLatency.median ?? 0)}, 75% within{" "}
                {Math.round(acquisition.repeatLatency.p75 ?? 0)}.
              </p>
            </>
          )}
        </ChartCard>
      </div>

      {/* --- The customer lists ------------------------------------------- */}
      <CustomerLists data={data} fmt={fmt} />

      {/* --- Channels ----------------------------------------------------- */}
      {!acquisition.hasAttribution ? (
        <EmptySection
          icon={Compass}
          title="No attribution data on these orders"
          description="Channel and campaign reporting reads WooCommerce Order Attribution, which core WooCommerce records from version 8.5 onward. Update WooCommerce, or enable Order Attribution under WooCommerce → Settings → Advanced, and it will populate for orders placed from then on."
        />
      ) : (
        <>
          {acquisition.attributedShare < 90 ? (
            <Alert>
              <Compass />
              <AlertTitle>Partial attribution coverage</AlertTitle>
              <AlertDescription>
                {fmt.percent(acquisition.attributedShare)} of orders in this range carry attribution data. Orders
                placed before Order Attribution was enabled have none, so channel totals below understate history.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              className="lg:col-span-2"
              title="Revenue by acquisition channel"
              description="Where orders actually came from, per WooCommerce Order Attribution"
            >
              <RankedBarChart
                data={acquisition.channels.slice(0, 10).map((c) => ({
                  label: c.label,
                  value: c.revenue,
                  secondary: `${fmt.number(c.orders)} orders · ${fmt.percent(c.newCustomerShare)} new`,
                }))}
                format={fmt.currency}
                maxRows={10}
              />
            </ChartCard>

            <ChartCard title="Channel mix" legend={donutLegend(channelGroups)}>
              <DonutChart
                data={channelGroups}
                format={fmt.currency}
                centerValue={fmt.number(acquisition.channels.length)}
                centerLabel="channels"
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Which channels bring new customers"
              description="Share of each channel's buyers that were first-time"
              footnote="High new-customer share means the channel is an acquisition engine; low means it is mostly harvesting demand you already had."
            >
              <RankedBarChart
                data={acquisition.channels
                  .filter((c) => c.customers >= 3)
                  .slice(0, 8)
                  .map((c) => ({
                    label: c.label,
                    value: c.newCustomerShare,
                    secondary: `${fmt.number(c.newCustomers)} of ${fmt.number(c.customers)}`,
                  }))}
                format={fmt.percent}
                maxRows={8}
              />
            </ChartCard>

            <ChartCard
              title="Revenue by device"
              description="What customers actually shop on"
              legend={donutLegend(acquisition.devices.map((d) => ({ label: d.device, value: d.revenue })))}
            >
              <DonutChart
                data={acquisition.devices.map((d) => ({ label: d.device, value: d.revenue }))}
                format={fmt.currency}
                centerValue={fmt.percent(acquisition.devices[0]?.share ?? 0)}
                centerLabel={acquisition.devices[0]?.device.toLowerCase() ?? ""}
              />
            </ChartCard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Channel performance</CardTitle>
              <CardDescription className="text-xs">
                One row per attributed channel. Revenue per customer is the honest comparison here: a channel with
                fewer, better customers beats one with many thin orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={acquisition.channels}
                columns={columns}
                searchAccessor={(c) => `${c.label} ${c.group} ${c.sourceType}`}
                searchPlaceholder="Search channels…"
                initialSorting={[{ id: "revenue", desc: true }]}
                stickyFirstColumn
              />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

/**
 * The two lists a merchant actually asks for by name: who is new, and who came
 * back. Same columns on both so the tabs are directly comparable, with the
 * first-order date carrying the distinction.
 */
function CustomerLists({ data, fmt }: { data: AnalyticsResult; fmt: Formatters }) {
  const [tab, setTab] = useState<"new" | "returning">("new");
  const columns = useMemo(() => buildCustomerColumns(fmt, tab), [fmt, tab]);

  const rows = tab === "new" ? data.customers.newCustomers : data.customers.returningCustomers;

  const COPY = {
    new: "Customers whose first ever order landed inside this period. Their next order is the one that matters: converting them to a second purchase is the single biggest jump in lifetime value.",
    returning:
      "Customers who had already bought before this period began and came back during it. This is retained revenue, not acquisition.",
  } as const;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">
              {tab === "new" ? "New customers" : "Returning customers"}
              <span className="ml-2 font-normal text-muted-foreground">{fmt.number(rows.length)}</span>
            </CardTitle>
            <CardDescription className="max-w-prose text-xs">{COPY[tab]}</CardDescription>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "returning")}>
            <TabsList>
              <TabsTrigger value="new" className="gap-1.5">
                <UserPlus className="size-3.5" />
                New ({fmt.number(data.customers.newCustomers.length)})
              </TabsTrigger>
              <TabsTrigger value="returning" className="gap-1.5">
                <Repeat2 className="size-3.5" />
                Returning ({fmt.number(data.customers.returningCustomers.length)})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          data={rows}
          columns={columns}
          searchAccessor={(c) => `${c.name} ${c.email} ${c.company} ${c.segment} ${c.tier}`}
          searchPlaceholder="Search by name, email or company…"
          initialSorting={[{ id: "netRevenue", desc: true }]}
          emptyMessage={
            tab === "new"
              ? "No first-time customers in this period."
              : "No previously-seen customers ordered in this period."
          }
          stickyFirstColumn
        />
      </CardContent>
    </Card>
  );
}

function buildCustomerColumns(fmt: Formatters, tab: "new" | "returning"): ColumnDef<CustomerRecord, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {row.original.email || "guest checkout"}
          </p>
        </div>
      ),
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
      accessorKey: "firstOrderDate",
      header: tab === "new" ? "First order" : "Customer since",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{formatDate(row.original.firstOrderDate)}</span>
      ),
    },
    {
      accessorKey: "recencyDays",
      header: "Last order",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span className="whitespace-nowrap" title={formatDate(row.original.lastOrderDate)}>
          {formatDays(row.original.recencyDays)} ago
        </span>
      ),
    },
    {
      accessorKey: "churnRisk",
      header: "Churn risk",
      meta: { align: "right" },
      cell: ({ row }) => <RiskBadge risk={row.original.churnRisk} />,
    },
    {
      id: "topProduct",
      header: "First bought",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.topProducts[0]?.name ?? "—"}</span>
      ),
    },
  ];
}

function buildColumns(fmt: Formatters): ColumnDef<ChannelRecord, unknown>[] {
  return [
    {
      accessorKey: "label",
      header: "Channel",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{row.original.group}</p>
        </div>
      ),
    },
    {
      accessorKey: "orders",
      header: "Orders",
      meta: { align: "right" },
      cell: ({ row }) => fmt.number(row.original.orders),
    },
    {
      accessorKey: "revenue",
      header: "Revenue",
      meta: { align: "right" },
      cell: ({ row }) => <span className="font-medium">{fmt.currency(row.original.revenue)}</span>,
    },
    {
      accessorKey: "share",
      header: "Share",
      meta: { align: "right" },
      cell: ({ row }) => fmt.percent(row.original.share),
    },
    {
      accessorKey: "customers",
      header: "Customers",
      meta: { align: "right" },
      cell: ({ row }) => fmt.number(row.original.customers),
    },
    {
      accessorKey: "newCustomerShare",
      header: "New customers",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span>
          {fmt.percent(row.original.newCustomerShare)}
          <span className="ml-1 text-[11px] text-muted-foreground">
            ({fmt.number(row.original.newCustomers)})
          </span>
        </span>
      ),
    },
    {
      accessorKey: "averageOrderValue",
      header: "AOV",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.averageOrderValue),
    },
    {
      accessorKey: "revenuePerCustomer",
      header: "Revenue / customer",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.revenuePerCustomer),
    },
    {
      accessorKey: "topDevice",
      header: "Top device",
      cell: ({ row }) => (
        <Badge variant="outline" className="gap-1 text-[10px]">
          <MonitorSmartphone className="size-3" />
          {row.original.topDevice}
        </Badge>
      ),
    },
    {
      accessorKey: "averageSessionPages",
      header: "Pages / session",
      meta: { align: "right" },
      cell: ({ row }) =>
        row.original.averageSessionPages === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          fmt.decimal(row.original.averageSessionPages)
        ),
    },
  ];
}
