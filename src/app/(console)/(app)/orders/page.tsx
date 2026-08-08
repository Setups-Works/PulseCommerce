"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Clock, Percent, ReceiptText, Ticket, XCircle } from "lucide-react";
import { useMemo } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart, donutLegend } from "@/components/charts/donut-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { OrderStatusBadge } from "@/components/dashboard/badges";
import { DataTable } from "@/components/dashboard/data-table";
import { AnalyticsPage } from "@/components/dashboard/page-state";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Chip } from "@heroui/react";
import { Card } from "@heroui/react";
import { STATUS_LABELS } from "@/lib/analytics/helpers";
import type { AnalyticsResult, OrderRecord } from "@/lib/analytics/types";
import { formatDateTime } from "@/lib/format";
import { useFormatters, type Formatters } from "@/lib/use-currency";

export default function OrdersPage() {
  return <AnalyticsPage>{(data) => <OrdersContent data={data} />}</AnalyticsPage>;
}

function OrdersContent({ data }: { data: AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  const { operations, orders, kpis, meta } = data;
  const columns = useMemo(() => buildColumns(fmt), [fmt]);

  const statusData = operations.statusBreakdown.map((s) => ({ label: s.label, value: s.orders }));

  const heatCells = useMemo(
    () =>
      operations.hourlyHeatmap.map((c) => ({
        row: c.day,
        col: c.hour,
        value: c.orders,
        secondary: c.revenue,
      })),
    [operations.hourlyHeatmap],
  );

  const fulfilment = operations.fulfilment;

  return (
    <>
      <StatStrip>
        <StatTile
          label="Orders in period"
          value={fmt.number(meta.orderCount)}
          icon={ReceiptText}
          footer={`${fmt.number(kpis.orders.value)} revenue-bearing · ${fmt.percent(fulfilment.completedShare)} completed`}
        />
        <StatTile
          label="Average fulfilment time"
          value={
            fulfilment.averageHoursToComplete === null
              ? "—"
              : fulfilment.averageHoursToComplete >= 48
                ? `${(fulfilment.averageHoursToComplete / 24).toFixed(1)} days`
                : `${fulfilment.averageHoursToComplete.toFixed(1)} h`
          }
          icon={Clock}
          hint="Measured from order creation to the completed timestamp, for orders that reached completed status."
        />
        <StatTile
          label="Cancellation rate"
          value={fmt.percent(fulfilment.cancellationRate)}
          metric={kpis.cancellationRate}
          invertChange
          icon={XCircle}
          footer={`Refund rate ${fmt.percent(fulfilment.refundRate)}`}
        />
        <StatTile
          label="Discounts given"
          value={fmt.currency(kpis.discountTotal.value)}
          metric={kpis.discountTotal}
          invertChange
          icon={Percent}
          footer={`${operations.coupons.length} coupon code${operations.coupons.length === 1 ? "" : "s"} redeemed`}
        />
      </StatStrip>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Order status mix" legend={donutLegend(statusData)} className="lg:col-span-1">
          <DonutChart
            data={statusData}
            format={(v) => `${fmt.number(v)} orders`}
            centerValue={fmt.number(meta.orderCount)}
            centerLabel="orders"
          />
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="Basket size distribution"
          description="How order values are spread"
          footnote="A long tail on the right means a small group of large baskets — check whether those are business buyers on the Business accounts page."
        >
          <RankedBarChart
            data={operations.basketDistribution.map((b) => ({
              label: b.bucket,
              value: b.orders,
              secondary: fmt.currency(b.revenue),
            }))}
            format={(v) => `${fmt.number(v)} orders`}
            maxRows={8}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Payment methods"
          description="Revenue and average order value by gateway"
        >
          <RankedBarChart
            data={operations.paymentMethods.map((p) => ({
              label: p.method,
              value: p.revenue,
              secondary: `${fmt.number(p.orders)} orders · AOV ${fmt.currency(p.averageOrderValue)}`,
            }))}
            format={fmt.currency}
            maxRows={8}
          />
        </ChartCard>

        <ChartCard
          title="Coupon performance"
          description="Revenue returned per unit of discount given"
          footnote="ROI is revenue on discounted orders divided by the discount given. Below about 4× a code is usually buying sales you'd have made anyway."
        >
          {operations.coupons.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No coupons were redeemed in this period.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {operations.coupons.slice(0, 8).map((c) => (
                <li key={c.code} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <Ticket className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono font-medium">{c.code}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5">
                    <span className="text-muted-foreground tabular">{c.uses} uses</span>
                    <span className="text-muted-foreground tabular">−{fmt.currency(c.discount)}</span>
                    <Chip
                      variant="soft"
                      className="tabular text-[10px]"
                      style={{ color: c.roi >= 4 ? "var(--good)" : "var(--warning)" }}
                    >
                      {c.roi.toFixed(1)}×
                    </Chip>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Trading pattern"
        description="Orders by weekday and hour"
      >
        <Heatmap
          cells={heatCells}
          rowLabels={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
          colLabels={Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))}
          format={(v) => `${fmt.number(v)} orders`}
          secondaryFormat={fmt.currency}
          secondaryLabel="Revenue"
          valueLabel="Orders"
        />
      </ChartCard>

      <ChartCard
        title="Revenue by weekday"
        description="Where the trading week is strongest"
      >
        <TrendChart
          data={operations.weekdayPerformance}
          xKey="label"
          height={220}
          yFormat={fmt.compact}
          series={[{ key: "revenue", label: "Net revenue", type: "bar", format: fmt.currency }]}
          tooltipSubtitle={(row) =>
            `${fmt.number(row.orders)} orders · AOV ${fmt.currency(row.averageOrderValue)}`
          }
        />
      </ChartCard>

      <Card>
        <Card.Header>
          <Card.Title className="text-sm font-semibold">Order register</Card.Title>
          <Card.Description className="text-xs">
            The {orders.length.toLocaleString()} most recent orders in this range. Excel and CSV exports include every
            order, without this cap.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <DataTable
            data={orders}
            columns={columns}
            searchAccessor={(o) =>
              `${o.number} ${o.customerName} ${o.customerEmail} ${o.company} ${o.paymentMethod} ${
                STATUS_LABELS[o.status] ?? o.status
              } ${o.coupons.join(" ")}`
            }
            searchPlaceholder="Search by order number, customer, email or coupon…"
            initialSorting={[{ id: "date", desc: true }]}
            stickyFirstColumn
          />
        </Card.Content>
      </Card>
    </>
  );
}

function buildColumns(fmt: Formatters): ColumnDef<OrderRecord, unknown>[] {
  return [
    {
      accessorKey: "number",
      header: "Order",
      cell: ({ row }) => <span className="font-mono text-xs font-medium">#{row.original.number}</span>,
    },
    {
      accessorKey: "date",
      header: "Placed",
      cell: ({ row }) => <span className="text-xs whitespace-nowrap">{formatDateTime(row.original.date)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <OrderStatusBadge
          status={row.original.status}
          label={STATUS_LABELS[row.original.status] ?? row.original.status}
        />
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.customerName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {row.original.company || row.original.customerEmail || "—"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "isNewCustomer",
      header: "Type",
      cell: ({ row }) => (
        <Chip variant={row.original.isNewCustomer ? "secondary" : "soft"} className="text-[10px]">
          {row.original.isNewCustomer ? "New" : "Returning"}
        </Chip>
      ),
    },
    {
      accessorKey: "units",
      header: "Units",
      meta: { align: "right" },
      cell: ({ row }) => fmt.number(row.original.units),
    },
    {
      accessorKey: "total",
      header: "Total",
      meta: { align: "right" },
      cell: ({ row }) => <span className="font-medium">{fmt.currency(row.original.total)}</span>,
    },
    {
      accessorKey: "discount",
      header: "Discount",
      meta: { align: "right" },
      cell: ({ row }) =>
        row.original.discount > 0 ? (
          <span style={{ color: "var(--warning)" }}>−{fmt.currency(row.original.discount)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "shipping",
      header: "Shipping",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.shipping),
    },
    {
      accessorKey: "tax",
      header: "Tax",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.tax),
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment",
      cell: ({ row }) => <span className="text-xs">{row.original.paymentMethod}</span>,
    },
    {
      id: "coupons",
      header: "Coupons",
      cell: ({ row }) =>
        row.original.coupons.length ? (
          <span className="font-mono text-[11px]">{row.original.coupons.join(", ")}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];
}
