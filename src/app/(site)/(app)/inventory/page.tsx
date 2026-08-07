"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Boxes, Download, PackageX, TriangleAlert, Warehouse } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChartCard } from "@/components/charts/chart-card";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { AiSummary } from "@/components/dashboard/ai-summary";
import { DataTable } from "@/components/dashboard/data-table";
import { AnalyticsPage, EmptySection } from "@/components/dashboard/page-state";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsResult, InventoryRecord } from "@/lib/analytics/types";
import { useFormatters, type Formatters } from "@/lib/use-currency";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  return <AnalyticsPage>{(data) => <InventoryContent data={data} />}</AnalyticsPage>;
}

type Tab = "reorder" | "all" | "overstocked";

const STATUS_META: Record<
  InventoryRecord["status"],
  { label: string; tone: "risk" | "watch" | "good" | "neutral" }
> = {
  "out-of-stock": { label: "Out of stock", tone: "risk" },
  critical: { label: "Critical", tone: "risk" },
  low: { label: "Low", tone: "watch" },
  healthy: { label: "Healthy", tone: "good" },
  overstocked: { label: "Overstocked", tone: "watch" },
  untracked: { label: "Not tracked", tone: "neutral" },
  "no-sales": { label: "No sales", tone: "neutral" },
};

const TONE_STYLES = {
  good: "border-transparent bg-[color-mix(in_oklab,var(--good)_14%,transparent)] text-[var(--good)]",
  neutral: "border-transparent bg-muted text-muted-foreground",
  watch: "border-transparent bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-[var(--warning)]",
  risk: "border-transparent bg-[color-mix(in_oklab,var(--critical)_14%,transparent)] text-[var(--critical)]",
} as const;

function InventoryContent({ data }: { data: AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  const { inventory } = data;
  const [tab, setTab] = useState<Tab>("reorder");
  const columns = useMemo(() => buildColumns(fmt), [fmt]);

  if (inventory.totals.trackedSkus === 0) {
    return (
      <EmptySection
        icon={Warehouse}
        title="No inventory tracking on this catalogue"
        description="WooCommerce is not tracking stock quantities for any product that sold in this period, so cover and reorder points cannot be computed. Enable stock management per product, or globally under WooCommerce → Settings → Products → Inventory."
      />
    );
  }

  const rows: Record<Tab, InventoryRecord[]> = {
    reorder: inventory.needsReorder,
    all: inventory.records,
    overstocked: inventory.overstocked,
  };

  const COPY: Record<Tab, string> = {
    reorder:
      "Products that will run out within three weeks at the current rate, most urgent first. Suggested order covers lead time, safety stock and a further 30 days.",
    all: "Every SKU that sold in this period, ordered by how soon it runs out.",
    overstocked:
      "More than six months of cover at the current rate. This is capital sitting still, and a candidate for a promotion or a smaller next order.",
  };

  const exportCsv = () => {
    const list = rows[tab];
    if (list.length === 0) {
      toast.error("Nothing to export in this view.");
      return;
    }
    const headers = [
      "sku", "product", "category", "stock_on_hand", "units_per_day", "days_of_cover",
      "reorder_point", "suggested_order", "status", "revenue_at_risk", "stock_value",
    ];
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const lines = [headers.join(",")];
    for (const r of list) {
      lines.push(
        [
          r.sku, r.name, r.category, r.stockQuantity ?? "", r.velocity, r.daysOfCover ?? "",
          r.reorderPoint, r.suggestedOrder, STATUS_META[r.status].label, r.revenueAtRisk, r.stockValue,
        ]
          .map(escape)
          .join(","),
      );
    }
    const blob = new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-order-${tab}-${list.length}-skus.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`${list.length} SKUs exported`, { description: "Hand this to your supplier as a draft order." });
  };

  return (
    <>
      <StatStrip>
        <StatTile
          label="Needs reordering"
          value={fmt.number(inventory.needsReorder.length)}
          icon={TriangleAlert}
          footer={`${inventory.counts.outOfStock} out of stock · ${inventory.counts.critical} critical · ${inventory.counts.low} low`}
        />
        <StatTile
          label="Revenue at risk"
          value={fmt.currency(inventory.totals.revenueAtRisk)}
          icon={PackageX}
          hint={`What the critical and out-of-stock SKUs would have sold over one ${inventory.assumptions.leadTimeDays}-day lead time, at their current rate.`}
        />
        <StatTile
          label="Stock on hand"
          value={fmt.number(inventory.totals.unitsOnHand)}
          icon={Boxes}
          footer={`${fmt.currency(inventory.totals.stockValue)} at selling price · ${fmt.number(
            inventory.totals.trackedSkus,
          )} tracked SKUs`}
        />
        <StatTile
          label="Average cover"
          value={`${fmt.number(inventory.totals.averageDaysOfCover)} days`}
          icon={Warehouse}
          footer={`${inventory.counts.overstocked} SKUs over six months of cover`}
        />
      </StatStrip>

      <AiSummary question="Summarise stock risk: what is out or nearly out, and which of those matter most by the revenue behind them. Three sentences." />

      <Alert>
        <Warehouse />
        <AlertTitle>How these numbers are built</AlertTitle>
        <AlertDescription>
          Cover is current stock divided by units sold per day over the selected range. The reorder point assumes a{" "}
          <strong>{inventory.assumptions.leadTimeDays}-day supplier lead time</strong> plus{" "}
          <strong>{inventory.assumptions.safetyStockDays} days of safety stock</strong>; the suggested order adds a
          further 30 days on top. If your real lead time differs, scale the suggestion accordingly. Velocity is
          measured over the selected range, so a short range makes a seasonal spike look permanent.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Closest to stocking out"
          description="Days of cover remaining at the current rate"
          footnote="Anything under your lead time is already late to reorder."
        >
          {inventory.needsReorder.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing is close to running out. Stock levels are healthy across the catalogue.
            </p>
          ) : (
            <RankedBarChart
              data={inventory.needsReorder.slice(0, 8).map((r) => ({
                label: r.name,
                value: r.daysOfCover ?? 0,
                secondary: `${fmt.number(r.stockQuantity ?? 0)} left · ${fmt.decimal(r.velocity)}/day`,
              }))}
              format={(v) => `${fmt.number(v)} days`}
              maxRows={8}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Capital tied up"
          description="Stock value at selling price, largest first"
          footnote="A high value paired with long cover is the classic overstock signal."
        >
          <RankedBarChart
            data={[...inventory.records]
              .filter((r) => r.stockValue > 0)
              .sort((a, b) => b.stockValue - a.stockValue)
              .slice(0, 8)
              .map((r) => ({
                label: r.name,
                value: r.stockValue,
                secondary:
                  r.daysOfCover === null ? "no velocity" : `${fmt.number(r.daysOfCover)} days cover`,
              }))}
            format={fmt.currency}
            maxRows={8}
          />
        </ChartCard>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">Restock planner</CardTitle>
              <CardDescription className="max-w-prose text-xs">{COPY[tab]}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList>
                  <TabsTrigger value="reorder">
                    Reorder ({fmt.number(inventory.needsReorder.length)})
                  </TabsTrigger>
                  <TabsTrigger value="all">All ({fmt.number(inventory.records.length)})</TabsTrigger>
                  <TabsTrigger value="overstocked">
                    Overstocked ({fmt.number(inventory.overstocked.length)})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rows[tab]}
            columns={columns}
            searchAccessor={(r) => `${r.name} ${r.sku} ${r.category}`}
            searchPlaceholder="Search products, SKUs or categories…"
            emptyMessage={
              tab === "reorder"
                ? "Nothing needs reordering. Every tracked SKU has more than three weeks of cover."
                : tab === "overstocked"
                  ? "No SKU is carrying more than six months of cover."
                  : "No products sold in this period."
            }
            stickyFirstColumn
          />
        </CardContent>
      </Card>
    </>
  );
}

