import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Eye, Lock, MessageSquare, ShieldCheck, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AssistantThreadMock,
  CampaignBuilderMock,
  FeatureRow,
  Section,
  SectionHeading,
  SegmentMock,
} from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "AI assistant",
  description:
    "Ask about your store in plain English. The assistant reads your real figures, drafts the message, and stops — nothing sends until you approve it. Phone numbers are never in its scope.",
};

/**
 * The AI page.
 *
 * The selling point is the boundary, not the intelligence: an assistant that
 * can message your customers unsupervised is a liability, so most of this page
 * is about what it deliberately cannot do. Anything claimed here maps to a real
 * guard in `lib/ai/tools.ts` and the approval route.
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

export default function AiPage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 md:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-14">
          <div>
            <Badge variant="outline" className="gap-1.5">
              <Sparkles className="size-3" />
              The assistant
            </Badge>
            <h1 className="mt-6 max-w-2xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              It proposes. You approve.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Ask about the business in plain English. The assistant reads your real figures, drafts
              the message, and then stops — nothing leaves until you approve the card in front of
              you.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <Button size="lg" asChild className="h-10 px-5 text-sm">
                <Link href="/connect">
                  Get started free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-10 px-5 text-sm">
                <Link href="/features/campaigns">See campaigns</Link>
              </Button>
            </div>
          </div>

          <div className="w-full lg:w-96">
            <AssistantThreadMock />
          </div>
        </div>
      </section>

      {/* ---- The boundary ---------------------------------------------------- */}
      <Section className="bg-muted/30">
        <SectionHeading
          eyebrow="Scope"
          title="What it can read, and what it cannot do"
          body="The interesting part of an assistant that touches real customers is the second list. It is enforced by which tools exist, not by asking the model nicely."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                <Eye className="size-4.5 text-primary" />
              </span>
              <CardTitle className="mt-3 text-base">It can read</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {CAN_READ.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                <Lock className="size-4.5 text-muted-foreground" />
              </span>
              <CardTitle className="mt-3 text-base">It cannot</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {CANNOT.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                    <X className="mt-0.5 size-4 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
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
          <SegmentMock />
        </FeatureRow>
      </Section>

      {/* ---- Things to ask ------------------------------------------------------- */}
      <Section className="bg-muted/30">
        <SectionHeading
          title="Things worth asking it"
          body="Plain English, no query language, no saved-report builder to learn first."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ASKS.map((ask) => (
            <Card key={ask}>
              <CardContent className="flex items-start gap-2.5">
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">{ask}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---- Privacy -------------------------------------------------------------- */}
      <Section>
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                <ShieldCheck className="size-5 text-primary" />
              </span>
              <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                The model never sees a customer
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                Counts, names of segments and product titles go to the model. Phone numbers and email
                addresses are absent from every tool it can call, so there is no path by which a
                customer&rsquo;s contact details reach a third party.
              </p>
            </div>

            <Separator className="my-8" />

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Phone numbers are resolved server-side at send time",
                "Emails are never included in a tool result",
                "Personalisation happens after approval, outside the model",
                "Disconnecting the store deletes every cached order",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ---- Close ------------------------------------------------------------------ */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-14">
          <div>
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
          </div>
          <div className="w-full lg:w-80">
            <CampaignBuilderMock />
          </div>
        </div>
      </Section>
    </main>
  );
}
