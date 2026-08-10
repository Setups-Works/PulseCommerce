import type { Metadata } from "next";
import { Check, Clock, Filter, ShieldCheck, Ticket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Iphone } from "@/components/ui/iphone";
import { MagicCard } from "@/components/ui/magic-card";
import { Marquee } from "@/components/ui/marquee";
import { Safari } from "@/components/ui/safari";
import { Separator } from "@/components/ui/separator";
import {
  AssistantThreadMock,
  CampaignBuilderMock,
  FeatureRow,
  FlowMock,
  Section,
  SectionHeading,
} from "@/components/marketing/sections";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { Cta } from "@/components/marketing/landing/cta";
import { PageHero } from "@/components/marketing/landing/page-hero";
import { PhoneScreen } from "@/components/marketing/landing/phone-screen";
import { ProductScreen } from "@/components/marketing/landing/product-screen";

export const metadata: Metadata = {
  title: "Campaigns",
  description:
    "Build an audience from your real analytics, personalise every message from that customer's own history, dry-run the list, and send on WhatsApp through a gateway you own.",
  alternates: { canonical: "/features/campaigns" },
};

/**
 * The campaigns page.
 *
 * The argument is that the audience and the analytics are the same object — a
 * campaign here is a filter over live customer data, not a list you exported
 * last Tuesday. Everything below follows from that.
 *
 * Names and products in every mock are generic placeholders; this page is
 * public and a real catalogue on it would leak a real store's data.
 */

const STEPS: [typeof Users, string, string][] = [
  [Filter, "1 · Filter", "Segment, value tier, product and recency, stacked."],
  [Users, "2 · Resolve", "See who it reaches, and who opted out."],
  [ShieldCheck, "3 · Dry run", "The real list, resolved. Nothing sent."],
  [Clock, "4 · Send", "Now, or as steps days apart."],
];

const TEMPLATES: [string, string][] = [
  ["Reorder reminder", "Their usual item, timed to their own cadence"],
  ["Win-back", "For customers past their normal reorder gap"],
  ["Back in stock", "To the people who bought it before"],
  ["Review request", "A few days after delivery, once"],
  ["Cross-sell", "The item most often bought alongside theirs"],
  ["Cart recovery", "For a checkout that was started and left"],
  ["First-order thanks", "With a code for the second order"],
  ["VIP note", "To the top value tier only"],
  ["Festival offer", "Scheduled, to a segment you choose"],
  ["Custom", "Your own copy, same personalisation tokens"],
];

const TOKENS: [string, string][] = [
  ["{{first_name}}", "From the billing name on their orders"],
  ["{{top_product}}", "The item they have spent the most on"],
  ["{{product_link}}", "A link straight to that product"],
  ["{{last_order_date}}", "When they last bought anything"],
  ["{{coupon_code}}", "A code created in WooCommerce for this send"],
];

const GUARDS = [
  "Opt-outs are removed from every audience automatically",
  "A dry run resolves the real list and sends nothing",
  "A typed confirmation before any real send",
  "Phone numbers are resolved server-side, never sent to the browser",
  "Nobody enters the same flow twice",
  "Remaining flow steps are dropped the moment they order",
];

