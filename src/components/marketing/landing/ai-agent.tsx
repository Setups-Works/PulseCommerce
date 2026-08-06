"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { BlurFade } from "@/components/ui/blur-fade";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ripple } from "@/components/ui/ripple";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { Section } from "@/components/marketing/sections";
import { cn } from "@/lib/utils";

/**
 * The AI commerce agent.
 *
 * The pipeline diagram is the argument: question in, the agent reads named and
 * bounded tools, a segment comes out, and then it *stops* at a card someone
 * has to approve. The last node is the one that matters — an AI section that
 * showed the message sending itself would be advertising a product this one
 * deliberately is not.
 *
 * A client component because AnimatedBeam measures its endpoints from the DOM.
 * It is the only section on the page that has to be, which is why the diagram
 * lives in its own file rather than inline on the page.
 */

const TOOLS: [typeof Users, string][] = [
  [TrendingUp, "read_revenue"],
  [Users, "read_segments"],
  [Search, "read_products"],
];

const ASKS = [
  "Show me customers likely to churn",
  "Which products are about to run out?",
  "Draft a win-back for lapsed champions",
  "What changed since last month?",
];

export function AiAgent() {
  /*
   * One named ref per endpoint rather than an array of them.
   *
   * An array built during render is a new array every render, and indexing
   * into it to hand a ref to a child is exactly the pattern the compiler's
   * `react-hooks/refs` rule rejects. Three outcomes is a fixed, small number,
   * so naming them costs two lines and keeps the beams below readable.
   */
  const container = React.useRef<HTMLDivElement>(null);
  const prompt = React.useRef<HTMLDivElement>(null);
  const agent = React.useRef<HTMLDivElement>(null);
  const segmentNode = React.useRef<HTMLDivElement>(null);
  const draftNode = React.useRef<HTMLDivElement>(null);
  const approvalNode = React.useRef<HTMLDivElement>(null);

  return (
    <Section id="ai" className="relative overflow-hidden">
      {/* Concentric rings behind the agent node, marking it as the centre of
          the diagram without adding another colour to the page. */}
      <Ripple
        className="[mask-image:radial-gradient(circle_at_center,white,transparent_72%)] opacity-40"
        mainCircleSize={260}
        mainCircleOpacity={0.14}
        numCircles={6}
      />

      <div className="relative">
        <BlurFade inView className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="size-3" />
            AI commerce agent
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            Ask in plain English.
            <br />
            <span className="text-muted-foreground">Approve before anything sends.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            The agent reads your real figures, works out who is slipping away and drafts the message.
            Then it stops.
          </p>
        </BlurFade>

        {/* ---- The pipeline ------------------------------------------------ */}
        <BlurFade delay={0.15} inView>
          <div
            ref={container}
            className="relative mx-auto mt-14 grid max-w-4xl grid-cols-[auto_1fr_auto] items-center gap-x-6 gap-y-8 sm:gap-x-12"
          >
            {/* Column 1 — the question */}
            <div className="col-start-1 row-span-3 row-start-1 flex justify-center">
              <Node ref={prompt} className="size-14 bg-card">
                <MessageCircle className="size-6 text-muted-foreground" strokeWidth={1.75} />
              </Node>
            </div>

            {/* Column 2 — the agent */}
            <div className="col-start-2 row-span-3 row-start-1 flex justify-center">
              <Node
                ref={agent}
                className="size-20 border-primary/30 bg-card shadow-[0_0_0_6px_color-mix(in_oklch,var(--primary)_8%,transparent)]"
              >
                <Bot className="size-9 text-primary" strokeWidth={1.5} />
              </Node>
            </div>

            {/* Column 3 — what comes out */}
            <Outcome
              ref={segmentNode}
              row={1}
              icon={<Users className="size-5 text-primary" strokeWidth={1.75} />}
              title="Segment created"
              note="214 customers, resolved live"
            />
            <Outcome
              ref={draftNode}
              row={2}
              icon={<MessageCircle className="size-5 text-primary" strokeWidth={1.75} />}
              title="Draft written"
              note="Personalised per customer"
            />
            <Outcome
              ref={approvalNode}
              row={3}
              icon={<ShieldCheck className="size-5 text-good" strokeWidth={1.75} />}
              title="Waiting for you"
              note="Nothing has been sent"
            />

            {/* Beams. Drawn after the nodes so the refs are populated on the
                first measuring pass rather than one render late. */}
            <AnimatedBeam
              containerRef={container}
              fromRef={prompt}
              toRef={agent}
              duration={3}
              pathColor="var(--border)"
              pathOpacity={1}
              gradientStartColor="var(--primary)"
              gradientStopColor="var(--chart-7)"
            />
            {/* Curvature fans the three apart: the top beam bows up, the
                middle runs straight, the bottom bows down. Three coincident
                straight lines would read as one thick wire. */}
            {(
              [
                [segmentNode, 38, 0.6],
                [draftNode, 0, 0.95],
                [approvalNode, -38, 1.3],
              ] as const
            ).map(([toRef, curvature, delay], i) => (
              <AnimatedBeam
                key={i}
                containerRef={container}
                fromRef={agent}
                toRef={toRef}
                curvature={curvature}
                duration={3}
                delay={delay}
                pathColor="var(--border)"
                pathOpacity={1}
                gradientStartColor="var(--primary)"
                gradientStopColor="var(--chart-3)"
              />
            ))}
          </div>
        </BlurFade>

        {/* ---- The conversation --------------------------------------------- */}
        <div className="mx-auto mt-16 grid max-w-5xl items-start gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <BlurFade delay={0.1} inView>
            <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Things people actually ask it
            </h3>
            <ul className="mt-5 space-y-2.5">
              {ASKS.map((ask) => (
                <li
                  key={ask}
                  className="flex items-start gap-2.5 rounded-lg border bg-card/50 px-3 py-2.5 text-sm"
                >
                  <Search className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{ask}</span>
                </li>
              ))}
            </ul>

            <ul className="mt-6 space-y-2.5">
              {[
                "Grounded in your own orders — no industry averages",
                "No tool exists for messaging your whole customer base",
                "Phone numbers are absent from everything it can read",
                "Rejecting leaves no trace on your store",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Button size="lg" asChild className="mt-7 h-10 px-5 text-sm">
              <Link href="/features/ai">
                What the assistant can and cannot do
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                <Sparkles className="size-3.5 text-primary" />
                <p className="text-xs font-medium">Assistant</p>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Read-only tools
                </Badge>
              </div>

              <div className="space-y-3 p-4">
                <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">
                  <TypingAnimation
                    duration={38}
                    delay={200}
                    className="text-xs font-normal tracking-normal text-primary-foreground"
                    as="span"
                  >
                    Show me customers likely to churn
                  </TypingAnimation>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {TOOLS.map(([Icon, tool]) => (
                    <Badge key={tool} variant="outline" className="gap-1 font-mono text-[10px]">
                      <Icon className="size-2.5" />
                      {tool}
                    </Badge>
                  ))}
                </div>

                <div className="rounded-lg border p-3 text-xs leading-relaxed">
                  214 customers are past their own usual reorder gap, worth{" "}
                  <span className="font-medium">₹4.2L</span> in predicted value. Most last bought a
                  consumable, so a reorder nudge should outperform a discount.
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
                    <span className="rounded-md border px-2.5 py-1 text-[11px] font-medium">
                      Reject
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Nothing sends until you approve. Phone numbers were never in scope.
                </p>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </Section>
  );
}

/** One of the three things the agent produces, and its caption. */
const Outcome = React.forwardRef<
  HTMLDivElement,
  { row: number; icon: React.ReactNode; title: string; note: string }
>(function Outcome({ row, icon, title, note }, ref) {
  return (
    // `gridRow` is set inline because the row index is data rather than a
    // fixed class — Tailwind cannot generate `row-start-${n}` from a variable.
    <div className="col-start-3 flex items-center gap-3" style={{ gridRow: row }}>
      <Node ref={ref} className="size-11 shrink-0 bg-card">
        {icon}
      </Node>
      <div className="hidden min-w-0 sm:block">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  );
});

/** A pipeline endpoint. Uniform size and shape so beams meet at equal depths. */
const Node = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(function Node(
  { className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex items-center justify-center rounded-2xl border bg-card shadow-[0_2px_14px_-4px_rgb(0_0_0/0.18)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
