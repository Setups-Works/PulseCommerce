import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Eye, Lock, MessageSquare, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { Ripple } from "@/components/ui/ripple";
import { Safari } from "@/components/ui/safari";
import { Separator } from "@/components/ui/separator";
import {
  AssistantThreadMock,
  CampaignBuilderMock,
  FeatureRow,
  Section,
  SectionHeading,
} from "@/components/marketing/sections";
import { Cta } from "@/components/marketing/landing/cta";
import { PageHero } from "@/components/marketing/landing/page-hero";
import { ProductScreen } from "@/components/marketing/landing/product-screen";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI assistant",
  description:
    "Ask about your store in plain English. The assistant reads your real figures, drafts the message, and stops — nothing sends until you approve it. Phone numbers are never in its scope.",
  alternates: { canonical: "/features/ai" },
};

/**
 * The AI page.
 *
 * The selling point is the boundary, not the intelligence: an assistant that
 * can message your customers unsupervised is a liability, so most of this page
 * is about what it deliberately cannot do. Anything claimed here maps to a real
 * guard in `lib/ai/tools.ts` and the approval route.
 *
 * The two scope cards are deliberately asymmetric — the "cannot" column gets no
 * pointer glow and no accent colour. Giving both the same treatment would make
 * the restriction look like a feature being sold rather than a limit being
 * stated, which is the opposite of the point.
 */

const CAN_READ = [
  "Revenue, orders and repeat rate over any window",
  "Customer segments, value tiers and churn risk",
  "Product performance, stock cover and affinity",
  "Campaign history and flow membership",
  "Whether the WhatsApp gateway is connected",
];

const CANNOT = [
  "Send a message to anybody, on any channel",
  "Message your whole customer base — there is no such tool",
  "See a phone number or an email address",
  "Start a flow, or switch on the auto-reply",
  "Change a price, a product or a setting in your store",
];

const ASKS = [
  "Which customers are about to churn?",
  "What sells alongside my bestseller?",
  "Did last month beat the month before?",
  "Who bought twice and never came back?",
  "What is about to run out, and what is it worth?",
  "Draft a win-back message for the at-risk segment",
];

const PRIVACY = [
  "Phone numbers are resolved server-side at send time",
  "Emails are never included in a tool result",
  "Personalisation happens after approval, outside the model",
  "Disconnecting the store deletes every cached order",
];

