"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Boxes, Layers, PackageSearch, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart, donutLegend } from "@/components/charts/donut-chart";
import { ParetoChart } from "@/components/charts/pareto-chart";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { seriesColor } from "@/components/charts/palette";
import { AbcBadge } from "@/components/dashboard/badges";
import { DataTable } from "@/components/dashboard/data-table";
import { AnalyticsPage, EmptySection } from "@/components/dashboard/page-state";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AnalyticsResult, ProductRecord } from "@/lib/analytics/types";
import { useFormatters, type Formatters } from "@/lib/use-currency";

export default function ProductsPage() {
  return <AnalyticsPage>{(data) => <ProductsContent data={data} />}</AnalyticsPage>;
}

type ProductTab = "all" | "best" | "slow" | "stock";

function ProductsContent({ data }: { data: AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  const { products, kpis } = data;
  const [tab, setTab] = useState<ProductTab>("all");
  const columns = useMemo(() => buildColumns(fmt), [fmt]);

  const aCount = products.products.filter((p) => p.abcClass === "A").length;
  const bCount = products.products.filter((p) => p.abcClass === "B").length;

  const paretoData = useMemo(
    () =>
      products.products.slice(0, 24).map((p) => ({
        label: p.name.length > 22 ? `${p.name.slice(0, 21)}…` : p.name,
        share: p.revenueShare,
        cumulativeShare: p.cumulativeShare,
        value: p.revenue,
      })),
    [products.products],
  );

  const rows: Record<ProductTab, ProductRecord[]> = {
    all: products.products,
    best: products.bestSellers,
    slow: products.underperformers,
    stock: products.stockRisks,
  };

  const TAB_COPY: Record<ProductTab, string> = {
    all: "Every SKU that sold in the selected period.",
    best: "Highest revenue contributors.",
    slow: "Slowest movers by revenue, followed by catalogue items that recorded no sales at all in this window.",
    stock: "Products with fewer than three weeks of stock cover at the current sales rate.",
  };

  if (products.products.length === 0) {
    return (
      <EmptySection
        icon={PackageSearch}
        title="No products sold in this period"
        description="No revenue-bearing order lines fell inside the selected range. Widen the date range to see catalogue performance."
      />
    );
  }

  const categoryData = products.categories.map((c) => ({ label: c.name, value: c.revenue }));

  return (
    <>
      <StatStrip>
        <StatTile
          label="SKUs sold"
          value={fmt.number(products.totals.skusSold)}
          icon={Boxes}
          footer={`of ${fmt.number(products.totals.catalogueSize)} in the catalogue`}
        />
        <StatTile
          label="Units sold"
          value={fmt.number(kpis.unitsSold.value)}
          metric={kpis.unitsSold}
          icon={Layers}
          footer={`${fmt.decimal(kpis.itemsPerOrder.value)} items per order`}
        />
        <StatTile
          label="Average unit price"
          value={fmt.currency(products.totals.averageUnitPrice)}
          icon={TrendingUp}
        />
        <StatTile
          label="Class A products"
          value={fmt.number(aCount)}
          icon={PackageSearch}
          hint="ABC analysis: class A carries the first 80% of revenue, B the next 15%, C the long tail."
          footer={`${bCount} class B · ${products.totals.skusSold - aCount - bCount} class C`}
        />
      </StatStrip>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Revenue concentration by product"
          description="Top 24 SKUs, ranked"
          legend={[
            { label: "Share of revenue", color: seriesColor(0) },
            { label: "Cumulative share", color: seriesColor(1) },
          ]}
          footnote="Where the cumulative curve crosses 80% is the boundary between class A and the rest of the catalogue."
        >
          <ParetoChart data={paretoData} format={fmt.currency} />
        </ChartCard>

        <ChartCard title="Revenue by category" legend={donutLegend(categoryData)}>
          <DonutChart
            data={categoryData}
            format={fmt.currency}
            centerValue={fmt.number(products.categories.length)}
            centerLabel="categories"
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Best sellers by units" description="Volume rather than value">
          <RankedBarChart
            data={[...products.products]
              .sort((a, b) => b.units - a.units)
              .slice(0, 8)
              .map((p) => ({
                label: p.name,
                value: p.units,
                secondary: fmt.currency(p.revenue),
              }))}
            format={fmt.number}
          />
        </ChartCard>

        <ChartCard
          title="Frequently bought together"
          description="Product pairs ranked by lift"
          footnote="Lift above 1 means the pair sells together more often than chance would predict — the basis for a bundle or cross-sell."
        >
          {products.affinities.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Not enough multi-item baskets in this period to find reliable pairs.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {products.affinities.slice(0, 7).map((a) => (
                <li key={`${a.a}-${a.b}`} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{a.a}</span>
                    <span className="text-muted-foreground"> + </span>
                    <span className="font-medium">{a.b}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-muted-foreground tabular">{a.orders} orders</span>
                    <Badge variant="outline" className="tabular text-[10px]">
                      {a.lift.toFixed(1)}× lift
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">Product performance</CardTitle>
              <CardDescription className="text-xs">{TAB_COPY[tab]}</CardDescription>
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as ProductTab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="best">Best sellers</TabsTrigger>
                <TabsTrigger value="slow">Slow movers</TabsTrigger>
                <TabsTrigger value="stock">Stock risk</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rows[tab]}
            columns={columns}
            searchAccessor={(p) => `${p.name} ${p.sku} ${p.category}`}
            searchPlaceholder="Search products, SKUs or categories…"
            initialSorting={[{ id: "revenue", desc: true }]}
            emptyMessage={
              tab === "stock"
                ? "No products are close to stocking out — either stock levels are healthy or WooCommerce isn't tracking inventory for them."
                : "No products match this view."
            }
            stickyFirstColumn
          />
        </CardContent>
      </Card>
    </>
  );
}

function buildColumns(fmt: Formatters): ColumnDef<ProductRecord, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {row.original.sku || "no SKU"} · {row.original.category}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "abcClass",
      header: "ABC",
      meta: { align: "center" },
      cell: ({ row }) => <AbcBadge abcClass={row.original.abcClass} />,
    },
    {
      accessorKey: "revenue",
      header: "Revenue",
      meta: { align: "right" },
      cell: ({ row }) => <span className="font-medium">{fmt.currency(row.original.revenue)}</span>,
    },
    {
      accessorKey: "revenueShare",
      header: "Share",
      meta: { align: "right" },
      cell: ({ row }) => fmt.percent(row.original.revenueShare),
    },
    {
      accessorKey: "units",
      header: "Units",
      meta: { align: "right" },
      cell: ({ row }) => fmt.number(row.original.units),
    },
    {
      accessorKey: "orders",
      header: "Orders",
      meta: { align: "right" },
      cell: ({ row }) => fmt.number(row.original.orders),
    },
    {
      accessorKey: "customers",
      header: "Customers",
      meta: { align: "right" },
      cell: ({ row }) => fmt.number(row.original.customers),
    },
    {
      accessorKey: "averagePrice",
      header: "Avg price",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.averagePrice),
    },
    {
      accessorKey: "velocity",
      header: "Units/day",
      meta: { align: "right" },
      cell: ({ row }) => fmt.decimal(row.original.velocity),
    },
    {
      accessorKey: "stockQuantity",
      header: "Stock",
      meta: { align: "right" },
      cell: ({ row }) =>
        row.original.stockQuantity === null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground">—</span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Inventory tracking is off for this product.</TooltipContent>
          </Tooltip>
        ) : (
          fmt.number(row.original.stockQuantity)
        ),
    },
    {
      accessorKey: "daysOfCover",
      header: "Days of cover",
      meta: { align: "right" },
      cell: ({ row }) => {
        const days = row.original.daysOfCover;
        if (days === null) return <span className="text-muted-foreground">—</span>;
        const tone = days < 7 ? "var(--critical)" : days < 21 ? "var(--warning)" : undefined;
        return (
          <span className="font-medium tabular" style={tone ? { color: tone } : undefined}>
            {fmt.number(days)}
            {days < 21 ? <span className="ml-1 text-[10px] font-normal">{days < 7 ? "critical" : "low"}</span> : null}
          </span>
        );
      },
    },
    {
      accessorKey: "refundRate",
      header: "Refund rate",
      meta: { align: "right" },
      cell: ({ row }) => fmt.percent(row.original.refundRate),
    },
  ];
}
