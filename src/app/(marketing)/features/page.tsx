import type { Metadata } from "next";
import { Check, FileDown } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { Safari } from "@/components/ui/safari";
import {
  AssistantMock,
  CampaignMock,
  FeatureRow,
  FlowMock,
  Section,
  SectionHeading,
} from "@/components/marketing/sections";
import { Cta } from "@/components/marketing/landing/cta";
import { PageHero } from "@/components/marketing/landing/page-hero";
import { PhoneScreen } from "@/components/marketing/landing/phone-screen";
import { ProductScreen } from "@/components/marketing/landing/product-screen";
import { Iphone } from "@/components/ui/iphone";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Thirteen modules: RFM segmentation, predicted lifetime value, cohort retention, acquisition channels, ABC product classes, days of cover, WhatsApp campaigns, automated flows and an assistant that proposes.",
  alternates: { canonical: "/features" },
};

/**
 * The features page.
 *
 * Ordered the way the work is: understand the base, then act on it, then let
 * the product act for you. Each anchor here is a target the header's Product
 * menu already points at, so the two files have to agree — the ids are the
 * contract between them.
 *
 * The analysis rows show real screens inside a browser frame rather than the
 * small card mocks they used to; the acting rows keep the card mocks, because
 * a campaign builder is a panel rather than a page. The WhatsApp row is the one
 * that gets a phone: it is the half of the product that leaves the merchant's
 * browser, and a desktop frame around it would say the wrong thing.
 */

const REPORTS = [
  "Revenue and orders over any window",
  "Customer segments with every member listed",
  "Predicted lifetime value by tier",
  "Cohort retention, month by month",
  "Acquisition channels and first-order source",
  "Product performance with ABC classes",
  "Market-basket affinity pairs",
  "Inventory cover and reorder points",
  "Campaign sends and delivery outcomes",
  "B2B accounts rolled up by company",
];

