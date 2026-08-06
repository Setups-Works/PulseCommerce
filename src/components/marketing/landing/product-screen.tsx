import * as React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  ChevronDown,
  Search,
  Sparkles,
} from "lucide-react";
import { NAV_GROUPS } from "@/components/layout/nav-items";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The application, drawn rather than screenshotted.
 *
 * Used twice: inside the hero's browser frame and again in the dashboard
 * preview section. One component, so the two can never show different
 * products.
 *
 * Three decisions worth keeping:
 *
 *   - The sidebar is generated from NAV_GROUPS, the same constant the real
 *     application navigates by. A module renamed in the product is renamed on
 *     the landing page, and a screenshot that has quietly gone stale is not a
 *     thing that can happen here.
 *   - Charts are hand-drawn SVG rather than the app's Recharts components.
 *     This is the most performance-sensitive page on the site and Recharts is
 *     a large client bundle; these are static shapes with no interaction, so
 *     they cost one server-rendered path each and no JavaScript at all.
 *   - Every figure is a generic placeholder. These pages are public, and a
 *     real store's catalogue on one would leak that store's data.
 *
 * A server component throughout.
 */

/* ---------------------------------------------------------------------------
   Chart primitives
   ------------------------------------------------------------------------ */

/** A filled trend, with a soft gradient under the line. */
function AreaChart({
  values,
  width = 640,
  height = 150,
  id,
}: {
  values: number[];
  width?: number;
  height?: number;
  /** Unique per instance: gradient ids share one document-wide namespace. */
  id: string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const pad = 8;
  const usable = height - pad * 2;

  const points = values.map(
    (v, i) => [i * stepX, pad + usable - ((v - min) / span) * usable] as const,
  );

  // A Catmull-Rom-ish smoothing: each segment gets control points a third of
  // the way along, which rounds the corners without letting the curve
  // overshoot past a local maximum and imply a value that never happened.
  const line = points
    .map(([x, y], i) => {
      if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
      const [px, py] = points[i - 1];
      const cx = px + (x - px) / 3;
      const cx2 = x - (x - px) / 3;
      return `C${cx.toFixed(1)},${py.toFixed(1)} ${cx2.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={0}
          x2={width}
          y1={height * t}
          y2={height * t}
          stroke="var(--grid)"
          strokeWidth={1}
        />
      ))}

      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Stacked columns — new against returning revenue, month by month. */
function StackedBars({ data }: { data: [number, number][] }) {
  const max = Math.max(...data.map(([a, b]) => a + b));
  return (
    <div className="flex h-full items-end gap-[3px]">
      {data.map(([nu, ret], i) => (
        <div key={i} className="flex h-full flex-1 flex-col justify-end gap-px">
          <span
            className="w-full rounded-t-[2px] bg-chart-1"
            style={{ height: `${(ret / max) * 100}%` }}
          />
          <span
            className="w-full rounded-b-[2px] bg-chart-1/35"
            style={{ height: `${(nu / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/** A donut, drawn with stroke-dasharray so there is no arc maths. */
function Donut({ slices }: { slices: { value: number; color: string }[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const circumference = 2 * Math.PI * 42;

  /*
   * Each arc's dash offset is the sum of every arc before it. Accumulated up
   * front rather than with a counter mutated inside the map: a running total
   * incremented during render is a side effect in a render path, which the
   * compiler rejects and which breaks outright if the list is ever re-ordered
   * or rendered concurrently.
   */
  const arcs = slices.reduce<{ length: number; offset: number; color: string }[]>((acc, slice) => {
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.length : 0;
    return [...acc, { length: (slice.value / total) * circumference, offset, color: slice.color }];
  }, []);

  return (
    <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
      {arcs.map(({ length, offset, color }, i) => (
        <circle
          key={i}
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="11"
          // The two-unit shortfall is the gap between adjacent arcs.
          strokeDasharray={`${length - 2} ${circumference - length + 2}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Screen chrome
   ------------------------------------------------------------------------ */

function Sidebar({ active }: { active: string }) {
  return (
    <div className="hidden w-44 shrink-0 flex-col border-r bg-sidebar sm:flex">
      <div className="flex h-11 items-center gap-2 border-b px-3">
        <span className="flex size-5 items-center justify-center rounded-md bg-primary text-[9px] font-bold text-primary-foreground">
          P
        </span>
        <span className="text-[11px] font-semibold tracking-tight">PulseCommerce</span>
      </div>

      <div className="flex-1 overflow-hidden px-2 py-2">
        {NAV_GROUPS.slice(0, 4).map((group) => (
          <div key={group.label} className="mb-2">
            <p className="px-2 py-1 text-[8px] font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
            {group.items.map((item) => (
              <span
                key={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-[10px]",
                  item.label === active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                <item.icon className="size-3 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Topbar({ title }: { title: string }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold">{title}</span>
        <span className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] text-muted-foreground">
          Last 12 months
          <ChevronDown className="size-2.5" />
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] text-muted-foreground md:flex">
          <Search className="size-2.5" />
          Search
          <kbd className="rounded border px-1 font-mono text-[8px]">⌘K</kbd>
        </span>
        <Bell className="size-3 text-muted-foreground" />
        <span className="size-5 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  up = true,
}: {
  label: string;
  value: string;
  delta: string;
  up?: boolean;
}) {
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="min-w-0">
      <p className="truncate text-[9px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <span
        className="mt-1 flex items-center gap-0.5 text-[9px] font-medium tabular-nums"
        style={{ color: up ? "var(--good)" : "var(--critical)" }}
      >
        <Arrow className="size-2.5" strokeWidth={2.5} />
        {delta}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Views
   ------------------------------------------------------------------------ */

const REVENUE = [38, 44, 41, 52, 49, 61, 58, 67, 72, 69, 84, 91];
const SPLIT: [number, number][] = [
  [18, 20], [22, 24], [19, 26], [25, 30], [21, 33], [28, 36],
  [24, 39], [30, 43], [33, 46], [29, 49], [38, 54], [41, 58],
];

const SEGMENTS = [
  { label: "Champions", value: 1204, share: 100, color: "var(--chart-1)" },
  { label: "Loyal", value: 2986, share: 69, color: "var(--chart-3)" },
  { label: "At risk", value: 1731, share: 40, color: "var(--chart-4)" },
  { label: "Hibernating", value: 3402, share: 25, color: "var(--chart-2)" },
];

function Overview() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
      <div className="grid grid-cols-4 gap-3 border-y py-2.5">
        <Kpi label="Net revenue" value="₹7.07L" delta="+12.4%" />
        <Kpi label="Orders" value="20,444" delta="+8.1%" />
        <Kpi label="Customers" value="11,224" delta="+5.9%" />
        <Kpi label="Repeat rate" value="24.0%" delta="+2.2pp" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.9fr_1fr] gap-2.5">
        <div className="flex min-h-0 flex-col rounded-lg border p-2.5">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-medium">Revenue trend</p>
            <span className="flex items-center gap-2 text-[8px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-chart-1" />
                Returning
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-chart-1/35" />
                New
              </span>
            </span>
          </div>
          <div className="mt-2 min-h-0 flex-1">
            <AreaChart values={REVENUE} id="screen-revenue" />
          </div>
          <div className="mt-1.5 h-8 shrink-0">
            <StackedBars data={SPLIT} />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-2.5">
          <div className="flex flex-1 flex-col rounded-lg border p-2.5">
            <p className="text-[10px] font-medium">Customer segments</p>
            <div className="mt-1.5 flex min-h-0 flex-1 items-center gap-2.5">
              <div className="relative size-16 shrink-0">
                <Donut slices={SEGMENTS.map((s) => ({ value: s.value, color: s.color }))} />
                <span className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] leading-none font-semibold tabular-nums">9.3k</span>
                  <span className="text-[7px] text-muted-foreground">rated</span>
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {SEGMENTS.map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[9px]">{s.label}</span>
                    <span className="shrink-0 text-[9px] text-muted-foreground tabular-nums">
                      {s.value.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5">
            <p className="flex items-center gap-1 text-[9px] font-medium text-primary">
              <Sparkles className="size-2.5" />
              Assistant
            </p>
            <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
              214 customers are past their own reorder gap, worth{" "}
              <span className="font-medium text-foreground">₹4.2L</span> in predicted value.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Customers() {
  const rows: [string, string, string, string, string][] = [
    ["Customer 1042", "Champion", "18", "₹1,24,800", "Low"],
    ["Customer 0871", "Loyal", "12", "₹86,400", "Low"],
    ["Customer 2210", "At risk", "9", "₹71,200", "High"],
    ["Customer 1663", "At risk", "7", "₹58,900", "High"],
    ["Customer 0455", "Hibernating", "4", "₹32,100", "Critical"],
    ["Customer 3081", "Loyal", "11", "₹79,300", "Low"],
  ];

  const risk: Record<string, string> = {
    Low: "var(--good)",
    High: "var(--serious)",
    Critical: "var(--critical)",
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {["All segments", "Value tier: top 40%", "Churn risk: high", "Last order > 90d"].map(
          (chip, i) => (
            <Badge key={chip} variant={i === 2 ? "default" : "outline"} className="h-4 text-[8px]">
              {chip}
            </Badge>
          ),
        )}
        <span className="ml-auto text-[9px] text-muted-foreground tabular-nums">
          214 of 11,224 customers
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_0.5fr_1fr_0.7fr] gap-2 border-b bg-muted/40 px-2.5 py-1.5 text-[8px] font-medium text-muted-foreground">
          <span>Customer</span>
          <span>Segment</span>
          <span className="text-right">Orders</span>
          <span className="text-right">Predicted LTV</span>
          <span className="text-right">Churn</span>
        </div>
        {rows.map(([name, segment, orders, ltv, churn], i) => (
          <div
            key={name}
            className={cn(
              "grid grid-cols-[1.4fr_1fr_0.5fr_1fr_0.7fr] gap-2 px-2.5 py-[7px] text-[9px]",
              i % 2 ? "bg-muted/20" : "",
            )}
          >
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-muted-foreground">{segment}</span>
            <span className="text-right tabular-nums">{orders}</span>
            <span className="text-right font-medium tabular-nums">{ltv}</span>
            <span className="text-right font-medium" style={{ color: risk[churn] }}>
              {churn}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Retention() {
  const grid = [
    [100, 46, 34, 27, 22, 19],
    [100, 42, 31, 24, 20],
    [100, 49, 36, 29],
    [100, 45, 33],
    [100, 51],
    [100],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-medium">Monthly acquisition cohorts</p>
        <span className="text-[9px] text-muted-foreground">% still ordering</span>
      </div>

      <div className="min-h-0 flex-1 space-y-1 rounded-lg border p-2.5">
        {grid.map((row, r) => (
          <div key={r} className="flex items-center gap-1">
            <span className="w-10 shrink-0 text-[8px] text-muted-foreground">Cohort {r + 1}</span>
            {row.map((value, c) => (
              <span
                key={c}
                className="flex h-5 flex-1 items-center justify-center rounded-[3px] text-[8px] font-medium tabular-nums"
                style={{
                  backgroundColor: `color-mix(in oklch, var(--primary) ${value}%, transparent)`,
                  color: value >= 55 ? "var(--primary-foreground)" : "var(--foreground)",
                }}
              >
                {value}%
              </span>
            ))}
            {Array.from({ length: 6 - row.length }, (_, i) => (
              <span key={`pad-${i}`} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Forecast() {
  const actual = [38, 44, 41, 52, 49, 61, 58, 67, 72, 69, 84, 91];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
      <div className="grid grid-cols-3 gap-3 border-y py-2.5">
        <Kpi label="Next 30 days" value="₹82,400" delta="+9.2%" />
        <Kpi label="Next 90 days" value="₹2.61L" delta="+7.4%" />
        <Kpi label="Stock at risk" value="₹4.20L" delta="-3.1%" up={false} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border p-2.5">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-medium">Projected revenue</p>
          <span className="text-[8px] text-muted-foreground">80% confidence band</span>
        </div>
        <div className="mt-2 min-h-0 flex-1">
          <AreaChart values={actual} id="screen-forecast" />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Composed screen
   ------------------------------------------------------------------------ */

export const SCREEN_VIEWS = {
  overview: { nav: "Dashboard", title: "Dashboard", body: <Overview /> },
  customers: { nav: "Customers", title: "Customers", body: <Customers /> },
  retention: { nav: "Cohorts & retention", title: "Cohorts & retention", body: <Retention /> },
  forecast: { nav: "Forecast", title: "Forecast", body: <Forecast /> },
} as const;

export type ScreenView = keyof typeof SCREEN_VIEWS;

export function ProductScreen({ view = "overview" }: { view?: ScreenView }) {
  const { nav, title, body } = SCREEN_VIEWS[view];
  return (
    <div className="flex size-full min-h-0 bg-background text-foreground">
      <Sidebar active={nav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        {body}
      </div>
    </div>
  );
}
