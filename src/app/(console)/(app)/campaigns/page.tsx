"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Download, Megaphone, Target, Ticket, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChartCard } from "@/components/charts/chart-card";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { SegmentBadge, TierBadge } from "@/components/dashboard/badges";
import { DataTable } from "@/components/dashboard/data-table";
import { AnalyticsPage } from "@/components/dashboard/page-state";
import { WhatsAppSendPanel } from "@/components/whatsapp/whatsapp-send-panel";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { Chip } from "@heroui/react";
import { Button } from "@heroui/react";
import { Card } from "@heroui/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@heroui/react";
import { Switch } from "@heroui/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsResult, CampaignRecord, CustomerRecord, RfmSegment, ValueTier } from "@/lib/analytics/types";
import {
  applyAudience,
  AUDIENCE_PRESETS,
  audienceToCsv,
  EMPTY_AUDIENCE,
  summariseAudience,
  type AudienceFilter,
} from "@/lib/audience";
import { formatDays } from "@/lib/format";
import { useFormatters, type Formatters } from "@/lib/use-currency";
import { cn } from "@/lib/utils";

const SEGMENTS: RfmSegment[] = [
  "Champions", "Loyal", "Potential Loyalist", "New Customers", "Promising",
  "Need Attention", "At Risk", "Cannot Lose Them", "Hibernating", "Lost",
];
const TIERS: ValueTier[] = ["VIP", "High", "Mid", "Low", "One-time"];

export default function CampaignsPage() {
  return <AnalyticsPage>{(data) => <CampaignsContent data={data} />}</AnalyticsPage>;
}

