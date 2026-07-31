"use client";

import {
  Banknote,
  CreditCard,
  Package,
  Percent,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart, donutLegend } from "@/components/charts/donut-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { seriesColor } from "@/components/charts/palette";
import { TrendChart } from "@/components/charts/trend-chart";
import { InsightList } from "@/components/dashboard/insight-list";
import { AnalyticsPage } from "@/components/dashboard/page-state";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFormatters } from "@/lib/use-currency";
import { formatDate } from "@/lib/format";

export default function DashboardPage() {
  return (
    <AnalyticsPage>
      {(data) => <DashboardContent data={data} />}
    </AnalyticsPage>
  );
}

function DashboardContent({ data }: { data: import("@/lib/analytics/types").AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  const { kpis, timeseries, operations, products, customers, geography } = data;

  const revenueTrend = useMemo(() => timeseries.map((t) => t.netRevenue), [timeseries]);
  const orderTrend = useMemo(() => timeseries.map((t) => t.orders), [timeseries]);
  const customerTrend = useMemo(() => timeseries.map((t) => t.customers), [timeseries]);
  const aovTrend = useMemo(() => timeseries.map((t) => t.averageOrderValue), [timeseries]);

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

  const paymentData = operations.paymentMethods.map((p) => ({ label: p.method, value: p.revenue }));

  return (
    <>
      {/* --- Headline KPIs ------------------------------------------------ */}
      <StatStrip>
        <StatTile
          label="Net revenue"
          value={fmt.currency(kpis.netRevenue.value)}
          metric={kpis.netRevenue}
          icon={Banknote}
          trend={revenueTrend}
          hint="Order totals less tax, shipping and refunds, for orders in completed, processing or on-hold status."
        />
        <StatTile
          label="Orders"
          value={fmt.number(kpis.orders.value)}
          metric={kpis.orders}
          icon={ShoppingCart}
          trend={orderTrend}
          hint="Revenue-bearing orders only. Cancelled and failed orders are excluded."
        />
        <StatTile
          label="Average order value"
          value={fmt.currency(kpis.averageOrderValue.value)}
          metric={kpis.averageOrderValue}
          icon={Receipt}
          trend={aovTrend}
        />
        <StatTile
          label="Active customers"
          value={fmt.number(kpis.activeCustomers.value)}
          metric={kpis.activeCustomers}
          icon={Users}
          trend={customerTrend}
          footer={`${fmt.number(kpis.newCustomers.value)} new · ${fmt.number(
            kpis.returningCustomers.value,
          )} returning`}
        />
      </StatStrip>

      {/* --- Revenue trend ------------------------------------------------ */}
      <ChartCard
        title="Revenue and orders over time"
        description={`${formatDate(data.meta.range.from)} – ${formatDate(data.meta.range.to)}, bucketed by ${
          data.meta.granularity
        }`}
        legend={[
          { label: "Net revenue", color: seriesColor(0) },
          { label: "Orders", color: seriesColor(1) },
        ]}
        footnote="Orders are plotted as a share of the revenue scale so both series share one axis — a second y-axis would let the two lines cross wherever the scales happened to fall."
      >
        <RevenueOrdersChart timeseries={timeseries} currency={data.meta.currency} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* --- Insights -------------------------------------------------- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">What changed</CardTitle>
            <CardDescription className="text-xs">
              Generated from this period&apos;s data against the previous {data.meta.granularity === "day" ? "" : ""}
              equal-length window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InsightList insights={data.insights} />
          </CardContent>
        </Card>

        {/* --- Secondary KPIs -------------------------------------------- */}
        {/* content-start stops these stacking to fill the taller insights card. */}
        <div className="grid content-start gap-5 divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-1 lg:divide-y [&>*:not(:first-child)]:pt-5 sm:[&>*:not(:first-child)]:pt-0 lg:[&>*:not(:first-child)]:pt-5">
          <StatTile
            label="Units sold"
            value={fmt.number(kpis.unitsSold.value)}
            metric={kpis.unitsSold}
            icon={Package}
            footer={`${fmt.decimal(kpis.itemsPerOrder.value)} items per order`}
          />
          <StatTile
            label="Returning customer rate"
            value={fmt.percent(kpis.returningCustomerRate.value)}
            metric={kpis.returningCustomerRate}
            icon={Percent}
            hint="Share of customers active this period who had already bought before it. Distinct from the in-period repeat rate on the Customers page."
          />
          <StatTile
            label="Refunded"
            value={fmt.currency(kpis.refundedAmount.value)}
            metric={kpis.refundedAmount}
            invertChange
            icon={RotateCcw}
            footer={`${fmt.percent(operations.fulfilment.refundRate)} of gross revenue`}
          />
          <StatTile
            label="Discounts given"
            value={fmt.currency(kpis.discountTotal.value)}
            metric={kpis.discountTotal}
            invertChange
            icon={CreditCard}
            footer={`${fmt.currency(kpis.shippingTotal.value)} shipping · ${fmt.currency(
              kpis.taxTotal.value,
            )} tax collected`}
          />
        </div>
      </div>

      {/* --- Mix breakdowns ---------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Top products by revenue"
          description={`${products.totals.skusSold} SKUs sold in this period`}
        >
          <RankedBarChart
            data={products.products.slice(0, 8).map((p) => ({
              label: p.name,
              value: p.revenue,
              secondary: `${fmt.number(p.units)} units`,
            }))}
            format={fmt.currency}
          />
        </ChartCard>

        <ChartCard
          title="Top customers by spend"
          description="Net revenue in the selected period"
        >
          <RankedBarChart
            data={customers.topCustomers.slice(0, 8).map((c) => ({
              label: c.company ? `${c.name} · ${c.company}` : c.name,
              value: c.netRevenue,
              secondary: `${c.orders} order${c.orders === 1 ? "" : "s"}`,
            }))}
            format={fmt.currency}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Revenue by payment method"
          legend={donutLegend(paymentData)}
        >
          <DonutChart
            data={paymentData}
            format={fmt.currency}
            centerValue={fmt.currencyCompact(kpis.netRevenue.value)}
            centerLabel="net revenue"
          />
        </ChartCard>

        <ChartCard
          title="Where revenue comes from"
          description="By billing country, then region"
        >
          <Tabs defaultValue="country">
            <TabsList className="mb-3">
              <TabsTrigger value="country">Country</TabsTrigger>
              <TabsTrigger value="region">Region</TabsTrigger>
              <TabsTrigger value="city">City</TabsTrigger>
            </TabsList>
            <TabsContent value="country">
              <RankedBarChart
                data={geography.countries.map((g) => ({
                  label: g.name,
                  value: g.revenue,
                  secondary: `${fmt.percent(g.share)}`,
                }))}
                format={fmt.currency}
                maxRows={8}
              />
            </TabsContent>
            <TabsContent value="region">
              <RankedBarChart
                data={geography.states.map((g) => ({
                  label: g.name,
                  value: g.revenue,
                  secondary: `${g.orders} orders`,
                }))}
                format={fmt.currency}
                maxRows={8}
              />
            </TabsContent>
            <TabsContent value="city">
              <RankedBarChart
                data={geography.cities.map((g) => ({
                  label: g.name,
                  value: g.revenue,
                  secondary: `${g.orders} orders`,
                }))}
                format={fmt.currency}
                maxRows={8}
              />
            </TabsContent>
          </Tabs>
        </ChartCard>
      </div>

      {/* --- Trading pattern --------------------------------------------- */}
      <ChartCard
        title="When customers order"
        description="Orders by day of week and hour of day, in store local time"
        footnote="Use this to time campaign sends, staff support cover and flash-sale windows."
      >
        <Heatmap
          cells={heatCells}
          rowLabels={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
          colLabels={Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}`)}
          format={(v) => `${fmt.number(v)} orders`}
          secondaryFormat={fmt.currency}
          secondaryLabel="Revenue"
          valueLabel="Orders"
        />
      </ChartCard>
    </>
  );
}

/**
 * Revenue and order count share one axis by indexing orders onto the revenue
 * scale. The tooltip always shows the true order count, so the reader never has
 * to decode the transform.
 */
function RevenueOrdersChart({
  timeseries,
  currency,
}: {
  timeseries: import("@/lib/analytics/types").TimePoint[];
  currency: string;
}) {
  const fmt = useFormatters(currency);

  const maxRevenue = Math.max(...timeseries.map((t) => t.netRevenue), 1);
  const maxOrders = Math.max(...timeseries.map((t) => t.orders), 1);
  const scale = maxRevenue / maxOrders;

  const shaped = timeseries.map((t) => ({
    ...t,
    ordersScaled: t.orders * scale,
  }));

  return (
    <TrendChart
      data={shaped}
      xKey="label"
      height={300}
      yFormat={fmt.currencyCompact}
      series={[
        { key: "netRevenue", label: "Net revenue", type: "area", format: fmt.currency },
        {
          key: "ordersScaled",
          label: "Orders",
          type: "line",
          // Undo the scaling so the tooltip reports the real count.
          format: (v) => fmt.number(Math.round(v / scale)),
        },
      ]}
      tooltipSubtitle={(row) =>
        `${fmt.number(row.customers)} customers · ${fmt.number(row.units)} units · AOV ${fmt.currency(
          row.averageOrderValue,
        )}`
      }
    />
  );
}
