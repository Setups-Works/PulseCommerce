"use client";

import {
  ArrowLeft,
  CalendarClock,
  Compass,
  CreditCard,
  MapPin,
  MonitorSmartphone,
  Package,
  Repeat,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { OrderStatusBadge, RiskBadge, SegmentBadge, TierBadge } from "@/components/dashboard/badges";
import { AnalyticsPage, EmptySection } from "@/components/dashboard/page-state";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_LABELS } from "@/lib/analytics/helpers";
import type { AnalyticsResult, CustomerRecord } from "@/lib/analytics/types";
import { formatDate, formatDateTime, formatDays, initials } from "@/lib/format";
import { useFormatters } from "@/lib/use-currency";
import { useCustomerHistory } from "@/lib/use-customer-history";

export default function CustomerProfilePage() {
  return <AnalyticsPage>{(data) => <ProfileContent data={data} />}</AnalyticsPage>;
}

function ProfileContent({ data }: { data: AnalyticsResult }) {
  const params = useParams<{ key: string }>();
  const key = decodeURIComponent(params.key);
  const fmt = useFormatters(data.meta.currency);

  const customer = useMemo(
    () => data.customers.records.find((c) => c.key === key) ?? null,
    [data.customers.records, key],
  );
  const { history, loading: loadingHistory } = useCustomerHistory(customer);

  if (!customer) {
    return (
      <EmptySection
        icon={UserRound}
        title="Customer not in this period"
        description="This customer placed no revenue-bearing orders inside the selected date range, so there is nothing to profile. Widen the range and try again."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/customers">Back to customers</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {initials(customer.name)}
          </span>
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-lg font-semibold tracking-tight">{customer.name}</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <TierBadge tier={customer.tier} />
              <SegmentBadge segment={customer.segment} />
              <RiskBadge risk={customer.churnRisk} />
              <Badge variant={customer.isNewCustomer ? "secondary" : "outline"} className="text-[10px]">
                {customer.isNewCustomer ? "New in period" : "Returning"}
              </Badge>
            </div>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/customers">
            <ArrowLeft className="size-4" />
            All customers
          </Link>
        </Button>
      </div>

      <StatStrip>
        <StatTile
          label="Net revenue"
          value={fmt.currency(customer.netRevenue)}
          icon={ShoppingBag}
          footer={`${fmt.percent(customer.revenueShare)} of all revenue in this period`}
        />
        <StatTile
          label="Orders"
          value={fmt.number(customer.orders)}
          icon={Repeat}
          footer={`${fmt.currency(customer.averageOrderValue)} average · ${fmt.number(customer.units)} units`}
        />
        <StatTile
          label="Predicted lifetime value"
          value={fmt.currency(customer.predictedClv)}
          icon={CalendarClock}
          hint="Revenue booked so far plus a 12-month projection at this customer's observed order rate, discounted by churn risk."
        />
        <StatTile
          label="Last order"
          value={formatDays(customer.recencyDays)}
          icon={CalendarClock}
          footer={
            customer.averageDaysBetweenOrders === null
              ? "Only one order, so there is no cadence yet"
              : `Usually reorders every ${Math.round(customer.averageDaysBetweenOrders)} days`
          }
        />
      </StatStrip>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* --- Identity ---------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field icon={UserRound} label="Email">
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="break-all hover:underline">
                  {customer.email}
                </a>
              ) : (
                <span className="text-muted-foreground">Guest checkout, no email on file</span>
              )}
            </Field>
            <Separator />
            <Field icon={MapPin} label="Location">
              {[customer.city, customer.state, customer.country].filter(Boolean).join(", ") || "—"}
            </Field>
            <Separator />
            <Field icon={Compass} label="Acquired via">
              {customer.channel ?? <span className="text-muted-foreground">No attribution recorded</span>}
            </Field>
            <Separator />
            <Field icon={MonitorSmartphone} label="Device">
              {customer.deviceType ?? "—"}
            </Field>
            <Separator />
            <Field icon={CreditCard} label="Pays with">
              {customer.paymentMethods.length ? customer.paymentMethods.join(", ") : "—"}
            </Field>
            <Separator />
            <Field icon={CalendarClock} label="Customer since">
              {formatDate(customer.firstOrderDate)}
              {customer.lifespanDays > 0 ? (
                <span className="text-muted-foreground"> · {fmt.number(customer.lifespanDays)} days active</span>
              ) : null}
            </Field>
          </CardContent>
        </Card>

        {/* --- Scores ------------------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">RFM scores</CardTitle>
            <CardDescription className="text-xs">
              Quintiles within this store&apos;s own customer base, where 5 is best.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Score label="Recency" value={customer.recencyScore} caption={`${formatDays(customer.recencyDays)} since last order`} />
            <Score label="Frequency" value={customer.frequencyScore} caption={`${customer.orders} orders in period`} />
            <Score label="Monetary" value={customer.monetaryScore} caption={fmt.currency(customer.netRevenue)} />
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Revenue percentile</span>
              <span className="font-medium tabular">{fmt.percent(customer.revenuePercentile)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Refunded</span>
              <span className="font-medium tabular">{fmt.currency(customer.refunded)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Discounts used</span>
              <span className="font-medium tabular">{fmt.currency(customer.discounts)}</span>
            </div>
          </CardContent>
        </Card>

        {/* --- What they buy ----------------------------------------------- */}
        <ChartCard title="What they buy" description="By revenue across this period">
          {customer.topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No line items recorded.</p>
          ) : (
            <RankedBarChart
              data={customer.topProducts.map((p) => ({
                label: p.name,
                value: p.revenue,
                secondary: `${fmt.number(p.units)} units`,
              }))}
              format={fmt.currency}
              maxRows={5}
            />
          )}
        </ChartCard>
      </div>

      {/* --- Spend over time ---------------------------------------------- */}
      {history && history.length > 1 ? (
        <ChartCard
          title="Order value over time"
          description="Every order this customer placed in the selected period"
        >
          <TrendChart
            data={[...history]
              .reverse()
              .map((o) => ({ label: formatDate(o.date), net: o.net, units: o.units }))}
            xKey="label"
            height={220}
            yFormat={fmt.currencyCompact}
            series={[{ key: "net", label: "Order value", type: "bar", format: fmt.currency }]}
            tooltipSubtitle={(row) => `${fmt.number(row.units)} units`}
          />
        </ChartCard>
      ) : null}

      {/* --- Order history ------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Order history</CardTitle>
          <CardDescription className="text-xs">
            {loadingHistory
              ? "Loading orders…"
              : `${history?.length ?? 0} order${(history?.length ?? 0) === 1 ? "" : "s"} inside the selected range, newest first.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-xs">Order</TableHead>
                  <TableHead className="h-9 text-xs">Placed</TableHead>
                  <TableHead className="h-9 text-xs">Status</TableHead>
                  <TableHead className="h-9 text-xs">Items</TableHead>
                  <TableHead className="h-9 text-right text-xs">Units</TableHead>
                  <TableHead className="h-9 text-right text-xs">Total</TableHead>
                  <TableHead className="h-9 text-right text-xs">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history ?? []).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="py-2 font-mono text-xs font-medium">#{order.number}</TableCell>
                    <TableCell className="py-2 text-xs whitespace-nowrap">
                      {formatDateTime(order.date)}
                    </TableCell>
                    <TableCell className="py-2">
                      <OrderStatusBadge
                        status={order.status}
                        label={STATUS_LABELS[order.status] ?? order.status}
                      />
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      <span className="line-clamp-2">{order.items.join(", ") || "—"}</span>
                    </TableCell>
                    <TableCell className="py-2 text-right text-sm tabular">{order.units}</TableCell>
                    <TableCell className="py-2 text-right text-sm tabular">
                      {fmt.currency(order.total)}
                    </TableCell>
                    <TableCell className="py-2 text-right text-sm font-medium tabular">
                      {fmt.currency(order.net)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof UserRound;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="text-sm">{children}</p>
    </div>
  );
}

/** Score shown as filled pips as well as a number, so it isn't colour-only. */
function Score({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs tabular text-muted-foreground">{value} / 5</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: i < value ? "var(--chart-1)" : "var(--muted)" }}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{caption}</p>
    </div>
  );
}

export type { CustomerRecord };