export default function CampaignsPage() {
  return (
    <main>
      <PageHero
        id="campaigns"
        eyebrow="Campaigns"
        title="An audience is a filter,"
        accent="not a list you maintain."
        body="Stack segment, value tier, product and recency filters over your live analytics. The count updates as you go, nothing is exported, and the list resolves at send time — so it can never be stale."
        secondary={{ label: "See the assistant", href: "/features/ai" }}
        aside={
          <div className="relative mx-auto w-full max-w-80">
            <CampaignBuilderMock />
            <BorderBeam
              size={130}
              duration={10}
              colorFrom="var(--primary)"
              colorTo="color-mix(in oklch, var(--chart-3) 70%, transparent)"
            />
          </div>
        }
      />

      {/* ---- The four steps ---------------------------------------------------- */}
      <Section className="bg-muted/20">
        <SectionHeading
          eyebrow="The shape of a send"
          title="Four steps, and a stop before the last one"
          body="The dry run exists because a send to real customers cannot be taken back."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([Icon, title, body], i) => (
            <BlurFade key={title} delay={i * 0.07} inView className="h-full">
              <MagicCard
                className="h-full rounded-xl ring-1 ring-foreground/10"
                gradientFrom="var(--primary)"
                gradientTo="var(--chart-7)"
                gradientColor="color-mix(in oklch, var(--primary) 8%, transparent)"
                gradientOpacity={1}
              >
                <div className="p-5">
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                    <Icon className="size-4.5 text-primary" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-3 font-heading text-base font-medium">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </div>
      </Section>

      {/* ---- Rows -------------------------------------------------------------- */}
      <Section className="space-y-16 sm:space-y-20">
        <FeatureRow
          id="audience"
          eyebrow="Audience"
          title="Built from the analytics, not a spreadsheet"
          body="The same RFM segments and value tiers the customers screen shows are the filters here. Change what a Champion means and every campaign targeting Champions follows, because there was never a copy of the list."
          points={[
            "Ten segments and five value tiers as filters",
            "Filter by product bought, or by recency",
            "Reachable count shown before you send",
            "Opt-outs removed automatically",
          ]}
        >
          {/* The screen the filters live on, not a diagram of it. */}
          <div
            aria-hidden
            className="overflow-hidden rounded-xl ring-1 ring-foreground/10 shadow-[0_16px_50px_-20px_rgb(0_0_0/0.3)]"
          >
            <Safari url="app.pulsecommerce.io/campaigns" className="w-full">
              <ProductScreen view="customers" />
            </Safari>
          </div>
        </FeatureRow>

        <FeatureRow
          flip
          id="personalisation"
          eyebrow="Personalisation"
          title="Write once; everyone gets their own"
          body="Tokens resolve per recipient from that customer's own history — the item they spend most on, its photograph, and a link straight to it. One message, written once, arriving as a different message for each person."
          points={[
            "Tokens fill from each customer's own orders",
            "Product photograph attached automatically",
            "Coupons created in WooCommerce, restricted to the product",
            "A preview rendered against a real customer before you send",
          ]}
        >
          {/* A phone, because this is the half the customer sees. */}
          <div aria-hidden className="mx-auto w-full max-w-64">
            <Iphone>
              <PhoneScreen conversation="campaign" />
            </Iphone>
          </div>
        </FeatureRow>

        <FeatureRow
          id="flows"
          eyebrow="Flows"
          title="Sequences that stop the moment they buy"
          body="A campaign is one send; a flow is several, days apart. Customers join as they qualify, nobody enters twice, and the remaining steps are dropped as soon as an order arrives — so nobody is chased for something they already bought."
          points={[
            "Steps scheduled days apart, not all at once",
            "Customers join as they qualify",
            "Nobody enters the same flow twice",
            "Remaining steps dropped once they order",
          ]}
        >
          <FlowMock />
        </FeatureRow>

        <FeatureRow
          flip
          id="assistant"
          eyebrow="With the assistant"
          title="Or have the whole thing drafted for you"
          body="Ask which customers are slipping away and the assistant proposes the audience and the copy together. Approving the card drops you into this same builder with the filters already set."
          points={[
            "The audience is resolved before you decide",
            "Edit the copy before approving",
            "Nothing sends until you approve",
          ]}
        >
          <AssistantThreadMock />
        </FeatureRow>
      </Section>

      {/* ---- Templates ------------------------------------------------------------ */}
      <Section id="templates" className="overflow-hidden bg-muted/20">
        <SectionHeading
          eyebrow="Templates"
          title="Ten templates, personalised per customer"
          body="Each fills itself from that customer's own history. You write the shape; the product writes the specifics."
        />

        {/* A marquee rather than a grid: ten near-identical cards in rows read
            as a wall of text, where a moving band reads as a set to browse. */}
        <div className="relative mt-10">
          <Marquee pauseOnHover className="[--duration:46s] [--gap:1rem]">
            {TEMPLATES.map(([name, blurb]) => (
              <div
                key={name}
                className="w-64 shrink-0 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-[0_8px_28px_-12px_rgb(0_0_0/0.22)]"
              >
                <BrandMark icon={BRANDS.whatsapp} className="size-4 text-muted-foreground" />
                <h3 className="mt-2.5 text-sm font-semibold">{name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
              </div>
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-background to-transparent sm:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-background to-transparent sm:w-24" />
        </div>

        <BlurFade delay={0.1} inView>
          <div className="mt-8 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="border-b px-5 py-3.5">
              <h3 className="font-heading text-base font-medium">
                The tokens every template understands
              </h3>
            </div>
            {TOKENS.map(([token, meaning], i) => (
              <div key={token}>
                {i > 0 ? <Separator /> : null}
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-2.5">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{token}</code>
                  <span className="text-sm text-muted-foreground">{meaning}</span>
                </div>
              </div>
            ))}
          </div>
        </BlurFade>
      </Section>

      {/* ---- Coupons --------------------------------------------------------------- */}
      <Section>
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <BlurFade inView>
            <Badge variant="secondary" className="gap-1.5">
              <Ticket className="size-3" />
              Coupons
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              The one thing written back to your store
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              A campaign code is created in WooCommerce itself, restricted to the product it is
              advertising and expiring when you say. It is the only write this app ever makes, and
              only when you ask for one.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Created in WooCommerce, so it works at your real checkout",
                "Restricted to the product in the message",
                "Expiry set per campaign",
                "Redemption tracked back against the send",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-dashed bg-card/40 p-3">
              <BrandMark icon={BRANDS.woocommerce} className="size-5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Written through the same WooCommerce REST API everything else is read from.
              </p>
            </div>
          </BlurFade>

          <BlurFade delay={0.1} inView>
            <CampaignBuilderMock />
          </BlurFade>
        </div>
      </Section>

      {/* ---- Guards ------------------------------------------------------------------ */}
      <Section className="bg-muted/20">
        <BlurFade inView>
          <span className="flex size-10 items-center justify-center rounded-lg border bg-background">
            <ShieldCheck className="size-5 text-primary" />
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Nothing sends by accident
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Messaging real customers is the one thing in this product that cannot be undone, so every
            path to it is guarded.
          </p>
        </BlurFade>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {GUARDS.map((guard, i) => (
            <BlurFade key={guard} delay={Math.min(i * 0.05, 0.3)} inView>
              <div className="flex items-start gap-2.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm">{guard}</span>
              </div>
            </BlurFade>
          ))}
        </div>
      </Section>

      <Cta
        id="campaigns-cta"
        title="Send your first campaign today"
        body="Connect a store, build an audience from your real customers, and dry-run it before a single message leaves."
      />
    </main>
  );
}
