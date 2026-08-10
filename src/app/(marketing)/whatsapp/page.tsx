import type { Metadata } from "next";
import { Check, Clock, Inbox, ShieldCheck, Ticket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Iphone } from "@/components/ui/iphone";
import { MagicCard } from "@/components/ui/magic-card";
import { Marquee } from "@/components/ui/marquee";
import { Separator } from "@/components/ui/separator";
import {
  CampaignMock,
  FlowMock,
  Section,
  SectionHeading,
} from "@/components/marketing/sections";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { Cta } from "@/components/marketing/landing/cta";
import { PageHero } from "@/components/marketing/landing/page-hero";
import { PhoneScreen } from "@/components/marketing/landing/phone-screen";

export const metadata: Metadata = {
  title: "WhatsApp",
  description:
    "Campaigns personalised from each customer's own history, automated flows that stop when they buy, an out-of-hours menu that knows when to fetch a person, and one shared inbox — through a gateway you own.",
  alternates: { canonical: "/whatsapp" },
};

/**
 * The WhatsApp page.
 *
 * WhatsApp is the half of the product a customer actually experiences, so it
 * gets its own screen rather than a section on the landing page. Anything on a
 * phone frame is what the customer sees; anything in a card is what the
 * merchant sees, and keeping those two distinct is the navigational idea of the
 * page. Both phones here are real device mocks with live DOM inside them —
 * see the note in landing/phone-screen.tsx.
 *
 * Names and products in every mock are generic placeholders. This page is
 * public, and a real catalogue on it would leak a real store's data.
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

const CONTROLS: [typeof Users, string, string][] = [
  [Users, "Segment", "Champions, at risk, hibernating — any of the ten"],
  [Ticket, "Coupon", "Created in WooCommerce, restricted to the product"],
  [Clock, "Schedule", "Send now, or steps days apart"],
  [Inbox, "Replies", "Every thread in one shared inbox"],
];

const GUARDS = [
  "Opt-outs are removed from every audience automatically",
  "A dry run resolves the real list and sends nothing",
  "A typed confirmation before any real send",
  "Phone numbers are resolved server-side, never sent to the browser",
  "Nobody enters the same flow twice",
  "Remaining flow steps are dropped the moment they order",
];

const INBOX: [string, string, string][] = [
  ["A", "Yes please — can you send two?", "Champion · 14 orders"],
  ["R", "Where is my order?", "Loyal · 6 orders"],
  ["M", "Is this safe for sensitive skin?", "Handed over by the menu"],
  ["S", "STOP", "Opt-out recorded"],
];

/** A phone mock at the size this page uses everywhere. */
function Phone({ conversation }: { conversation: "campaign" | "autoReply" }) {
  return (
    <div aria-hidden className="mx-auto w-full max-w-64">
      <Iphone>
        <PhoneScreen conversation={conversation} />
      </Iphone>
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <main>
      <PageHero
        id="whatsapp"
        eyebrow="The half your customer sees"
        title="The message names the thing"
        accent="they actually buy."
        body="Personalised from each customer's own order history — the item they spend most on, its photograph, and a link straight to it. Write once; everyone gets their own."
        secondary={{ label: "Compare delivery routes", href: "/pricing#delivery" }}
        aside={<Phone conversation="campaign" />}
      />

      {/* ---- Out of hours ---------------------------------------------------- */}
      <Section id="auto-reply" className="bg-muted/20">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
          <BlurFade inView>
            <Phone conversation="autoReply" />
          </BlurFade>

          <BlurFade delay={0.1} inView>
            <Badge variant="secondary" className="gap-1.5">
              <Clock className="size-3" />
              Out of hours
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              It answers at 3am, and knows when to stop
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              A customer who messages out of hours gets a numbered menu straight away. Only the
              trigger word starts it, so a question the menu cannot answer reaches a person instead
              of looping in a robot.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Order tracking, answered without a human",
                "Reorder their last purchase in two replies",
                "Anything off-menu is handed to your team",
                "The menu never starts itself mid-conversation",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </BlurFade>
        </div>
      </Section>

      {/* ---- Who gets it ------------------------------------------------------- */}
      <Section>
        <SectionHeading
          eyebrow="Targeting"
          title="Who gets it, and when"
          body="The audience is a filter over the analytics you already have, so the list is never exported and never goes stale."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <BlurFade inView>
            <CampaignMock />
          </BlurFade>
          <BlurFade delay={0.08} inView>
            <FlowMock />
          </BlurFade>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CONTROLS.map(([Icon, title, body], i) => (
            <BlurFade key={title} delay={Math.min(i * 0.06, 0.3)} inView className="h-full">
              <MagicCard
                className="h-full rounded-xl ring-1 ring-foreground/10"
                gradientFrom="var(--primary)"
                gradientTo="var(--chart-3)"
                gradientColor="color-mix(in oklch, var(--primary) 8%, transparent)"
                gradientOpacity={1}
              >
                <div className="p-5">
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50">
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

      {/* ---- Templates ---------------------------------------------------------- */}
      <Section id="templates" className="overflow-hidden bg-muted/20">
        <SectionHeading
          eyebrow="Templates"
          title="Ten templates, personalised per customer"
          body="Each one fills itself from that customer's own history. You write the shape; the product writes the specifics."
        />

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
      </Section>

      {/* ---- Inbox ---------------------------------------------------------------- */}
      <Section id="inbox">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <BlurFade inView>
            <Badge variant="secondary" className="gap-1.5">
              <Inbox className="size-3" />
              Shared inbox
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Every reply in one place
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              A campaign that nobody answers is a broadcast. Replies land in a shared inbox next to
              the customer&rsquo;s own order history, so whoever picks it up already knows what they
              bought.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Their orders and segment beside the thread",
                "Threads the bot handed over are marked",
                "Opt-outs recorded the moment they ask",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </BlurFade>

          <BlurFade delay={0.1} inView>
            <div className="relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                <BrandMark icon={BRANDS.whatsapp} className="size-3.5 text-muted-foreground" />
                <p className="text-xs font-medium">Inbox — replies, with context</p>
              </div>
              {INBOX.map(([initial, message, meta], i) => (
                <div key={message}>
                  {i > 0 ? <Separator /> : null}
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {initial}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{message}</span>
                      <span className="block truncate text-xs text-muted-foreground">{meta}</span>
                    </span>
                  </div>
                </div>
              ))}
              <BorderBeam
                size={130}
                duration={11}
                colorFrom="var(--primary)"
                colorTo="color-mix(in oklch, var(--chart-3) 70%, transparent)"
              />
            </div>
          </BlurFade>
        </div>
      </Section>

      {/* ---- Guards ---------------------------------------------------------------- */}
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

      {/* ---- Delivery routes --------------------------------------------------------- */}
      <Section>
        <SectionHeading
          eyebrow="Delivery"
          title="Through a gateway you own"
          body="Run your own WhatsApp host and there is no per-message fee at all. Or use Meta's official Cloud API and get delivery backed by them. Everything above works identically either way."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <BlurFade inView className="h-full">
            <div className="h-full rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                <BrandMark icon={BRANDS.whatsapp} className="size-5" />
              </span>
              <h3 className="mt-3 font-heading text-base font-medium">Your own host</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Your server, your number, your message history. No per-message cost however many you
                send — use a dedicated number, never your main business line.
              </p>
            </div>
          </BlurFade>

          <BlurFade delay={0.08} inView className="h-full">
            <div className="h-full rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                <BrandMark icon={BRANDS.meta} className="size-5" />
              </span>
              <h3 className="mt-3 font-heading text-base font-medium">Official Cloud API</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Delivery backed by Meta, buttons and product cards, and no risk of your number being
                restricted. Meta charges per conversation, directly.
              </p>
            </div>
          </BlurFade>
        </div>
      </Section>

      <Cta
        id="whatsapp-cta"
        title="Send your first campaign today"
        body="Connect a store, build an audience from your real customers, and dry-run it before a single message leaves."
      />
    </main>
  );
}