export default function AiPage() {
  return (
    <main>
      <PageHero
        id="ai"
        eyebrow="The assistant"
        title="It proposes."
        accent="You approve."
        body="Ask about the business in plain English. The assistant reads your real figures, drafts the message, and then stops — nothing leaves until you approve the card in front of you."
        secondary={{ label: "See campaigns", href: "/features/campaigns" }}
        aside={
          <div className="relative">
            <AssistantThreadMock />
            <BorderBeam
              size={140}
              duration={10}
              colorFrom="var(--primary)"
              colorTo="color-mix(in oklch, var(--chart-3) 70%, transparent)"
            />
          </div>
        }
      />

      {/* ---- The boundary ---------------------------------------------------- */}
      <Section className="relative overflow-hidden bg-muted/20">
        <Ripple
          className="[mask-image:radial-gradient(circle_at_center,white,transparent_70%)] opacity-30"
          mainCircleSize={240}
          mainCircleOpacity={0.12}
          numCircles={5}
        />

        <div className="relative">
          <SectionHeading
            eyebrow="Scope"
            title="What it can read, and what it cannot do"
            body="The interesting part of an assistant that touches real customers is the second list. It is enforced by which tools exist, not by asking the model nicely."
          />

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <BlurFade inView className="h-full">
              <MagicCard
                className="h-full rounded-xl ring-1 ring-foreground/10"
                gradientFrom="var(--primary)"
                gradientTo="var(--chart-3)"
                gradientColor="color-mix(in oklch, var(--primary) 9%, transparent)"
                gradientOpacity={1}
              >
                <div className="p-6">
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                    <Eye className="size-4.5 text-primary" />
                  </span>
                  <h3 className="mt-3 font-heading text-base font-medium">It can read</h3>
                  <ul className="mt-4 space-y-2.5">
                    {CAN_READ.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </MagicCard>
            </BlurFade>

            {/* No glow, no accent. A limit is stated, not sold. */}
            <BlurFade delay={0.08} inView className="h-full">
              <div className="h-full rounded-xl border border-dashed bg-card/40 p-6">
                <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                  <Lock className="size-4.5 text-muted-foreground" />
                </span>
                <h3 className="mt-3 font-heading text-base font-medium">It cannot</h3>
                <ul className="mt-4 space-y-2.5">
                  {CANNOT.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                      <X className="mt-0.5 size-4 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </BlurFade>
          </div>
        </div>
      </Section>

      {/* ---- How approval works ------------------------------------------------ */}
      <Section className="space-y-16 sm:space-y-20">
        <FeatureRow
          eyebrow="Approval"
          title="A proposal is a card, not a message"
          body="When the assistant decides something should be sent, it does not send it. It renders a card describing exactly who it reaches and what it says, and approving that card runs the same guarded route a person clicking through the interface would have used."
          points={[
            "The audience is resolved and counted before you decide",
            "You can edit the copy before approving",
            "Rejecting leaves no trace on the store",
            "Approving is audited like any other send",
          ]}
        >
          <AssistantThreadMock />
        </FeatureRow>

        <FeatureRow
          flip
          eyebrow="Grounding"
          title="Every answer traces back to your own orders"
          body="The assistant does not guess at benchmarks. It reads the same cached snapshot every screen reads, so a figure it quotes is a figure you can find yourself — and if the snapshot has not been pulled, it says so instead of inventing one."
          points={[
            "No industry averages, no invented comparisons",
            "A product link it did not find in your catalogue is stripped",
            "It reports missing data rather than filling the gap",
          ]}
        >
          {/* The screen it reads from, in the frame it reads it in. */}
          <div
            aria-hidden
            className="overflow-hidden rounded-xl ring-1 ring-foreground/10 shadow-[0_16px_50px_-20px_rgb(0_0_0/0.3)]"
          >
            <Safari url="app.pulsecommerce.io/customers" className="w-full">
              <ProductScreen view="customers" />
            </Safari>
          </div>
        </FeatureRow>
      </Section>

      {/* ---- Things to ask ------------------------------------------------------- */}
      <Section className="bg-muted/20">
        <SectionHeading
          eyebrow="Prompts"
          title="Things worth asking it"
          body="Plain English, no query language, no saved-report builder to learn first."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ASKS.map((ask, i) => (
            <BlurFade key={ask} delay={Math.min(i * 0.05, 0.3)} inView>
              <MagicCard
                className="h-full rounded-xl ring-1 ring-foreground/10"
                gradientFrom="var(--primary)"
                gradientTo="var(--chart-7)"
                gradientColor="color-mix(in oklch, var(--primary) 8%, transparent)"
                gradientOpacity={1}
                gradientSize={200}
              >
                <div className="flex items-start gap-2.5 p-4">
                  <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm">{ask}</span>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </div>
      </Section>

      {/* ---- Privacy -------------------------------------------------------------- */}
      <Section>
        <BlurFade inView>
          <div className={cn("relative overflow-hidden rounded-2xl bg-card p-8 ring-1 ring-foreground/10 md:p-10")}>
            <BorderBeam
              size={180}
              duration={13}
              colorFrom="var(--primary)"
              colorTo="color-mix(in oklch, var(--chart-3) 70%, transparent)"
            />

            <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
              <ShieldCheck className="size-5 text-primary" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              The model never sees a customer
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Counts, names of segments and product titles go to the model. Phone numbers and email
              addresses are absent from every tool it can call, so there is no path by which a
              customer&rsquo;s contact details reach a third party.
            </p>

            <Separator className="my-8" />

            <div className="grid gap-3 sm:grid-cols-2">
              {PRIVACY.map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>
      </Section>

      {/* ---- Next ------------------------------------------------------------------ */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-14">
          <BlurFade inView>
            <Badge variant="secondary">Next</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              What it proposes, the campaign builder sends
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              Approving a proposal drops you into the same audience builder you would have used by
              hand — with the filters already set and the count already resolved.
            </p>
            <Button size="lg" asChild className="mt-7 h-10 px-5 text-sm">
              <Link href="/features/campaigns">
                See how campaigns work
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </BlurFade>

          <BlurFade delay={0.1} inView className="w-full lg:w-80">
            <CampaignBuilderMock />
          </BlurFade>
        </div>
      </Section>

      <Cta
        id="ai-cta"
        title="Ask it something on your own data"
        body="Connect a store and the assistant is reading your real figures within minutes. It still cannot send anything without you."
      />
    </main>
  );
}