function CampaignsContent({ data }: { data: AnalyticsResult }) {
  const fmt = useFormatters(data.meta.currency);
  return (
    <Tabs defaultValue="audiences" className="space-y-5">
      <TabsList>
        <TabsTrigger value="audiences" className="gap-1.5">
          <Target className="size-3.5" />
          Audience builder
        </TabsTrigger>
        <TabsTrigger value="performance" className="gap-1.5">
          <Megaphone className="size-3.5" />
          Campaign performance
        </TabsTrigger>
      </TabsList>

      <TabsContent value="audiences" className="space-y-5">
        <AudienceBuilder data={data} fmt={fmt} />
      </TabsContent>

      <TabsContent value="performance" className="space-y-5">
        <CampaignPerformance data={data} fmt={fmt} />
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Audience builder
// ---------------------------------------------------------------------------

function AudienceBuilder({ data, fmt }: { data: AnalyticsResult; fmt: Formatters }) {
  const [filter, setFilter] = useState<AudienceFilter>(AUDIENCE_PRESETS[1].filter);
  const [activePreset, setActivePreset] = useState<string | null>("winback");
  const [name, setName] = useState("Win-back lapsed customers");
  const router = useRouter();

  const records = data.customers.records;
  const audience = useMemo(() => applyAudience(records, filter), [records, filter]);
  const summary = useMemo(() => summariseAudience(audience, records), [audience, records]);

  const countries = useMemo(
    () => [...new Set(records.map((c) => c.country).filter(Boolean))].sort(),
    [records],
  );

  const update = <K extends keyof AudienceFilter>(key: K, value: AudienceFilter[K]) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
    setActivePreset(null);
  };

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const exportCsv = () => {
    if (audience.length === 0) {
      toast.error("This audience is empty.", { description: "Loosen a filter and try again." });
      return;
    }
    const csv = audienceToCsv(audience);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(name || "audience")}-${audience.length}-contacts.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`${audience.length.toLocaleString()} contacts exported`, {
      description: "Import this into your email or ads platform as a custom audience.",
    });
  };

  const columns = useMemo(() => buildAudienceColumns(fmt), [fmt]);

  return (
    <>
      <StatStrip>
        <StatTile
          label="Audience size"
          value={fmt.number(summary.size)}
          icon={Users}
          footer={`${fmt.percent(summary.reachableShare)} of the ${fmt.number(records.length)} customers in range`}
        />
        <StatTile
          label="Revenue represented"
          value={fmt.currency(summary.totalRevenue)}
          icon={TrendingUp}
          footer={`${fmt.currency(summary.averageRevenue)} average per contact`}
        />
        <StatTile
          label="Predicted lifetime value"
          value={fmt.currency(summary.predictedClv)}
          icon={Target}
          hint="Sum of predicted CLV across the audience. This is the value at stake if the campaign fails to land, not the value it will generate."
        />
        <StatTile
          label="Average churn risk"
          value={fmt.percent(summary.averageChurnRisk * 100)}
          icon={Megaphone}
          footer={`${fmt.decimal(summary.averageOrders)} orders per contact on average`}
        />
      </StatStrip>

      <div className="space-y-4">
        {/* Full width, first: sending is what this page is for, and the
            audience controls below feed it. */}
        <WhatsAppSendPanel
          filter={filter}
          audienceSize={audience.length}
          allCustomers={records.map((c) => ({
            key: c.key,
            name: c.name,
            email: c.email,
            orders: c.orders,
          }))}
        />

        {/* --- Filters ---------------------------------------------------- */}
        {/* `min-w-0` on the children is load-bearing: a grid item defaults to
            min-width:auto, so the wide table in the third column refused to
            shrink and pushed the whole page to 769px on a 375px screen. */}
        <div className="grid gap-4 *:min-w-0 lg:grid-cols-3">
          <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">Define the audience</Card.Title>
            <Card.Description className="text-xs">
              Filters apply to customers active in the selected date range.
            </Card.Description>
          </Card.Header>

          <Card.Content className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="audience-name">Campaign name</Label>
              <Input
                id="audience-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Spring win-back"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Start from a goal</Label>
              <div className="flex flex-wrap gap-1.5">
                {AUDIENCE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setFilter(preset.filter);
                      setActivePreset(preset.id);
                      setName(preset.name);
                    }}
                    title={preset.rationale}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-surface-secondary",
                      activePreset === preset.id && "border-primary bg-primary/10 font-medium",
                    )}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              {activePreset ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {AUDIENCE_PRESETS.find((p) => p.id === activePreset)?.rationale}
                </p>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>RFM segments</Label>
              <div className="flex flex-wrap gap-1.5">
                {SEGMENTS.map((segment) => (
                  <button
                    key={segment}
                    type="button"
                    onClick={() => update("segments", toggleIn(filter.segments, segment))}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition-colors hover:bg-surface-secondary",
                      filter.segments.includes(segment) && "border-primary bg-primary/10 font-medium",
                    )}
                  >
                    {segment}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Value tiers</Label>
              <div className="flex flex-wrap gap-1.5">
                {TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => update("tiers", toggleIn(filter.tiers, tier))}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition-colors hover:bg-surface-secondary",
                      filter.tiers.includes(tier) && "border-primary bg-primary/10 font-medium",
                    )}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Min days since order"
                value={filter.recencyMin}
                onChange={(v) => update("recencyMin", v)}
              />
              <NumberField
                label="Max days since order"
                value={filter.recencyMax}
                onChange={(v) => update("recencyMax", v)}
              />
              <NumberField label="Min spend" value={filter.minSpend} onChange={(v) => update("minSpend", v)} />
              <NumberField label="Min orders" value={filter.minOrders} onChange={(v) => update("minOrders", v)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="churn">Minimum churn risk</Label>
              <Select
                value={filter.churnRiskMin === null ? "any" : String(filter.churnRiskMin)}
                onValueChange={(v) => update("churnRiskMin", v === "any" ? null : Number(v))}
              >
                <SelectTrigger id="churn">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="0.25">Moderate and above (25%)</SelectItem>
                  <SelectItem value="0.5">Elevated and above (50%)</SelectItem>
                  <SelectItem value="0.75">High only (75%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account-type">Account type</Label>
              <Select
                value={filter.accountType}
                onValueChange={(v) => update("accountType", v as AudienceFilter["accountType"])}
              >
                <SelectTrigger id="account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Everyone</SelectItem>
                  <SelectItem value="business">Business accounts only</SelectItem>
                  <SelectItem value="consumer">Consumers only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {countries.length > 1 ? (
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={filter.countries[0] ?? "any"}
                  onValueChange={(v) => update("countries", v === "any" ? [] : [v])}
                >
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All countries</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="product">Bought a product matching</Label>
              <Input
                id="product"
                value={filter.boughtProduct}
                onChange={(e) => update("boughtProduct", e.target.value)}
                placeholder="e.g. soap"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="require-email" className="text-xs">
                  Contactable only
                </Label>
                <p className="text-[11px] text-muted-foreground">Exclude customers with no email on file.</p>
              </div>
              <Switch
                id="require-email"
                isSelected={filter.requireEmail}
                onChange={(v) => update("requireEmail", v)}
              />
            </div>

            <div className="flex gap-2">
              <Button className="flex-1 gap-1.5" onClick={exportCsv}>
                <Download className="size-4" />
                Export {fmt.number(summary.size)} contacts
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilter(EMPTY_AUDIENCE);
                  setActivePreset(null);
                }}
              >
                Reset
              </Button>
            </div>
          </Card.Content>
        </Card>

        {/* --- Preview ---------------------------------------------------- */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <ChartCard title="Who is in this audience" description="By RFM segment">
              {summary.topSegments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No customers match these filters.
                </p>
              ) : (
                <RankedBarChart
                  data={summary.topSegments.map((s) => ({ label: s.label, value: s.count }))}
                  format={(v) => `${fmt.number(v)} customers`}
                  maxRows={5}
                />
              )}
            </ChartCard>

            <ChartCard title="What they buy" description="Most common top product per contact">
              {summary.topProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nothing to show yet.</p>
              ) : (
                <RankedBarChart
                  data={summary.topProducts.map((p) => ({ label: p.name, value: p.customers }))}
                  format={(v) => `${fmt.number(v)} customers`}
                  maxRows={5}
                />
              )}
            </ChartCard>
          </div>

          <Card>
            <Card.Header>
              <Card.Title className="text-sm font-semibold">Audience preview</Card.Title>
              <Card.Description className="text-xs">
                Exactly the rows the CSV will contain, in the order they will appear.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <DataTable
                data={audience}
                columns={columns}
                searchAccessor={(c) => `${c.name} ${c.email} ${c.company}`}
                searchPlaceholder="Search this audience…"
                initialSorting={[{ id: "predictedClv", desc: true }]}
                onRowClick={(c) => router.push(`/customers/${encodeURIComponent(c.key)}`)}
                pageSize={10}
                emptyMessage="No customers match these filters. Loosen one and the preview will fill in."
                stickyFirstColumn
              />
            </Card.Content>
          </Card>
        </div>
        </div>
      </div>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value ?? ""}
        placeholder="any"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

