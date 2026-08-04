import * as React from "react";
import { Check, Megaphone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * Marketing sections, built from the product's own components.
 *
 * Every illustration below is drawn from Card, Badge, Progress and Separator
 * rather than being a screenshot. Two reasons: a scaled capture is unreadable
 * at phone width and goes stale the moment the interface moves, and drawing
 * from the real components means the picture cannot drift away from the thing
 * it depicts.
 *
 * Names and figures in the mocks are generic placeholders. These pages are
 * public, so a real store's catalogue on one would leak that store's data.
 */

/** A page section with consistent rhythm, so no page invents its own spacing. */
export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-20", className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "start",
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  align?: "start" | "center";
}) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "items-center text-center")}>
      {eyebrow ? (
        <Badge variant="secondary" className="w-fit">
          {eyebrow}
        </Badge>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl">{title}</h2>
      {body ? (
        <p className={cn("max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg", align === "center" && "mx-auto")}>
          {body}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Copy on one side, an illustration on the other.
 *
 * Rows alternate sides on desktop and stack in reading order on mobile — copy
 * always first, so the point arrives before the picture.
 */
export function FeatureRow({
  id,
  eyebrow,
  title,
  body,
  points,
  flip,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  points?: string[];
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="grid scroll-mt-20 items-center gap-8 lg:grid-cols-2 lg:gap-12">
      <div className={flip ? "lg:order-2" : ""}>
        <Badge variant="secondary">{eyebrow}</Badge>
        <h3 className="mt-4 text-xl font-semibold tracking-tight text-balance sm:text-2xl">{title}</h3>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{body}</p>
        {points ? (
          <ul className="mt-5 space-y-2.5">
            {points.map((point) => (
              <li key={point} className="flex gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className={cn("min-w-0", flip && "lg:order-1")}>{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Illustrations
   ------------------------------------------------------------------------ */

/**
 * The application at a glance: sidebar, KPI tiles, trend and a segment table.
 *
 * The sidebar is hidden below `sm` rather than shrunk — at phone width it would
 * cost half the frame to show a column of unreadable stripes.
 */
export function AppScreenMock() {
  const tiles: [string, string, string][] = [
    ["Net revenue", "₹7.07L", "+12.4%"],
    ["Orders", "20,444", "+8.1%"],
    ["Customers", "11,224", "+5.9%"],
    ["Repeat rate", "24%", "+2.2pp"],
  ];

  const rows: [string, string, string, number][] = [
    ["Champions", "1,204", "₹2.81L", 100],
    ["Loyal", "2,986", "₹1.94L", 69],
    ["At risk", "1,731", "₹1.12L", 40],
    ["Hibernating", "3,402", "₹0.71L", 25],
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex">
        <div className="hidden w-40 shrink-0 flex-col gap-0.5 border-r bg-muted/30 p-2.5 sm:flex">
          {["Dashboard", "Customers", "Products", "Inventory", "Campaigns", "Flows", "Assistant"].map((item, i) => (
            <span
              key={item}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs",
                i === 0 ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
              )}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold">Dashboard</span>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Last 12 months
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {tiles.map(([label, value, delta]) => (
              <div key={label} className="rounded-lg border p-2.5">
                <p className="truncate text-[10px] text-muted-foreground">{label}</p>
                <p className="text-base font-semibold tracking-tight tabular-nums sm:text-lg">{value}</p>
                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{delta}</p>
              </div>
            ))}
          </div>

          {/* Bars rather than a line: a line needs a path, and this needs none. */}
          <div className="mt-3 flex h-20 items-end gap-1 rounded-lg border p-2 sm:h-24">
            {[38, 52, 44, 63, 58, 71, 66, 82, 74, 90, 85, 96].map((height, i) => (
              <span key={i} className="flex-1 rounded-sm bg-primary/80" style={{ height: `${height}%` }} />
            ))}
          </div>

          <div className="mt-3 rounded-lg border">
            {rows.map(([segment, count, value, share], i) => (
              <div key={segment}>
                {i > 0 ? <Separator /> : null}
                <div className="flex items-center gap-2.5 px-2.5 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{segment}</span>
                  <Progress value={share} className="hidden h-1.5 w-20 sm:block" />
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{count}</span>
                  <span className="w-14 shrink-0 text-right text-[11px] font-medium tabular-nums">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * A phone frame, for the one screen a customer actually sees.
 *
 * WhatsApp is the half of the product that leaves the merchant's browser, so
 * showing it in a desktop card would misrepresent where it lands.
 */
export function PhoneFrame({ title, status, children }: { title: string; status: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-72 rounded-[2rem] border-8 border-foreground/90 bg-foreground/90 shadow-xl">
      <div className="overflow-hidden rounded-[1.5rem] bg-muted">
        <div className="flex items-center gap-2.5 bg-emerald-700 px-3 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold">
            {title.slice(0, 1)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-white">{title}</span>
            <span className="block truncate text-[10px] text-white/70">{status}</span>
          </span>
        </div>
        <div className="flex flex-col gap-2 p-3">{children}</div>
      </div>
    </div>
  );
}

function Bubble({
  from,
  children,
  className,
}: {
  from: "store" | "customer";
  children: React.ReactNode;
  className?: string;
}) {
  const mine = from === "store";
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-lg px-2.5 py-2 text-xs leading-relaxed shadow-sm",
        mine ? "self-start bg-background" : "self-end bg-emerald-100 text-emerald-950",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The campaign message a customer receives, and their reply. */
export function MessageMock() {
  return (
    <PhoneFrame title="Your Store" status="business account">
      <Bubble from="store">
        {/* The product photograph, drawn as a block rather than shown. */}
        <span className="mb-2 block h-20 rounded-md bg-muted-foreground/15" />
        <span className="block">
          Hi Anita, your usual refill is running low.
          <br />
          Reorder here: your-store.com/refill
        </span>
      </Bubble>
      <Bubble from="customer">Yes please — can you send two?</Bubble>
      <Bubble from="store">
        Done. Two on the way, and <b>REFILL10</b> takes 10% off this order.
      </Bubble>
    </PhoneFrame>
  );
}

/**
 * The out-of-hours menu, and the escape hatch out of it.
 *
 * The last bubble is the point: only the trigger word starts the menu, so a
 * real question still reaches a person rather than looping in a robot.
 */
export function AutoReplyMock() {
  return (
    <PhoneFrame title="Your Store" status="typically replies instantly">
      <Bubble from="customer">Hi</Bubble>
      <Bubble from="store">
        <span className="block font-medium">Hello! How can we help?</span>
        <span className="mt-1 block">
          1 · Track my order
          <br />
          2 · Reorder something
          <br />
          3 · Talk to a person
        </span>
      </Bubble>
      <Bubble from="customer">2</Bubble>
      <Bubble from="store">
        Here is what you bought last time. Reply <b>YES</b> and we will set it up.
      </Bubble>
      <Bubble from="customer">Actually, is it safe for sensitive skin?</Bubble>
      <Bubble from="store" className="bg-amber-100 text-amber-950">
        <span className="block text-[10px] font-semibold tracking-wide uppercase">Handed to a person</span>
        Not a menu option — so the bot stopped and your team was notified.
      </Bubble>
    </PhoneFrame>
  );
}

/** Segment bars, as the customers screen draws them. */
export function SegmentMock() {
  const rows: [string, number][] = [
    ["Champions", 95],
    ["Loyal", 74],
    ["At risk", 52],
    ["Hibernating", 31],
    ["Lost", 18],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between text-sm">
          Customer segments
          <span className="text-xs font-normal text-muted-foreground">RFM</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, width]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs sm:w-28">{label}</span>
            <Progress value={width} className="h-2.5 flex-1" />
            <span className="w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{width}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Campaign build: pick an audience, then see what it resolves to. */
export function CampaignMock() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Build an audience</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge>At risk</Badge>
          <Badge variant="outline">Champions</Badge>
          <Badge variant="outline">Lapsed 90d</Badge>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">214</p>
          <p className="text-xs text-muted-foreground">customers resolved · 198 reachable</p>
        </div>
        <div className="rounded-lg border p-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Dry run</span> — resolves the real list, sends nothing.
        </div>
      </CardContent>
    </Card>
  );
}

/** Cohort retention, as a grid that fades along each row. */
export function CohortMock() {
  const grid = [
    [100, 42, 31, 24, 19],
    [100, 38, 28, 21],
    [100, 45, 33],
    [100, 41],
    [100],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Retention, month by month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {grid.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            <span className="w-8 shrink-0 self-center text-[10px] text-muted-foreground">M{r + 1}</span>
            {row.map((value, c) => (
              <span
                key={c}
                className="flex h-7 flex-1 items-center justify-center rounded-md text-[10px] font-medium tabular-nums"
                style={{
                  backgroundColor: `color-mix(in oklch, var(--primary) ${value}%, transparent)`,
                  color: value >= 60 ? "var(--primary-foreground)" : "var(--foreground)",
                }}
              >
                {value}%
              </span>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Stock, ordered by the revenue behind it rather than by how empty it is. */
export function StockMock() {
  const rows: [string, string, string][] = [
    ["Bestselling SKU", "6 days", "bg-red-500"],
    ["Second bestseller", "9 days", "bg-amber-500"],
    ["Third bestseller", "21 days", "bg-emerald-500"],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Days of cover</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.map(([name, cover, dot]) => (
          <div key={name} className="flex items-center gap-3 rounded-lg border p-2.5">
            <span className={cn("size-2 shrink-0 rounded-full", dot)} />
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{cover}</span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Revenue at risk: ₹4.2L</p>
      </CardContent>
    </Card>
  );
}

/** A sequence, and the two steps that never send. */
export function FlowMock() {
  const steps: [string, string, boolean][] = [
    ["Day 0", "Reminder naming their product", false],
    ["Day 3", "A code, expiring in a fortnight", true],
    ["Day 10", "Last note before it lapses", true],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Win-back sequence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {steps.map(([day, text, dropped]) => (
          <div key={day} className={cn("rounded-lg border p-2.5", dropped && "opacity-60")}>
            <p className="text-xs font-medium">{day}</p>
            <p className="text-xs text-muted-foreground">{text}</p>
            {dropped ? (
              <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Never sent — they ordered on day 4
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** The assistant proposing, and waiting. */
export function AssistantMock() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">The assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">
          Which customers are about to churn?
        </div>
        <div className="rounded-lg border p-2.5 text-xs">
          214 customers are past their own usual reorder gap, worth ₹4.2L in predicted value.
        </div>
        <div className="rounded-lg border bg-muted/40 p-2.5">
          <p className="text-xs font-medium">Proposal · win-back to 214 customers</p>
          <div className="mt-2 flex gap-2">
            <span className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
              Approve
            </span>
            <span className="rounded-md border px-2.5 py-1 text-[11px] font-medium">Reject</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The assistant, as a thread rather than a single card.
 *
 * The chips are the honest part: the model is shown reading named, bounded
 * tools, so the reader can see what it had access to. A chat bubble alone would
 * imply it can reach anything.
 */
export function AssistantThreadMock() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <Sparkles className="size-3.5 text-primary" />
        <p className="text-xs font-medium">Assistant</p>
      </div>

      <div className="space-y-3 p-4">
        <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">
          Who is about to churn, and what should I send them?
        </div>

        <div className="flex flex-wrap gap-1.5">
          {["read_segments", "read_revenue", "read_products"].map((tool) => (
            <Badge key={tool} variant="outline" className="font-mono text-[10px]">
              {tool}
            </Badge>
          ))}
        </div>

        <div className="rounded-lg border p-3 text-xs leading-relaxed">
          <p>
            214 customers are past their own usual reorder gap, worth{" "}
            <span className="font-medium">₹4.2L</span> in predicted value. Most of them last bought a
            consumable, so a reorder nudge should outperform a discount.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">Proposal · win-back to 214 customers</p>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Not sent
            </Badge>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Reorder reminder, personalised per customer, with a 10% code valid a fortnight.
          </p>
          <div className="mt-2.5 flex gap-2">
            <span className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
              Approve
            </span>
            <span className="rounded-md border px-2.5 py-1 text-[11px] font-medium">Edit</span>
            <span className="rounded-md border px-2.5 py-1 text-[11px] font-medium">Reject</span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Nothing sends until you approve. Phone numbers were never in scope.
        </p>
      </div>
    </Card>
  );
}

/**
 * The campaign composer: audience on one side, the resolved send on the other.
 *
 * Shows the count and the dry run together because that pairing is the product
 * claim — you know exactly who it reaches before it reaches them.
 */
export function CampaignBuilderMock() {
  const filters: [string, string][] = [
    ["Segment", "At risk"],
    ["Value tier", "Top 40%"],
    ["Last order", "Over 90 days ago"],
    ["Bought", "Any consumable"],
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <Megaphone className="size-3.5 text-primary" />
        <p className="text-xs font-medium">Spring win-back</p>
      </div>

      <div className="p-4">
        <p className="text-[11px] font-medium text-muted-foreground">Audience</p>
        <div className="mt-2 space-y-1.5">
          {filters.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-md border px-2.5 py-1.5">
              <span className="text-[11px] text-muted-foreground">{label}</span>
              <span className="truncate text-xs font-medium">{value}</span>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["214", "resolved"],
            ["198", "reachable"],
            ["16", "opted out"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg border p-2">
              <p className="text-base font-semibold tracking-tight tabular-nums">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed p-2.5">
          <Check className="size-3.5 shrink-0 text-primary" />
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Dry run passed</span> — real list resolved,
            nothing sent.
          </p>
        </div>
      </div>
    </Card>
  );
}

/** The dashboard and the phone, as one row: the audience and the message. */
export function HeroShowcase() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.75fr_1fr] lg:gap-10">
      <AppScreenMock />
      <MessageMock />
    </div>
  );
}
