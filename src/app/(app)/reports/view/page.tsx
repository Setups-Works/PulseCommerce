"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CohortMatrix } from "@/components/charts/cohort-matrix";
import { seriesColor } from "@/components/charts/palette";
import { TrendChart } from "@/components/charts/trend-chart";
import { AnalyticsPage } from "@/components/dashboard/page-state";
import { Button } from "@/components/ui/button";
import type { AnalyticsResult } from "@/lib/analytics/types";
import { formatDate } from "@/lib/format";
import { useFormatters, type Formatters } from "@/lib/use-currency";

/**
 * The written report, as opposed to the exploratory dashboard.
 *
 * The dashboard answers "let me look around"; this answers "tell me what
 * happened and what to do". It reads top to bottom in one pass, leads with the
 * conclusion, and keeps the exact figures below for audit. Deliberately built
 * on the page canvas rather than in cards — a report is a document, not a grid
 * of panels.
 */
export default function ReportViewPage() {
  return <AnalyticsPage>{(data) => <ReportView data={data} />}</AnalyticsPage>;
}

function ReportView({ data }: { data: AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  const { kpis, customers, products, companies, operations, cohorts, geography } = data;

  const rev = kpis.netRevenue;
  const direction = rev.change === null ? "held flat" : rev.change >= 0 ? "grew" : "fell";
  const magnitude = rev.change === null ? "" : `${Math.abs(rev.change * 100).toFixed(1)}%`;

  const leadInsight = data.insights.find((i) => i.severity === "critical") ?? data.insights[0];
  const aClass = products.products.filter((p) => p.abcClass === "A").length;

  return (
    <article className="mx-auto max-w-5xl space-y-14 pb-16">
      {/* --- Masthead --------------------------------------------------- */}
      <header className="space-y-6 border-b pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-baseline gap-3 text-xs text-muted-foreground">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 gap-1.5 px-2">
              <Link href="/reports">
                <ArrowLeft className="size-3.5" />
                Report builder
              </Link>
            </Button>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-1 text-xs">
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">Store</dt>
              <dd className="font-medium">{data.meta.storeName}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">Period</dt>
              <dd className="font-medium">
                {formatDate(data.meta.range.from)} to {formatDate(data.meta.range.to)}
              </dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">Orders</dt>
              <dd className="font-medium">{data.meta.orderCount.toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        {/* The opening is the argument, not a title card. */}
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              Net revenue {direction} {magnitude} against the previous {periodLength(data)} days, on{" "}
              {fmt.number(kpis.orders.value)} orders from {fmt.number(kpis.activeCustomers.value)} customers.
            </h1>
            {leadInsight ? (
              <p className="mt-5 max-w-prose text-base leading-relaxed text-muted-foreground text-pretty">
                {leadInsight.detail}
              </p>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 self-end lg:col-span-5">
            <Figure label="Net revenue" value={fmt.currency(rev.value)} detail={`from ${fmt.currency(rev.previous)}`} />
            <Figure
              label="Average order value"
              value={fmt.currency(kpis.averageOrderValue.value)}
              detail={`from ${fmt.currency(kpis.averageOrderValue.previous)}`}
            />
            <Figure
              label="New customers"
              value={fmt.number(kpis.newCustomers.value)}
              detail={`${fmt.number(kpis.returningCustomers.value)} returning`}
            />
            <Figure
              label="Units sold"
              value={fmt.number(kpis.unitsSold.value)}
              detail={`${fmt.decimal(kpis.itemsPerOrder.value)} per order`}
            />
          </dl>
        </div>
      </header>

      {/* --- Trend ------------------------------------------------------ */}
      <Section
        heading="Revenue did not move evenly across the period"
        lede={`Bucketed by ${data.meta.granularity}. The exact figures behind this line are in the Excel export.`}
      >
        <TrendChart
          data={data.timeseries}
          xKey="label"
          height={280}
          yFormat={fmt.currencyCompact}
          series={[{ key: "netRevenue", label: "Net revenue", type: "area", format: fmt.currency }]}
          tooltipSubtitle={(row) => `${fmt.number(row.orders)} orders · AOV ${fmt.currency(row.averageOrderValue)}`}
        />
      </Section>

      {/* --- Concentration ---------------------------------------------- */}
      <Section
        heading={`The top 10% of customers carry ${fmt.percent(customers.concentration.top10Share)} of revenue`}
        lede={
          customers.concentration.giniCoefficient >= 0.6
            ? "Concentration this high means a handful of departures would be material. Retention is the higher-leverage investment here, not acquisition."
            : "Revenue is spread across the base rather than resting on a few accounts, which limits single-customer risk."
        }
      >
        <ConcentrationTable customers={customers} fmt={fmt} />
      </Section>

      {/* --- Products --------------------------------------------------- */}
      <Section
        heading={`${aClass} of ${products.totals.skusSold} products generate 80% of revenue`}
        lede="Class A carries the first 80% of revenue, B the next 15%, C the remaining tail. The tail is where catalogue pruning pays."
      >
        <EvidenceTable
          caption="Top products by revenue contribution"
          head={["Product", "Class", "Revenue", "Share", "Units", "Orders"]}
          align={["left", "left", "right", "right", "right", "right"]}
          rows={products.products.slice(0, 12).map((p) => [
            p.name,
            p.abcClass,
            fmt.currency(p.revenue),
            fmt.percent(p.revenueShare),
            fmt.number(p.units),
            fmt.number(p.orders),
          ])}
        />
      </Section>

      {/* --- Retention -------------------------------------------------- */}
      {cohorts.rows.length > 0 ? (
        <Section
          heading="Retention by acquisition cohort"
          lede="Each row is everyone who first bought in that month. Blank cells have not elapsed yet, so they read as missing rather than as zero."
        >
          <CohortMatrix
            rows={cohorts.rows.slice(-8)}
            periods={cohorts.periods}
            averageRetention={cohorts.averageRetention}
            currencyFormat={fmt.currency}
          />
        </Section>
      ) : null}

      {/* --- Operations ------------------------------------------------- */}
      <Section
        heading="Where orders come from and how they settle"
        lede={`Average fulfilment ${
          operations.fulfilment.averageHoursToComplete === null
            ? "is not recorded"
            : `runs ${(operations.fulfilment.averageHoursToComplete / 24).toFixed(1)} days`
        }, with ${fmt.percent(operations.fulfilment.cancellationRate)} of orders cancelled and ${fmt.percent(
          operations.fulfilment.refundRate,
        )} refunded.`}
      >
        <div className="grid gap-10 lg:grid-cols-2">
          <EvidenceTable
            caption="Payment methods"
            head={["Method", "Orders", "Revenue", "Share"]}
            align={["left", "right", "right", "right"]}
            rows={operations.paymentMethods
              .slice(0, 6)
              .map((p) => [p.method, fmt.number(p.orders), fmt.currency(p.revenue), fmt.percent(p.share)])}
          />
          <EvidenceTable
            caption="Revenue by billing country"
            head={["Country", "Orders", "Revenue", "Share"]}
            align={["left", "right", "right", "right"]}
            rows={geography.countries
              .slice(0, 6)
              .map((g) => [g.name, fmt.number(g.orders), fmt.currency(g.revenue), fmt.percent(g.share)])}
          />
        </div>
      </Section>

      {/* --- Findings --------------------------------------------------- */}
      <Section heading="What to act on" lede="Findings generated from this period's data, ordered by urgency.">
        <ol className="space-y-5">
          {[...data.insights]
            .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
            .slice(0, 6)
            .map((insight, i) => (
              <li key={insight.id} className="grid gap-x-5 gap-y-1 border-t pt-4 sm:grid-cols-12">
                <p className="text-xs text-muted-foreground tabular sm:col-span-1">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div className="space-y-1 sm:col-span-11">
                  <h3 className="text-sm font-medium">{insight.title}</h3>
                  <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{insight.detail}</p>
                </div>
              </li>
            ))}
        </ol>
      </Section>

      {/* --- Method ----------------------------------------------------- */}
      <footer className="space-y-4 border-t pt-8">
        <h2 className="text-sm font-semibold">Method and limits</h2>
        <div className="grid max-w-4xl gap-x-10 gap-y-4 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="font-medium text-foreground">Revenue definition.</span> Net revenue is the order total
            less tax, shipping and refunds, counted only for orders in completed, processing or on-hold status.
            Cancelled, failed and pending orders are excluded from revenue but still counted in cancellation rates.
          </p>
          <p>
            <span className="font-medium text-foreground">Customer identity.</span> Guest checkouts carry no
            WooCommerce customer ID, so buyers are keyed on billing email. A customer who checks out under two
            different addresses will appear twice.
          </p>
          <p>
            <span className="font-medium text-foreground">Segmentation.</span> Recency, frequency and monetary
            scores are quintiles within this store&apos;s own base, not absolute thresholds. Predicted lifetime value
            projects each customer&apos;s observed order rate forward twelve months, discounted by churn risk; it is
            an estimate, not a commitment.
          </p>
          <p>
            <span className="font-medium text-foreground">Comparison window.</span> Every change figure compares
            against {formatDate(data.meta.previousRange.from)} to {formatDate(data.meta.previousRange.to)}, the
            equal-length window immediately before this one.
            {companies.totals.companyCount === 0
              ? " No business accounts were detected, so B2B figures are omitted."
              : ` ${companies.totals.companyCount} business accounts contributed ${fmt.percent(
                  companies.totals.b2bShare,
                )} of revenue.`}
          </p>
        </div>
        <p className="pt-2 text-xs text-muted-foreground">
          Generated {formatDate(data.meta.generatedAt)} from {data.meta.orderCount.toLocaleString()} orders.
        </p>
      </footer>
    </article>
  );
}

function periodLength(data: AnalyticsResult): number {
  const from = new Date(data.meta.range.from).getTime();
  const to = new Date(data.meta.range.to).getTime();
  return Math.round((to - from) / 86_400_000) + 1;
}

function severityRank(severity: string): number {
  return { critical: 3, warning: 2, positive: 1, neutral: 0 }[severity] ?? 0;
}

function Figure({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tracking-tight tabular">{value}</dd>
      {detail ? <dd className="text-xs text-muted-foreground">{detail}</dd> : null}
    </div>
  );
}

function Section({
  heading,
  lede,
  children,
}: {
  heading: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="max-w-prose space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-balance">{heading}</h2>
        {lede ? <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{lede}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Full-width semantic table. Headers align with their cells. */
function EvidenceTable({
  caption,
  head,
  rows,
  align,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
  align: ("left" | "right")[];
}) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b">
              {head.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`py-2 text-xs font-medium text-muted-foreground ${
                    align[i] === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-b last:border-0">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={`py-2 ${align[c] === "right" ? "text-right tabular" : "text-left"} ${
                      c === 0 ? "font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function ConcentrationTable({
  customers,
  fmt,
}: {
  customers: AnalyticsResult["customers"];
  fmt: Formatters;
}) {
  const max = Math.max(...customers.deciles.map((d) => d.share), 1);

  return (
    <figure className="space-y-2">
      <figcaption className="text-xs text-muted-foreground">
        Customers ranked best-first, split into ten equal groups. Bar length encodes share of revenue on a common
        scale.
      </figcaption>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-2 text-left text-xs font-medium text-muted-foreground">
                Decile
              </th>
              <th scope="col" className="py-2 text-right text-xs font-medium text-muted-foreground">
                Customers
              </th>
              <th scope="col" className="py-2 text-right text-xs font-medium text-muted-foreground">
                Revenue
              </th>
              <th scope="col" className="py-2 text-right text-xs font-medium text-muted-foreground">
                Share
              </th>
              <th scope="col" className="w-[36%] py-2 text-left text-xs font-medium text-muted-foreground">
                Share of revenue
              </th>
              <th scope="col" className="py-2 text-right text-xs font-medium text-muted-foreground">
                Cumulative
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.deciles.map((d) => (
              <tr key={d.decile} className="border-b last:border-0">
                <td className="py-2 font-medium">{d.label}</td>
                <td className="py-2 text-right tabular text-muted-foreground">{fmt.number(d.customers)}</td>
                <td className="py-2 text-right tabular text-muted-foreground">{fmt.currency(d.revenue)}</td>
                <td className="py-2 text-right tabular text-muted-foreground">{fmt.percent(d.share)}</td>
                <td className="py-2 pr-4">
                  <div className="h-2 w-full rounded-sm bg-muted">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${(d.share / max) * 100}%`,
                        backgroundColor: seriesColor(0),
                      }}
                    />
                  </div>
                </td>
                <td className="py-2 text-right tabular text-muted-foreground">{fmt.percent(d.cumulativeShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
