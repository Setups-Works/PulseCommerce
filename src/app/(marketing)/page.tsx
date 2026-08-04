import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  CalendarClock,
  Check,
  Megaphone,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AssistantMock,
  AssistantThreadMock,
  AutoReplyMock,
  CampaignBuilderMock,
  CampaignMock,
  CohortMock,
  FeatureRow,
  FlowMock,
  HeroShowcase,
  MessageMock,
  Section,
  SectionHeading,
  SegmentMock,
  StockMock,
} from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "PulseCommerce — Analytics and WhatsApp for WooCommerce",
  description:
    "Know who your best customers are, which ones are about to leave, and what they buy — then message them on WhatsApp from the same screen, through a gateway you own.",
};

/**
 * The landing page.
 *
 * Built from the same components as the application, so a visitor who signs up
 * lands somewhere that looks like the page that sold it to them. Every claim
 * here is one the product actually keeps — the file sits next to the code that
 * implements it, so an invented feature would be visible to anyone reading
 * both.
 */

const MODULES = [
  {
    icon: Users,
    title: "Customer intelligence",
    body: "RFM segmentation into ten segments, five value tiers, predicted lifetime value discounted by churn risk, and cohort retention month by month.",
  },
  {
    icon: BarChart3,
    title: "Revenue you can act on",
    body: "Every KPI against the equal-length previous period, acquisition channels that bring first-time buyers, and time to second order with quartiles.",
  },
  {
    icon: Boxes,
    title: "Products and stock",
    body: "ABC classification, market-basket affinity, days of cover from real velocity, reorder points, and the revenue at risk behind each shortage.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp campaigns",
    body: "Ten templates personalised from each customer's own history, coupons created in WooCommerce, a dry run that sends nothing, and a typed confirmation.",
  },
  {
    icon: CalendarClock,
    title: "Flows that run themselves",
    body: "Multi-step sequences days apart. Customers join as they qualify, nobody enters twice, and they leave the moment they buy.",
  },
  {
    icon: Bot,
    title: "An assistant that proposes",
    body: "Ask about the business in plain English. It reads your figures and drafts messages — then waits for you to approve before anything is sent.",
  },
];

const STACK: [string, string, string][] = [
  ["01", "Your WooCommerce store", "Read over the REST API. One write: coupons."],
  ["02", "PulseCommerce", "One cached snapshot. Every metric derived from it."],
  ["03", "Your own WhatsApp API", "Your server, your number, no per-message fee."],
  ["04", "The model", "Sees counts and names. Never a phone number."],
];

