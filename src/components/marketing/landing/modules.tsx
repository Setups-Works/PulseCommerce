import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  ChartColumnBig,
  Compass,
  FileDown,
  Inbox,
  LineChart,
  Megaphone,
  MessageSquare,
  ReceiptText,
  Users,
  Warehouse,
  Workflow,
} from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Section, SectionHeading } from "@/components/marketing/sections";

/**
 * The thirteen modules.
 *
 * One card each, in the order a merchant would actually meet them: what
 * happened, who it happened to, what they bought, then what to do about it.
 * Alphabetical or by-icon ordering would be easier and would tell the reader
 * nothing.
 *
 * Every card carries a concrete figure — "10 segments", "8 channels" — rather
 * than an adjective. The figures are counts of what the module computes, which
 * are facts about the software rather than claims about anyone's results.
 *
 * Cards reveal in a staggered cascade, capped at a tenth of a second per step:
 * thirteen cards at a slower stagger means the last one arrives a second and a
 * half after the first, which reads as the page being slow rather than smooth.
 */

const MODULES: { icon: typeof Users; title: string; body: string; metric: number; unit: string }[] = [
  {
    icon: BarChart3,
    title: "Revenue analytics",
    body: "Every KPI against the equal-length previous period, with the trend behind it.",
    metric: 12,
    unit: "months compared",
  },
  {
    icon: Users,
    title: "Customer intelligence",
    body: "RFM segmentation across recency, frequency and monetary value.",
    metric: 10,
    unit: "segments",
  },
  {
    icon: LineChart,
    title: "Customer lifetime value",
    body: "Predicted spend per customer, discounted by their own churn risk.",
    metric: 5,
    unit: "value tiers",
  },
  {
    icon: Compass,
    title: "Churn prediction",
    body: "Judged against each customer's own reorder cadence, not a flat cutoff.",
    metric: 4,
    unit: "risk bands",
  },
  {
    icon: ChartColumnBig,
    title: "Cohort analysis",
    body: "Every month of acquisition followed forward, so you can see where people stop.",
    metric: 36,
    unit: "months tracked",
  },
  {
    icon: Compass,
    title: "Acquisition",
    body: "Which channels bring first-time buyers, and the time to a second order.",
    metric: 8,
    unit: "channels",
  },
  {
    icon: Boxes,
    title: "Product analytics",
    body: "ABC classification and market-basket affinity across the catalogue.",
    metric: 3,
    unit: "ABC classes",
  },
  {
    icon: Warehouse,
    title: "Inventory intelligence",
    body: "Days of cover from real velocity, reorder points, and the revenue behind each shortage.",
    metric: 1,
    unit: "restock plan",
  },
  {
    icon: LineChart,
    title: "Revenue forecasting",
    body: "Projected revenue with a confidence band, from your own trading history.",
    metric: 90,
    unit: "days ahead",
  },
  {
    icon: Megaphone,
    title: "WhatsApp campaigns",
    body: "Audiences that resolve at send time, personalised per customer, with a dry run.",
    metric: 10,
    unit: "templates",
  },
  {
    icon: Workflow,
    title: "Automated flows",
    body: "Multi-step sequences days apart that drop the rest once a customer orders.",
    metric: 0,
    unit: "double-sends",
  },
  {
    icon: Bot,
    title: "AI commerce agent",
    body: "Ask in plain English. It reads your figures and drafts; you approve.",
    metric: 0,
    unit: "phone numbers in scope",
  },
  {
    icon: FileDown,
    title: "Business intelligence",
    body: "Build and download the whole picture as PDF, Excel or CSV.",
    metric: 10,
    unit: "report types",
  },
];

/** Modules that also have a screen of their own, for the footer row. */
const SURFACES: [typeof Inbox, string][] = [
  [Inbox, "Shared inbox"],
  [MessageSquare, "Auto-reply menu"],
  [ReceiptText, "Order register"],
];

export function Modules() {
  return (
    <Section id="modules" className="bg-muted/20">
      <SectionHeading
        eyebrow="Thirteen modules"
        title="One price. Nothing behind a higher tier."
        body="Every figure below is computed from your own orders. There is no sample data anywhere in the product, and no module a smaller store is locked out of."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(({ icon: Icon, title, body, metric, unit }, i) => (
          <BlurFade key={title} delay={Math.min(i * 0.05, 0.4)} inView>
            <MagicCard
              className="h-full rounded-xl ring-1 ring-foreground/10"
              gradientFrom="var(--primary)"
              gradientTo="var(--chart-7)"
              gradientColor="color-mix(in oklch, var(--primary) 8%, transparent)"
              gradientOpacity={1}
              gradientSize={220}
            >
              <div className="flex h-full flex-col p-5">
                <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50">
                  <Icon className="size-4.5 text-primary" strokeWidth={1.75} />
                </span>

                <h3 className="mt-3.5 font-heading text-base font-medium">{title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>

                <p className="mt-4 flex items-baseline gap-1.5 border-t pt-3">
                  <NumberTicker
                    value={metric}
                    className="text-lg font-semibold tracking-tight text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">{unit}</span>
                </p>
              </div>
            </MagicCard>
          </BlurFade>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {SURFACES.map(([Icon, label]) => (
            <span key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon className="size-4 shrink-0" />
              {label}
            </span>
          ))}
        </div>

        <Button variant="outline" size="lg" asChild className="h-10 px-5 text-sm">
          <Link href="/features">
            Every module in detail
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </Section>
  );
}
