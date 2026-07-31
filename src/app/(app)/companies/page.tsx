"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownRight, ArrowUpRight, Building2, Handshake, Users2, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart, donutLegend } from "@/components/charts/donut-chart";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { TierBadge } from "@/components/dashboard/badges";
import { DataTable } from "@/components/dashboard/data-table";
import { AnalyticsPage, EmptySection } from "@/components/dashboard/page-state";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AnalyticsResult, CompanyRecord } from "@/lib/analytics/types";
import { formatChange, formatDate, formatDays } from "@/lib/format";
import { useFormatters, type Formatters } from "@/lib/use-currency";

export default function CompaniesPage() {
  return <AnalyticsPage>{(data) => <CompaniesContent data={data} />}</AnalyticsPage>;
}

function CompaniesContent({ data }: { data: AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  const { companies } = data;
  const totals = companies.totals;
  const columns = useMemo(() => buildColumns(fmt), [fmt]);

  if (companies.companies.length === 0) {
    return (
      <EmptySection
        icon={Building2}
        title="No business accounts detected"
        description={
          "WooCommerce has no company object — this view groups orders by the billing company field, and falls back to inferring an organisation from the email domain when several different people order from the same non-consumer domain. Neither signal appears in this store's orders, which is normal for a purely direct-to-consumer shop."
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/customers">Analyse individual customers instead</Link>
          </Button>
        }
      />
    );
  }

  const mixData = [
    { label: "Business accounts", value: totals.b2bRevenue },
    { label: "Direct to consumer", value: totals.b2cRevenue },
  ];

  const inferredCount = companies.companies.filter((c) => c.source === "email-domain").length;

  return (
    <>
      <StatStrip>
        <StatTile
          label="Business accounts"
          value={fmt.number(totals.companyCount)}
          icon={Building2}
          footer={
            inferredCount > 0
              ? `${totals.companyCount - inferredCount} from billing company · ${inferredCount} inferred from email domain`
              : "All from the billing company field"
          }
        />
        <StatTile
          label="B2B revenue"
          value={fmt.currency(totals.b2bRevenue)}
          icon={Wallet}
          footer={`${fmt.percent(totals.b2bShare)} of total net revenue`}
        />
        <StatTile
          label="B2B average order"
          value={fmt.currency(totals.b2bAverageOrderValue)}
          icon={Handshake}
          footer={
            totals.b2cAverageOrderValue > 0
              ? `${(totals.b2bAverageOrderValue / totals.b2cAverageOrderValue).toFixed(1)}× the consumer average of ${fmt.currency(
                  totals.b2cAverageOrderValue,
                )}`
              : "No consumer orders to compare against"
          }
        />
        <StatTile
          label="B2B orders"
          value={fmt.number(totals.b2bOrders)}
          icon={Users2}
          footer={`${fmt.number(totals.b2cOrders)} consumer orders in the same period`}
        />
      </StatStrip>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Top accounts by revenue"
          description="Net revenue contributed in the selected period"
        >
          <RankedBarChart
            data={companies.companies.slice(0, 10).map((c) => ({
              label: c.name,
              value: c.netRevenue,
              secondary: `${c.orders} orders · ${c.buyers} buyer${c.buyers === 1 ? "" : "s"}`,
            }))}
            format={fmt.currency}
            maxRows={10}
          />
        </ChartCard>

        <ChartCard title="Revenue mix" legend={donutLegend(mixData)}>
          <DonutChart
            data={mixData}
            format={fmt.currency}
            centerValue={fmt.percent(totals.b2bShare)}
            centerLabel="from business"
          />
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Account register</CardTitle>
          <CardDescription className="text-xs">
            One row per company. &ldquo;Detected via&rdquo; shows whether the account came from the billing company
            field or was inferred from a shared email domain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={companies.companies}
            columns={columns}
            searchAccessor={(c) => `${c.name} ${c.countries.join(" ")} ${c.contacts.map((x) => x.email).join(" ")}`}
            searchPlaceholder="Search accounts…"
            initialSorting={[{ id: "netRevenue", desc: true }]}
            stickyFirstColumn
          />
        </CardContent>
      </Card>
    </>
  );
}

function buildColumns(fmt: Formatters): ColumnDef<CompanyRecord, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Company",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {row.original.contacts[0]?.email ?? "—"}
            {row.original.contacts.length > 1 ? ` +${row.original.contacts.length - 1} more` : ""}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "source",
      header: "Detected via",
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px]">
              {row.original.source === "billing" ? "Billing field" : "Email domain"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-[18rem] text-xs">
            {row.original.source === "billing"
              ? "Taken directly from the company field on the WooCommerce billing address."
              : "Inferred because two or more different customers order from this non-consumer email domain. Treat as a heuristic."}
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      accessorKey: "tier",
      header: "Tier",
      cell: ({ row }) => <TierBadge tier={row.original.tier} />,
    },
    {
      accessorKey: "buyers",
      header: "Buyers",
      meta: { align: "right" },
      cell: ({ row }) => fmt.number(row.original.buyers),
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
      accessorKey: "revenueShare",
      header: "Share of B2B",
      meta: { align: "right" },
      cell: ({ row }) => fmt.percent(row.original.revenueShare),
    },
    {
      accessorKey: "growth",
      header: "MoM growth",
      meta: { align: "right" },
      cell: ({ row }) => {
        const growth = row.original.growth;
        if (growth === null) return <span className="text-muted-foreground">—</span>;
        const up = growth >= 0;
        return (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-medium"
            style={{ color: up ? "var(--good)" : "var(--critical)" }}
          >
            {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {formatChange(growth)}
          </span>
        );
      },
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
      id: "topProduct",
      header: "Top product",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.topProducts[0]?.name ?? "—"}</span>
      ),
    },
  ];
}
