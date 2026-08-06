"use client";

import * as React from "react";
import { Bot, Database, ShoppingCart, Users } from "lucide-react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { BlurFade } from "@/components/ui/blur-fade";
import { Badge } from "@/components/ui/badge";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { cn } from "@/lib/utils";

/**
 * The automation pipeline: store → platform → agent → WhatsApp → customer.
 *
 * Laid out as a row on desktop and a column on mobile, and the beams are
 * measured from the nodes rather than positioned, so the same markup produces
 * a correct diagram in both — see the note in ui/animated-beam.tsx. A diagram
 * with hard-coded coordinates is a diagram that is right at one viewport width
 * and wrong at every other.
 *
 * The captions under each node say which side of the boundary it runs on.
 * That is the actual claim of the section: three of the five are infrastructure
 * the merchant controls, and the model in the middle never sees a phone number.
 */

const STAGES = [
  {
    key: "store",
    label: "Your store",
    note: "Read-only over the REST API",
    owner: "Yours",
    render: () => <BrandMark icon={BRANDS.woocommerce} className="size-6" />,
  },
  {
    key: "platform",
    label: "PulseCommerce",
    note: "One cached snapshot",
    owner: "Yours",
    render: () => <Database className="size-6 text-primary" strokeWidth={1.75} />,
  },
  {
    key: "agent",
    label: "The agent",
    note: "Counts and names only",
    owner: "Model",
    render: () => <Bot className="size-6 text-primary" strokeWidth={1.75} />,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    note: "Your host, or Meta's",
    owner: "Yours",
    render: () => <BrandMark icon={BRANDS.whatsapp} className="size-6" />,
  },
  {
    key: "customer",
    label: "Your customer",
    note: "Replies land in the inbox",
    owner: "—",
    render: () => <Users className="size-6 text-muted-foreground" strokeWidth={1.75} />,
  },
] as const;

export function Automation() {
  /*
   * One named ref per stage. An array of refs assembled during render is a
   * fresh array on every render and is what `react-hooks/refs` rejects; the
   * pipeline has a fixed five stages, so naming them is both allowed and
   * clearer at the call sites below.
   */
  const container = React.useRef<HTMLDivElement>(null);
  const storeRef = React.useRef<HTMLDivElement>(null);
  const platformRef = React.useRef<HTMLDivElement>(null);
  const agentRef = React.useRef<HTMLDivElement>(null);
  const whatsappRef = React.useRef<HTMLDivElement>(null);
  const customerRef = React.useRef<HTMLDivElement>(null);

  const stageRefs: Record<(typeof STAGES)[number]["key"], React.RefObject<HTMLDivElement | null>> = {
    store: storeRef,
    platform: platformRef,
    agent: agentRef,
    whatsapp: whatsappRef,
    customer: customerRef,
  };

  /** Consecutive pairs, so a stage added to STAGES is wired up automatically. */
  const hops = STAGES.slice(0, -1).map((stage, i) => ({
    from: stageRefs[stage.key],
    to: stageRefs[STAGES[i + 1].key],
  }));

  return (
    <Section id="automation">
      <SectionHeading
        align="center"
        eyebrow="How it fits together"
        title="Four parts, one product"
        body="Three of them run on infrastructure you control. The fourth never sees a customer."
      />

      <BlurFade delay={0.1} inView>
        <div
          ref={container}
          className="relative mx-auto mt-12 flex max-w-4xl flex-col items-center gap-10 md:flex-row md:justify-between md:gap-4"
        >
          {STAGES.map((stage) => (
            <div key={stage.key} className="flex flex-col items-center gap-2.5 text-center">
              <div
                ref={stageRefs[stage.key]}
                className={cn(
                  "z-10 flex size-14 items-center justify-center rounded-2xl bg-card ring-1 ring-foreground/10",
                  "shadow-[0_2px_14px_-4px_rgb(0_0_0/0.18)]",
                  stage.key === "agent" &&
                    "ring-primary/30 shadow-[0_0_0_5px_color-mix(in_oklch,var(--primary)_8%,transparent)]",
                )}
              >
                {stage.render()}
              </div>
              <div className="w-28">
                <p className="text-sm font-medium">{stage.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{stage.note}</p>
                <Badge
                  variant={stage.owner === "Yours" ? "secondary" : "outline"}
                  className="mt-1.5 text-[9px]"
                >
                  {stage.owner === "Yours" ? "Your infrastructure" : stage.owner}
                </Badge>
              </div>
            </div>
          ))}

          {hops.map(({ from, to }, i) => (
            <AnimatedBeam
              key={i}
              containerRef={container}
              fromRef={from}
              toRef={to}
              duration={3.2}
              delay={i * 0.55}
              pathColor="var(--border)"
              pathOpacity={1}
              pathWidth={1.5}
              gradientStartColor="var(--primary)"
              gradientStopColor="var(--chart-3)"
            />
          ))}
        </div>
      </BlurFade>

      {/* The one arrow that goes the other way. Worth its own row rather than a
          sixth node: a reply is a different kind of event from a send, and
          folding it into the same chain would imply it is another step. */}
      <BlurFade delay={0.2} inView>
        <div className="mx-auto mt-12 flex max-w-2xl items-start gap-3 rounded-xl border border-dashed bg-card/40 p-4">
          <ShoppingCart className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">And back again.</span> When the customer
            replies, the thread lands in a shared inbox with their order history beside it — and if
            they buy, the rest of the sequence is dropped before it sends.
          </p>
        </div>
      </BlurFade>
    </Section>
  );
}