/** A product screen in a browser frame, sized for a feature row. */
function ScreenFrame({
  view,
  url,
  beam = false,
}: {
  view: React.ComponentProps<typeof ProductScreen>["view"];
  url: string;
  beam?: boolean;
}) {
  return (
    <div
      aria-hidden
      className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10 shadow-[0_16px_50px_-20px_rgb(0_0_0/0.3)]"
    >
      <Safari url={url} className="w-full">
        <ProductScreen view={view} />
      </Safari>
      {beam ? (
        <BorderBeam
          size={160}
          duration={11}
          colorFrom="var(--primary)"
          colorTo="color-mix(in oklch, var(--chart-7) 70%, transparent)"
        />
      ) : null}
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <main>
      <PageHero
        id="features"
        eyebrow="Thirteen modules, all included"
        title="Everything is computed from"
        accent="your own orders."
        body="There is no sample data anywhere in the product. Connect a store and every figure below is derived from one cached snapshot of your real order history."
        secondary={{ label: "See pricing", href: "/pricing" }}
        aside={<ScreenFrame view="overview" url="app.pulsecommerce.io/dashboard" beam />}
      />

      {/* ---- Analyse ------------------------------------------------------- */}
      <Section className="space-y-16 sm:space-y-20">
        <SectionHeading
          eyebrow="Analyse"
          title="Understand the base before you touch it"
          body="Three modules that turn an order table into a picture of who is buying, what they buy and whether they come back."
        />

        <FeatureRow
          id="customers"
          eyebrow="Customer intelligence"
          title="Ten segments, scored on your own base"
          body="Recency, frequency and monetary value are quintiled across your customers, so a Champion in your store is defined by your store rather than an industry average."
          points={[
            "Ten RFM segments and five value tiers",
            "Predicted lifetime value, discounted by churn risk",
            "Churn judged against each customer's own reorder cadence",
            "Every customer listed, not a capped slice",
          ]}
        >
          <ScreenFrame view="customers" url="app.pulsecommerce.io/customers" />
        </FeatureRow>

        <FeatureRow
          flip
          id="revenue"
          eyebrow="Revenue & acquisition"
          title="Every KPI against the period before it"
          body="A number without a comparison is trivia. Each metric is measured against the equal-length previous period, so a good month is visibly a good month."
          points={[
            "Net revenue, orders, customers and repeat rate",
            "Acquisition channels that bring first-time buyers",
            "Time to second order, with quartiles",
            "Cohort retention plotted month by month",
          ]}
        >
          <ScreenFrame view="retention" url="app.pulsecommerce.io/cohorts" />
        </FeatureRow>

        <FeatureRow
          id="products"
          eyebrow="Products & stock"
          title="What to reorder, ranked by the revenue behind it"
          body="Days of cover computed from real velocity rather than a flat threshold, so the item that matters surfaces before the item that is merely low."
          points={[
            "ABC classification across the catalogue",
            "Market-basket affinity: what sells together",
            "Days of cover and reorder points from real velocity",
            "The revenue at risk behind each shortage",
          ]}
        >
          <ScreenFrame view="forecast" url="app.pulsecommerce.io/inventory" />
        </FeatureRow>
      </Section>

      <Section className="bg-muted/20 py-12 md:py-14">
        <SectionHeading
          align="center"
          title="Then act, without leaving the screen"
          body="Finding the customer who is slipping away is only useful if you can reach them. The audience you just built is the audience you send to."
        />
      </Section>

      {/* ---- Act ------------------------------------------------------------ */}
      <Section className="space-y-16 sm:space-y-20">
        <FeatureRow
          id="campaigns"
          eyebrow="WhatsApp campaigns"
          title="The message names the product they actually buy"
          body="Personalised from each customer's own history — the item they spend most on, its photograph, and a link straight to it. Write once; everyone gets their own."
          points={[
            "Ten templates for reorder, win-back, restock and review",
            "Coupons created in WooCommerce, restricted to the product",
            "A dry run that resolves the real list and sends nothing",
            "A typed confirmation before anything leaves",
          ]}
        >
          <div aria-hidden className="mx-auto w-full max-w-64">
            <Iphone>
              <PhoneScreen conversation="campaign" />
            </Iphone>
          </div>
        </FeatureRow>

        <FeatureRow
          flip
          id="flows"
          eyebrow="Automated flows"
          title="Sequences that stop the moment they buy"
          body="Multi-step sequences days apart. Customers join as they qualify, nobody enters twice, and they leave the sequence the moment they place an order."
          points={[
            "Steps scheduled days apart, not all at once",
            "Customers join as they qualify",
            "Nobody enters the same flow twice",
            "Remaining steps are dropped once they order",
          ]}
        >
          <FlowMock />
        </FeatureRow>

        <FeatureRow
          id="assistant"
          eyebrow="The assistant"
          title="It proposes. You approve."
          body="Ask about the business in plain English. It reads your figures, drafts the message, and then stops — nothing is sent until you approve the card in front of you."
          points={[
            "Reads revenue, segments, stock, flows and the gateway",
            "No tool for messaging your whole customer base",
            "Phone numbers are absent from everything it can read",
            "Approving runs the same guarded route a person would use",
          ]}
        >
          <AssistantMock />
        </FeatureRow>

        <FeatureRow
          flip
          eyebrow="Audience builder"
          title="An audience is a filter, not a list you maintain"
          body="Stack segment, value tier, product and recency filters and the count updates as you go. Nothing is exported, nothing goes stale, and the list resolves at send time."
          points={[
            "Reachable count shown before you send",
            "Opt-outs removed automatically",
            "The same audience can drive a flow",
          ]}
        >
          <CampaignMock />
        </FeatureRow>
      </Section>

      {/* ---- Reports --------------------------------------------------------- */}
      <Section className="bg-muted/20">
        <SectionHeading
          eyebrow="Exports"
          title="Ten reports, as PDF, Excel or CSV"
          body="Every screen is also a document. Export what is on it, or schedule the whole set."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((report, i) => (
            <BlurFade key={report} delay={Math.min(i * 0.04, 0.3)} inView>
              <MagicCard
                className="h-full rounded-xl ring-1 ring-foreground/10"
                gradientFrom="var(--primary)"
                gradientTo="var(--chart-7)"
                gradientColor="color-mix(in oklch, var(--primary) 8%, transparent)"
                gradientOpacity={1}
                gradientSize={200}
              >
                <div className="flex items-start gap-2.5 p-4">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-sm">{report}</span>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </div>

        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <FileDown className="size-4 shrink-0" />
          Same figures, same formatting as the screen they came from.
        </p>
      </Section>

      <Cta
        id="features-cta"
        title="See it on your own numbers"
        body="Read-only access, approved inside your own WordPress admin. Disconnecting wipes every cached order."
      />
    </main>
  );
}
