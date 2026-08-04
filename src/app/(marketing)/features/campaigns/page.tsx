import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clock, Filter, Megaphone, ShieldCheck, Ticket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AssistantThreadMock,
  CampaignBuilderMock,
  FeatureRow,
  FlowMock,
  MessageMock,
  Section,
  SectionHeading,
  SegmentMock,
} from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Campaigns",
  description:
    "Build an audience from your real analytics, personalise every message from that customer's own history, dry-run the list, and send on WhatsApp through a gateway you own.",
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
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 md:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-14">
          <div>
            <Badge variant="outline" className="gap-1.5">
              <Megaphone className="size-3" />
              Campaigns
            </Badge>
            <h1 className="mt-6 max-w-2xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              An audience is a filter, not a list you maintain.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Stack segment, value tier, product and recency filters over your live analytics. The
              count updates as you go, nothing is exported, and the list resolves at send time — so
              it can never be stale.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <Button size="lg" asChild className="h-10 px-5 text-sm">
                <Link href="/connect">
                  Get started free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-10 px-5 text-sm">
                <Link href="/features/ai">See the assistant</Link>
              </Button>
            </div>
          </div>

          <div className="w-full lg:w-80">
            <CampaignBuilderMock />
          </div>
        </div>
      </section>

      {/* ---- The four steps ---------------------------------------------------- */}
      <Section className="bg-muted/30">
        <SectionHeading
          title="Four steps, and a stop before the last one"
          body="The dry run exists because a send to real customers cannot be taken back."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Filter, "1 · Filter", "Segment, value tier, product and recency, stacked."],
            [Users, "2 · Resolve", "See who it reaches, and who opted out."],
            [ShieldCheck, "3 · Dry run", "The real list, resolved. Nothing sent."],
            [Clock, "4 · Send", "Now, or as steps days apart."],
          ].map(([Icon, title, body]) => {
            const Ico = Icon as typeof Users;
            return (
              <Card key={title as string} className="h-full">
                <CardHeader>
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                    <Ico className="size-4.5 text-primary" />
                  </span>
                  <CardTitle className="mt-3 text-base">{title as string}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{body as string}</p>
                </CardContent>
              </Card>
            );
          })}
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
          <SegmentMock />
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
          <MessageMock />
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
      <Section id="templates" className="bg-muted/30">
        <SectionHeading
          title="Ten templates, personalised per customer"
          body="Each fills itself from that customer's own history. You write the shape; the product writes the specifics."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map(([name, blurb]) => (
            <Card key={name}>
              <CardContent>
                <h3 className="text-sm font-semibold">{name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">The tokens every template understands</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {TOKENS.map(([token, meaning], i) => (
              <div key={token}>
                {i > 0 ? <Separator /> : null}
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-6 py-2.5">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{token}</code>
                  <span className="text-sm text-muted-foreground">{meaning}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>

      {/* ---- Coupons --------------------------------------------------------------- */}
      <Section>
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
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
          </div>
          <CampaignBuilderMock />
        </div>
      </Section>

      {/* ---- Guards ------------------------------------------------------------------ */}
      <Section className="bg-muted/30">
        <div className="flex flex-col gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border bg-background">
            <ShieldCheck className="size-5 text-primary" />
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Nothing sends by accident
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Messaging real customers is the one thing in this product that cannot be undone, so every
            path to it is guarded.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {GUARDS.map((guard) => (
            <Card key={guard}>
              <CardContent className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm">{guard}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Send your first campaign today
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-muted-foreground">
              Connect a store, build an audience from your real customers, and dry-run it before a
              single message leaves.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-3">
              <Button size="lg" asChild className="h-10 px-5 text-sm">
                <Link href="/connect">
                  Connect your store
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-10 px-5 text-sm">
                <Link href="/whatsapp">See how it arrives</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}