export default function LandingPage() {
  return (
    <main>
      {/* ---- Announcement -------------------------------------------------- */}
      <div className="border-b bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-4 py-2.5 text-center text-xs sm:px-6">
          <Badge variant="secondary" className="text-[10px]">
            New
          </Badge>
          <span className="text-muted-foreground">Automated flows and the AI assistant are live</span>
          <Link href="#demo" className="font-medium underline-offset-4 hover:underline">
            See what&rsquo;s new
          </Link>
        </div>
      </div>

      {/* ---- Hero ---------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 text-center sm:px-6 md:pt-20">
        <Badge variant="outline" className="gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          For WooCommerce stores
        </Badge>

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
          Know who buys.{" "}
          <span className="text-muted-foreground">Win them back on WhatsApp.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg md:text-xl">
          WooCommerce tells you what sold. PulseCommerce tells you who bought it, which of them is
          slipping away, and what to say to bring them back.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-3">
          <Button size="lg" asChild className="h-10 px-5 text-sm">
            <Link href="/connect">
              Get started free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="h-10 px-5 text-sm">
            <Link href="/whatsapp">
              <PlayCircle className="size-4" />
              See WhatsApp in action
            </Link>
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm">
          {["Self-hosted", "No per-message fee", "Read-only access", "Your data stays yours"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <Check className="size-3.5 shrink-0 text-primary" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ---- The product, in one row ---------------------------------------- */}
      <section id="demo" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6">
        <HeroShowcase />
      </section>

      {/* ---- Numbers --------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["13", "Modules, all included"],
            ["10", "Report types, as PDF, Excel or CSV"],
            ["10", "Message templates, personalised per customer"],
            ["0", "Customer records sent to a third party"],
          ].map(([value, label]) => (
            <Card key={label}>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---- Modules ---------------------------------------------------------- */}
      <Section id="features">
        <SectionHeading
          title="Thirteen modules. One price."
          body="Nothing here is a placeholder. Every figure is computed from your own orders — there is no sample data anywhere in the product."
        />

        <div className="mt-10 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="h-full">
              <CardHeader>
                <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50">
                  <Icon className="size-4.5 text-primary" />
                </span>
                <CardTitle className="mt-3 text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Button variant="outline" size="lg" asChild className="h-10 px-5 text-sm">
            <Link href="/features">
              Every module in detail
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* ---- Feature rows ------------------------------------------------------ */}
      <Section className="space-y-16 sm:space-y-20">
        <FeatureRow
          eyebrow="Know who matters"
          title="Ten segments, scored on your own base"
          body="Not industry averages. Recency, frequency and monetary value are quintiled across your customers, so a Champion in your store is defined by your store."
          points={[
            "Predicted lifetime value, discounted by churn risk",
            "Churn judged against each customer's own reorder cadence",
            "Every customer listed, not a capped slice",
          ]}
        >
          <SegmentMock />
        </FeatureRow>

        <FeatureRow
          flip
          eyebrow="Reach them"
          title="The message names the product they actually buy"
          body="Personalised from each customer's own history — the item they spend most on, its photograph, and a link straight to it. Write once; everyone gets their own."
          points={[
            "Ten templates for reorder, win-back, restock and review",
            "Coupons created in WooCommerce, restricted to the product",
            "A dry run that resolves the real list and sends nothing",
          ]}
        >
          <MessageMock />
        </FeatureRow>

        <FeatureRow
          eyebrow="Ask anything"
          title="An assistant that proposes, never performs"
          body="Ask about the business in plain English. It reads your figures, drafts the message, and then stops — nothing is sent until you approve the card in front of you."
          points={[
            "Reads revenue, segments, stock, flows and the gateway",
            "No tool for messaging your whole customer base",
            "Phone numbers are absent from everything it can read",
          ]}
        >
          <AssistantMock />
        </FeatureRow>
      </Section>

      {/* ---- Every screen -------------------------------------------------------- */}
      <Section className="bg-muted/30">
        <SectionHeading
          title="Every screen, working on your own data"
          body="Thirteen modules, each computed from the orders you already have."
        />

        <div className="mt-10 space-y-14 sm:space-y-16">
          <FeatureRow
            eyebrow="Campaigns"
            title="Build the audience, then see who it resolves to"
            body="Stack segment, value tier, product and recency filters. The reachable count updates as you go, opt-outs drop out on their own, and a dry run proves the list before anything sends."
          >
            <CampaignMock />
          </FeatureRow>

          <FeatureRow
            flip
            eyebrow="Cohorts"
            title="Whether last month's customers are still here"
            body="Every month of acquisition is followed forward, so you can see the month where people stop coming back — and whether a change you made moved it."
          >
            <CohortMock />
          </FeatureRow>

          <FeatureRow
            eyebrow="Inventory"
            title="What to reorder, ranked by the revenue behind it"
            body="Days of cover computed from real velocity rather than a flat threshold, so the item that matters surfaces before the item that is merely low."
          >
            <StockMock />
          </FeatureRow>

          <FeatureRow
            flip
            eyebrow="Flows"
            title="Sequences that stop the moment they buy"
            body="Steps land days apart rather than all at once. Customers join as they qualify, nobody enters twice, and the remaining steps are dropped as soon as an order arrives."
          >
            <FlowMock />
          </FeatureRow>
        </div>
      </Section>

      {/* ---- Campaigns --------------------------------------------------------------
          The audience and the assistant each get a band of their own rather
          than a card in the module grid: they are the two things a visitor is
          actually deciding between doing by hand and having done for them. */}
      <Section id="campaigns">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-14">
          <div>
            <Badge variant="secondary" className="gap-1.5">
              <Megaphone className="size-3" />
              Campaigns
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              An audience is a filter, not a list you maintain
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              Stack segment, value tier, product and recency filters over your live analytics. The
              count updates as you go, opt-outs drop out on their own, and the list resolves at send
              time — so it can never go stale.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Ten templates, filled from each customer's own history",
                "Coupons created in WooCommerce, restricted to the product",
                "A dry run that resolves the real list and sends nothing",
                "Flows that drop the rest of the sequence once they order",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" asChild className="mt-7 h-10 px-5 text-sm">
              <Link href="/features/campaigns">
                How campaigns work
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="w-full lg:w-80">
            <CampaignBuilderMock />
          </div>
        </div>
      </Section>

      {/* ---- AI ----------------------------------------------------------------------- */}
      <Section id="ai" className="bg-muted/30">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
          <div className="w-full lg:w-96">
            <AssistantThreadMock />
          </div>

          <div>
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="size-3" />
              AI assistant
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Ask in plain English. Approve before anything sends.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              The assistant reads your real figures, works out who is slipping away, and drafts the
              message. Then it stops. Sending arrives as a card you approve, and approving runs the
              same guarded route a person would have used.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Grounded in your own orders — no industry averages",
                "No tool exists for messaging your whole customer base",
                "Phone numbers and emails are absent from everything it reads",
                "Rejecting leaves no trace on your store",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" asChild className="mt-7 h-10 px-5 text-sm">
              <Link href="/features/ai">
                What the assistant can and cannot do
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* ---- WhatsApp -------------------------------------------------------------- */}
      <Section id="whatsapp">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-14">
          <div>
            <Badge variant="secondary">WhatsApp, both directions</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              It answers at 3am, and knows when to stop
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              A customer who messages out of hours gets a numbered menu straight away. Only the
              trigger word starts it, so a question the menu cannot answer still reaches a person
              instead of looping.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Numbered menu, answered instantly",
                "Order tracking and reorder without a human",
                "Anything off-menu is handed straight to your team",
                "Every thread lands in one shared inbox",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" asChild className="mt-7 h-10 px-5 text-sm">
              <Link href="/whatsapp">
                Everything WhatsApp does
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <AutoReplyMock />
        </div>
      </Section>

      {/* ---- How it works ------------------------------------------------------------ */}
      <Section id="how" className="bg-muted/30">
        <SectionHeading title="Running in an afternoon" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["1", "Connect", "Enter your store address and approve read-only access in your own admin."],
            ["2", "Pull once", "The order history is fetched and cached. Every figure comes from that snapshot."],
            ["3", "Find who matters", "Filter to the customers slipping away, or the ones worth thanking."],
            ["4", "Message them", "Write once, personalised per customer, and send from the same screen."],
          ].map(([step, title, body]) => (
            <Card key={step} className="h-full">
              <CardHeader>
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {step}
                </span>
                <CardTitle className="mt-3 text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---- Architecture --------------------------------------------------------------- */}
      <Section>
        <SectionHeading
          title="Four parts, one product"
          body="Three of them run on infrastructure you control. The fourth never sees a customer."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {STACK.map(([n, title, body]) => (
            <Card key={n}>
              <CardContent className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-xs font-semibold tabular-nums">
                  {n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---- Safety ----------------------------------------------------------------------- */}
      <Section className="bg-muted/30">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardHeader>
              <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                <ShieldCheck className="size-4.5 text-primary" />
              </span>
              <CardTitle className="mt-3 text-xl">The assistant proposes. You approve.</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                It reads anything and changes nothing. Sending a message, starting a flow or switching
                on the auto-reply all arrive as a card you approve — and approving runs the same
                guarded route a person would have used.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "No tool for messaging your whole customer base",
                  "Phone numbers and emails are absent from everything it reads",
                  "A product link it did not find in your catalogue is stripped",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your own WhatsApp API</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A messaging server on your infrastructure. Nobody sits between you and your
                  customers, there is no per-message fee, and no subscription to renew.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Answers at 3am</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A customer who messages out of hours gets a numbered menu straight away. Only the
                  trigger word starts it, so a real question still reaches a person.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>

      {/* ---- Close -------------------------------------------------------------------------- */}
      <Section>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl">
              Connect a store. See it in minutes.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
              You approve read-only access inside your own WordPress admin. No password is shared, no
              key is emailed, and disconnecting wipes every cached order.
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