function buildColumns(fmt: Formatters): ColumnDef<InventoryRecord, unknown>[] {
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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const meta = STATUS_META[row.original.status];
        return (
          <Badge variant="outline" className={cn("text-[10px]", TONE_STYLES[meta.tone])}>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "stockQuantity",
      header: "On hand",
      meta: { align: "right" },
      cell: ({ row }) =>
        row.original.stockQuantity === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          fmt.number(row.original.stockQuantity)
        ),
    },
    {
      accessorKey: "velocity",
      header: "Units/day",
      meta: { align: "right" },
      cell: ({ row }) => fmt.decimal(row.original.velocity),
    },
    {
      accessorKey: "daysOfCover",
      header: "Days of cover",
      meta: { align: "right" },
      cell: ({ row }) => {
        const days = row.original.daysOfCover;
        if (days === null) return <span className="text-muted-foreground">—</span>;
        const tone = days <= 7 ? "var(--critical)" : days <= 21 ? "var(--warning)" : undefined;
        return (
          <span className="font-medium tabular" style={tone ? { color: tone } : undefined}>
            {fmt.number(days)}
          </span>
        );
      },
    },
    {
      accessorKey: "reorderPoint",
      header: "Reorder at",
      meta: { align: "right" },
      cell: ({ row }) =>
        row.original.reorderPoint > 0 ? (
          fmt.number(row.original.reorderPoint)
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "suggestedOrder",
      header: "Order now",
      meta: { align: "right" },
      cell: ({ row }) =>
        row.original.suggestedOrder > 0 ? (
          <span className="font-semibold">{fmt.number(row.original.suggestedOrder)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "revenueAtRisk",
      header: "Revenue at risk",
      meta: { align: "right" },
      cell: ({ row }) =>
        row.original.revenueAtRisk > 0 ? (
          <span style={{ color: "var(--critical)" }}>{fmt.currency(row.original.revenueAtRisk)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "stockValue",
      header: "Stock value",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.stockValue),
    },
    {
      accessorKey: "revenue",
      header: "Revenue in period",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.revenue),
    },
  ];
}