function buildAudienceColumns(fmt: Formatters): ColumnDef<CustomerRecord, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{row.original.email || "no email"}</p>
        </div>
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
      header: "Spent",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.netRevenue),
    },
    {
      accessorKey: "predictedClv",
      header: "Predicted CLV",
      meta: { align: "right" },
      cell: ({ row }) => <span className="font-medium">{fmt.currency(row.original.predictedClv)}</span>,
    },
    {
      accessorKey: "recencyDays",
      header: "Last order",
      meta: { align: "right" },
      cell: ({ row }) => `${formatDays(row.original.recencyDays)} ago`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Campaign performance
// ---------------------------------------------------------------------------

function CampaignPerformance({ data, fmt }: { data: AnalyticsResult; fmt: Formatters }) {
  const { acquisition, operations } = data;
  const columns = useMemo(() => buildCampaignColumns(fmt), [fmt]);

  const totalCampaignRevenue = acquisition.campaigns.reduce((s, c) => s + c.revenue, 0);
  const couponRevenue = operations.coupons.reduce((s, c) => s + c.revenue, 0);
  const couponDiscount = operations.coupons.reduce((s, c) => s + c.discount, 0);

  return (
    <>
      <StatStrip>
        <StatTile
          label="Tagged campaigns"
          value={fmt.number(acquisition.campaigns.length)}
          icon={Megaphone}
          footer="From utm_campaign on the order's attribution"
        />
        <StatTile
          label="Campaign revenue"
          value={fmt.currency(totalCampaignRevenue)}
          icon={TrendingUp}
          footer={`${fmt.percent(
            data.kpis.netRevenue.value ? (totalCampaignRevenue / data.kpis.netRevenue.value) * 100 : 0,
          )} of net revenue`}
        />
        <StatTile
          label="Coupon-driven revenue"
          value={fmt.currency(couponRevenue)}
          icon={Ticket}
          footer={`${operations.coupons.length} codes redeemed`}
        />
        <StatTile
          label="Discount given"
          value={fmt.currency(couponDiscount)}
          icon={Download}
          hint="Total discount across all coupon redemptions. Compare against coupon-driven revenue to judge whether the codes are paying for themselves."
          footer={
            couponDiscount > 0 ? `${(couponRevenue / couponDiscount).toFixed(1)}× blended return` : undefined
          }
        />
      </StatStrip>

      {acquisition.campaigns.length === 0 && operations.coupons.length === 0 ? (
        <Card>
          <Card.Content className="py-12 text-center">
            <p className="text-sm font-medium">No campaigns detected in this period</p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Campaigns are read from two independent signals: a <code>utm_campaign</code> parameter on the landing
              URL, which WooCommerce Order Attribution records against the order, and coupon codes redeemed at
              checkout. Tag your ad and email links with UTM parameters and this page fills in on the next order.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Revenue by campaign"
              description="Attributed through utm_campaign"
            >
              {acquisition.campaigns.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No UTM-tagged campaigns in this period.
                </p>
              ) : (
                <RankedBarChart
                  data={acquisition.campaigns.slice(0, 8).map((c) => ({
                    label: c.label,
                    value: c.revenue,
                    secondary: `${fmt.number(c.orders)} orders`,
                  }))}
                  format={fmt.currency}
                  maxRows={8}
                />
              )}
            </ChartCard>

            <ChartCard
              title="Coupon return on discount"
              description="Revenue captured per unit of discount given"
              footnote="Below roughly 4× a code is usually discounting sales you would have made anyway."
            >
              {operations.coupons.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No coupons redeemed in this period.
                </p>
              ) : (
                <RankedBarChart
                  data={operations.coupons.slice(0, 8).map((c) => ({
                    label: c.code,
                    value: c.roi,
                    secondary: `${c.uses} uses · −${fmt.currency(c.discount)}`,
                  }))}
                  format={(v) => `${v.toFixed(1)}×`}
                  maxRows={8}
                />
              )}
            </ChartCard>
          </div>

          {acquisition.campaigns.length > 0 ? (
            <Card>
              <Card.Header>
                <Card.Title className="text-sm font-semibold">Campaign performance</Card.Title>
                <Card.Description className="text-xs">
                  New-customer share is the number that matters for a paid campaign: revenue from customers you
                  already had is not incremental.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <DataTable
                  data={acquisition.campaigns}
                  columns={columns}
                  searchAccessor={(c) => `${c.label} ${c.group}`}
                  searchPlaceholder="Search campaigns…"
                  initialSorting={[{ id: "revenue", desc: true }]}
                  stickyFirstColumn
                />
              </Card.Content>
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}

function buildCampaignColumns(fmt: Formatters): ColumnDef<CampaignRecord, unknown>[] {
  return [
    {
      accessorKey: "label",
      header: "Campaign",
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
      accessorKey: "newRevenue",
      header: "New-customer revenue",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.newRevenue),
    },
    {
      accessorKey: "averageOrderValue",
      header: "AOV",
      meta: { align: "right" },
      cell: ({ row }) => fmt.currency(row.original.averageOrderValue),
    },
    {
      accessorKey: "topDevice",
      header: "Top device",
      cell: ({ row }) => (
        <Chip variant="soft" className="text-[10px]">
          {row.original.topDevice}
        </Chip>
      ),
    },
  ];
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "audience"
  );
}
