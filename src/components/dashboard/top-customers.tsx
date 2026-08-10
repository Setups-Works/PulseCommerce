"use client";

import { Crown, Package, Repeat, TrendingUp } from "lucide-react";
import Link from "next/link";
import { OrderStatusBadge, RiskBadge, SegmentBadge, TierBadge } from "@/components/dashboard/badges";
import { Card } from "@/components/ui/card";
import { STATUS_LABELS } from "@/lib/analytics/helpers";
import type { CustomerRecord } from "@/lib/analytics/types";
import { formatDate, formatDays, initials } from "@/lib/format";
import { useCustomerHistory } from "@/lib/use-customer-history";
import type { Formatters } from "@/lib/use-currency";
import { cn } from "@/lib/utils";

/**
 * The single best customer, given room to be read properly, with the next two
 * beside it. A ranked list buries the one account most worth knowing by name.
 */
export function TopCustomers({
  customers,
  fmt,
  currencyShare,
}: {
  customers: CustomerRecord[];
  fmt: Formatters;
  currencyShare: number;
}) {
  const [first, ...rest] = customers.slice(0, 3);
  const { history } = useCustomerHistory(first ?? null);
  if (!first) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* --- The top customer ------------------------------------------- */}
      <Card className="gap-0 p-5 lg:col-span-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Crown className="size-3.5" />
          Top customer this period
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {initials(first.name)}
            </span>
            <div className="min-w-0">
              <Link
                href={`/customers/${encodeURIComponent(first.key)}`}
                className="block truncate text-lg font-semibold tracking-tight hover:underline"
              >
                {first.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{first.email || "guest checkout"}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <TierBadge tier={first.tier} />
                <SegmentBadge segment={first.segment} />
                <RiskBadge risk={first.churnRisk} />
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-3xl font-semibold tracking-tight">{fmt.currency(first.netRevenue)}</p>
            <p className="text-xs text-muted-foreground">
              {fmt.percent(currencyShare)} of all revenue in this period
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-4 sm:grid-cols-4">
          <Metric icon={Repeat} label="Orders" value={fmt.number(first.orders)} />
          <Metric icon={TrendingUp} label="Average order" value={fmt.currency(first.averageOrderValue)} />
          <Metric icon={Package} label="Units" value={fmt.number(first.units)} />
          <Metric icon={Crown} label="Predicted CLV" value={fmt.currency(first.predictedClv)} />
        </dl>

        {history && history.length > 0 ? (
          <div className="mt-4 space-y-1.5 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">Their orders</p>
            <ul className="divide-y">
              {history.slice(0, 4).map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="font-mono font-medium">#{order.number}</span>
                    <OrderStatusBadge
                      status={order.status}
                      label={STATUS_LABELS[order.status] ?? order.status}
                    />
                    <span className="truncate text-muted-foreground">{order.items.join(", ")}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 tabular">
                    <span className="text-muted-foreground">{formatDate(order.date)}</span>
                    <span className="font-medium">{fmt.currency(order.net)}</span>
                  </span>
                </li>
              ))}
            </ul>
            {history.length > 4 ? (
              <Link
                href={`/customers/${encodeURIComponent(first.key)}`}
                className="inline-block pt-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                View all {history.length} orders →
              </Link>
            ) : null}
          </div>
        ) : null}
      </Card>

      {/* --- Runners up --------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {rest.map((customer, i) => (
          <Card key={customer.key} className="gap-0 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {i + 2}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/customers/${encodeURIComponent(customer.key)}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {customer.name}
                  </Link>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {customer.orders} order{customer.orders === 1 ? "" : "s"} ·{" "}
                    {formatDays(customer.recencyDays)} ago
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular">{fmt.currency(customer.netRevenue)}</p>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <TierBadge tier={customer.tier} />
              <SegmentBadge segment={customer.segment} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Crown;
  label: string;
  value: string;
}) {
  return (
    <div className={cn("space-y-0.5")}>
      <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="text-base font-semibold tracking-tight tabular">{value}</dd>
    </div>
  );
}

/** The order list shown when a ledger row is expanded. */
export function CustomerOrders({ customer, fmt }: { customer: CustomerRecord; fmt: Formatters }) {
  const { history, loading, error } = useCustomerHistory(customer);

  if (loading) return <p className="text-xs text-muted-foreground">Loading orders…</p>;
  if (error) return <p className="text-xs text-muted-foreground">{error}</p>;
  if (!history || history.length === 0) {
    return <p className="text-xs text-muted-foreground">No orders recorded in this period.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">
        {history.length} order{history.length === 1 ? "" : "s"} in this period
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-1.5 text-left font-medium">Order</th>
              <th className="py-1.5 text-left font-medium">Placed</th>
              <th className="py-1.5 text-left font-medium">Status</th>
              <th className="py-1.5 text-left font-medium">Items</th>
              <th className="py-1.5 text-right font-medium">Units</th>
              <th className="py-1.5 text-right font-medium">Total</th>
              <th className="py-1.5 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {history.map((order) => (
              <tr key={order.id} className="border-b last:border-0">
                <td className="py-1.5 font-mono font-medium">#{order.number}</td>
                <td className="py-1.5 whitespace-nowrap">{formatDate(order.date)}</td>
                <td className="py-1.5">
                  <OrderStatusBadge
                    status={order.status}
                    label={STATUS_LABELS[order.status] ?? order.status}
                  />
                </td>
                <td className="py-1.5 text-muted-foreground">{order.items.join(", ") || "—"}</td>
                <td className="py-1.5 text-right tabular">{order.units}</td>
                <td className="py-1.5 text-right tabular">{fmt.currency(order.total)}</td>
                <td className="py-1.5 text-right font-medium tabular">{fmt.currency(order.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        href={`/customers/${encodeURIComponent(customer.key)}`}
        className="inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        Open full profile →
      </Link>
    </div>
  );
}
