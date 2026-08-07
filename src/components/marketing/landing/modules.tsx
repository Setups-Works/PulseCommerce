import Link from "next/link";
import {
  ArrowRight,
  Inbox,
  MessageSquare,
  ReceiptText,
  } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { getFeatures, type FeatureItem } from "@/services/content-service";
import { resolveIcon } from "@/lib/marketing/icons";

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

const MODULE_FALLBACK: FeatureItem[] = [
  {
    title: "Revenue analytics",
    description:
      "Every KPI against the equal-length previous period, with the trend behind it.",
    icon: "BarChart3",
    metric: 12,
    metricUnit: "months compared",
    href: null,
    ctaLabel: null,
  },
  {
    title: "Customer intelligence",
    description:
      "RFM segmentation across recency, frequency and monetary value.",
    icon: "Users",
    metric: 10,
    metricUnit: "segments",
    href: null,
    ctaLabel: null,
  },
  {
    title: "Customer lifetime value",
    description:
      "Predicted spend per customer, discounted by their own churn risk.",
    icon: "LineChart",
    metric: 5,
    metricUnit: "value tiers",
    href: null,
    ctaLabel: null,
  },
  {
    title: "Churn prediction",
    description:
      "Judged against each customer's own reorder cadence, not a flat cutoff.",
    icon: "Compass",
    metric: 4,
    metricUnit: "risk bands",
    href: null,
    ctaLabel: null,
  },
  {
    title: "Cohort analysis",
    description:
      "Every month of acquisition followed forward, so you can see where people stop.",
    icon: "ChartColumnBig",
    metric: 36,
    metricUnit: "months tracked",
    href: null,
    ctaLabel: null,
  },
  {
    title: "Acquisition",
    description:
      "Which channels bring first-time buyers, and the time to a second order.",
    icon: "Compass",
    metric: 8,
    metricUnit: "channels",
    href: null,
    ctaLabel: null,
  },
  {
    title: "Product analytics",
    description:
      "ABC classification and market-basket affinity across the catalogue.",
    icon: "Boxes",
    metric: 3,
    metricUnit: "ABC classes",
    href: null,
    ctaLabel: null,
  },
  {
    title: "Inventory intelligence",
    description:
      "Days of cover from real velocity, reorder points, and the revenue behind each shortage.",
    icon: "Warehouse",
    metric: 1,
    metricUnit: "restock plan",
    href: null,
    ctaLabel: null,
  },
  {
    title: "Revenue forecasting",
    description:
      "Projected revenue with a confidence band, from your own trading history.",
    icon: "LineChart",
    metric: 90,
    metricUnit: "days ahead",
    href: null,
    ctaLabel: null,
  },
  {
    title: "WhatsApp campaigns",
    description:
      "Audiences that resolve at send time, personalised per customer, with a dry run.",
    icon: "Megaphone",
    metric: 10,
    metricUnit: "templates",
    href: null,
    ctaLabel: null,
  },
  {
    title: "Automated flows",
    description:
      "Multi-step sequences days apart that drop the rest once a customer orders.",
    icon: "Workflow",
    metric: 0,
    metricUnit: "double-sends",
    href: null,
    ctaLabel: null,
  },
  {
    title: "AI commerce agent",
    description:
      "Ask in plain English. It reads your figures and drafts; you approve.",
    icon: "Bot",
    metric: 0,
    metricUnit: "phone numbers in scope",
    href: null,
    ctaLabel: null,
  },
  {
    title: "Business intelligence",
    description: "Build and download the whole picture as PDF, Excel or CSV.",
    icon: "FileDown",
    metric: 10,
    metricUnit: "report types",
    href: null,
    ctaLabel: null,
  },
];

/** Modules that also have a screen of their own, for the footer row. */
const SURFACES: [typeof Inbox, string][] = [
  [Inbox, "Shared inbox"],
  [MessageSquare, "Auto-reply menu"],
  [ReceiptText, "Order register"],
];

export async function Modules() {
  /*
   * From the `features` table, collection "modules", falling back to the list
   * this section shipped with. The fallback lives here rather than in the
   * service so the copy sits next to the component that renders it.
   */
  const modules = await getFeatures("modules", MODULE_FALLBACK);

  return (
    <Section id="modules" className="bg-muted/20">
      <SectionHeading
        eyebrow="Thirteen modules"
        title="One price. Nothing behind a higher tier."
        body="Every figure below is computed from your own orders. There is no sample data anywhere in the product, and no module a smaller store is locked out of."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module, i) => {
          const Icon = resolveIcon(module.icon);
          return (
            <BlurFade key={module.title} delay={Math.min(i * 0.05, 0.4)} inView>
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
                    <Icon
                      className="size-4.5 text-primary"
                      strokeWidth={1.75}
                    />
                  </span>

                  <h3 className="mt-3.5 font-heading text-base font-medium">
                    {module.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {module.description}
                  </p>

                  {/* Only cards that carry a figure get the divider and ticker.
                    A card with no metric would otherwise show a bare rule and
                    an empty row. */}
                  {module.metric !== null ? (
                    <p className="mt-4 flex items-baseline gap-1.5 border-t pt-3">
                      <NumberTicker
                        value={module.metric}
                        className="text-lg font-semibold tracking-tight text-foreground"
                      />
                      <span className="text-xs text-muted-foreground">
                        {module.metricUnit}
                      </span>
                    </p>
                  ) : null}
                </div>
              </MagicCard>
            </BlurFade>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {SURFACES.map(([Icon, label]) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </span>
          ))}
        </div>

        <Button
          variant="outline"
          size="lg"
          asChild
          className="h-10 px-5 text-sm"
        >
          <Link href="/features">
            Every module in detail
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </Section>
  );
}
