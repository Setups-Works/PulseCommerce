import { Bot, Lock, MessageCircle, Users, Zap } from "lucide-react";
import { AnimatedList } from "@/components/ui/animated-list";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { Marquee } from "@/components/ui/marquee";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { cn } from "@/lib/utils";

/**
 * Why PulseCommerce, as a bento grid.
 *
 * Each card carries an illustration built from the thing it describes rather
 * than a stock graphic: the segmentation card shows segments, the WhatsApp
 * card shows messages, the privacy card shows the scopes actually requested.
 * The picture is the argument.
 *
 * Every illustration is `aria-hidden` and positioned so the copy sits over a
 * gradient floor — see the note in ui/bento-grid.tsx. The point of a bento
 * card is still the sentence on it.
 */

/* ---------------------------------------------------------------------------
   Illustrations
   ------------------------------------------------------------------------ */

const SEGMENTS: [string, number][] = [
  ["Champions", 95],
  ["Loyal", 74],
  ["Promising", 61],
  ["At risk", 52],
  ["Hibernating", 31],
  ["Lost", 18],
];

function SegmentsArt() {
  return (
    <div aria-hidden className="absolute inset-x-4 top-4 space-y-2">
      {SEGMENTS.map(([label, width]) => (
        <div key={label} className="flex items-center gap-2.5">
          <span className="w-20 shrink-0 text-[10px] text-muted-foreground">{label}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary/70" style={{ width: `${width}%` }} />
          </span>
          <span className="w-6 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
            {width}
          </span>
        </div>
      ))}
    </div>
  );
}

const MESSAGES = [
  "Your usual refill is running low — reorder here",
  "REFILL10 takes 10% off, valid a fortnight",
  "Back in stock: the one you asked about",
  "Thanks for four orders this year — here is 15%",
];

function MessagesArt() {
  return (
    <div aria-hidden className="absolute inset-0 top-4">
      <Marquee vertical pauseOnHover className="h-44 [--duration:22s] [--gap:0.5rem]">
        {MESSAGES.map((text) => (
          <div
            key={text}
            className="mx-4 max-w-[15rem] rounded-lg rounded-bl-sm bg-muted px-2.5 py-1.5 text-[11px] leading-snug"
          >
            {text}
          </div>
        ))}
      </Marquee>
    </div>
  );
}

const SCOPES: [string, string, boolean][] = [
  ["Orders", "read", true],
  ["Customers", "read", true],
  ["Products", "read", true],
  ["Coupons", "write, on request", true],
  ["Settings", "never touched", false],
  ["Themes and plugins", "never touched", false],
];

function ScopesArt() {
  return (
    <div aria-hidden className="absolute inset-x-4 top-4 space-y-1">
      {SCOPES.map(([name, scope, granted]) => (
        <div
          key={name}
          className={cn(
            "flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-[10px]",
            granted ? "bg-card" : "border-dashed text-muted-foreground",
          )}
        >
          <span className="font-medium">{name}</span>
          <span className="font-mono text-[9px] text-muted-foreground">{scope}</span>
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  { day: "Day 0", text: "Reminder naming their product", tone: "sent" },
  { day: "Day 3", text: "A code, expiring in a fortnight", tone: "sent" },
  { day: "Day 4", text: "They ordered — sequence stopped", tone: "stop" },
];

function FlowArt() {
  return (
    <div aria-hidden className="absolute inset-x-4 top-4">
      <AnimatedList delay={1400} className="gap-2">
        {STEPS.map((step) => (
          <div
            key={step.day}
            className={cn(
              "w-full rounded-lg border bg-card px-2.5 py-1.5",
              step.tone === "stop" && "border-good/40",
            )}
          >
            <p className="text-[10px] font-medium">{step.day}</p>
            <p
              className={cn(
                "text-[10px] leading-snug",
                step.tone === "stop"
                  ? "font-medium text-good"
                  : "text-muted-foreground",
              )}
            >
              {step.text}
            </p>
          </div>
        ))}
      </AnimatedList>
    </div>
  );
}

function AssistantArt() {
  return (
    <div aria-hidden className="absolute inset-x-4 top-4 space-y-2">
      <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-2.5 py-1.5 text-[10px] text-primary-foreground">
        Who is about to churn?
      </div>
      <div className="flex flex-wrap gap-1">
        {["read_segments", "read_revenue", "read_products"].map((tool) => (
          <span
            key={tool}
            className="rounded-full border px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground"
          >
            {tool}
          </span>
        ))}
      </div>
      <div className="rounded-lg border bg-card px-2.5 py-1.5 text-[10px] leading-snug">
        214 customers, worth <span className="font-medium">₹4.2L</span> in predicted value.
      </div>
      <div className="flex gap-1.5">
        <span className="rounded-md bg-primary px-2 py-0.5 text-[9px] font-medium text-primary-foreground">
          Approve
        </span>
        <span className="rounded-md border px-2 py-0.5 text-[9px] font-medium">Reject</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Section
   ------------------------------------------------------------------------ */

const CARDS = [
  {
    Icon: Users,
    name: "Segments scored on your own base",
    description:
      "Recency, frequency and monetary value quintiled across your customers — so a Champion in your store is defined by your store, not an industry average.",
    href: "/features#customers",
    cta: "How segmentation works",
    className: "md:col-span-2",
    background: <SegmentsArt />,
  },
  {
    Icon: MessageCircle,
    name: "Messages that name the product",
    description:
      "Personalised from each customer's own history. Write once; everyone gets their own.",
    href: "/whatsapp",
    cta: "See WhatsApp",
    className: "md:col-span-1",
    background: <MessagesArt />,
  },
  {
    Icon: Lock,
    name: "Read-only, and provably so",
    description: "You approve the scopes in your own admin. Coupons are the one thing written back.",
    href: "/integrations",
    cta: "What it can touch",
    className: "md:col-span-1",
    background: <ScopesArt />,
  },
  {
    Icon: Zap,
    name: "Sequences that stop when they buy",
    description:
      "Steps land days apart. Customers join as they qualify, nobody enters twice, and the remaining steps are dropped the moment an order arrives.",
    href: "/features#flows",
    cta: "How flows work",
    className: "md:col-span-1",
    background: <FlowArt />,
  },
  {
    Icon: Bot,
    name: "An assistant that proposes, never performs",
    description:
      "It reads your figures and drafts the message, then stops. Nothing sends until you approve the card in front of you.",
    href: "/features/ai",
    cta: "What it can and cannot do",
    className: "md:col-span-1",
    background: <AssistantArt />,
  },
];

export function WhyBento() {
  return (
    <Section id="why">
      <SectionHeading
        eyebrow="Why PulseCommerce"
        title="Not another dashboard"
        body="A dashboard tells you revenue is down. This tells you which customers stopped buying, what they used to buy, and sends them a message about it."
      />

      <BentoGrid className="mt-10 auto-rows-72 md:auto-rows-80">
        {CARDS.map((card) => (
          <BentoCard key={card.name} {...card} />
        ))}
      </BentoGrid>
    </Section>
  );
}
