import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AssistantMock,
  CampaignMock,
  CohortMock,
  FeatureRow,
  FlowMock,
  MessageMock,
  Section,
  SectionHeading,
  SegmentMock,
  StockMock,
} from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Thirteen modules: RFM segmentation, predicted lifetime value, cohort retention, acquisition channels, ABC product classes, days of cover, WhatsApp campaigns, automated flows and an assistant that proposes.",
};

/**
 * The features page.
 *
 * Ordered the way the work is: understand the base, then act on it, then let
 * the product act for you. Each anchor here is a target the header's Product
 * menu already points at, so the two files have to agree — the ids are the
 * contract between them.
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

export default function FeaturesPage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-12 sm:px-6 md:pt-20">
        <Badge variant="outline" className="gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          Thirteen modules, all included
        </Badge>
        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Everything is computed from your own orders.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          There is no sample data anywhere in the product. Connect a store and every figure below is
          derived from one cached snapshot of your real order history.
        </p>
      </section>

      <Section className="space-y-16 pt-0 sm:space-y-20">
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
          <SegmentMock />
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
          <CohortMock />
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
          <StockMock />
        </FeatureRow>
      </Section>

      <Section className="bg-muted/30">
        <SectionHeading
          align="center"
          title="Then act, without leaving the screen"
          body="Finding the customer who is slipping away is only useful if you can reach them. The audience you just built is the audience you send to."
        />
      </Section>

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
          <MessageMock />
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

      <Section className="bg-muted/30">
        <SectionHeading
          title="Ten reports, as PDF, Excel or CSV"
          body="Every screen is also a document. Export what is on it, or schedule the whole set."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((report) => (
            <Card key={report}>
              <CardContent className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm">{report}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              See it on your own numbers
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-muted-foreground">
              Read-only access, approved inside your own WordPress admin. Disconnecting wipes every
              cached order.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-3">
              <Button size="lg" asChild className="h-10 px-5 text-sm">
                <Link href="/connect">
                  Connect your store
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-10 px-5 text-sm">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}
