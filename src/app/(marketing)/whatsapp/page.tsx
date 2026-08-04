import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clock, Inbox, MessageCircle, ShieldCheck, Ticket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AutoReplyMock,
  CampaignMock,
  FlowMock,
  MessageMock,
  Section,
  SectionHeading,
} from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "WhatsApp",
  description:
    "Campaigns personalised from each customer's own history, automated flows that stop when they buy, an out-of-hours menu that knows when to fetch a person, and one shared inbox — through a gateway you own.",
};

/**
 * The WhatsApp page.
 *
 * WhatsApp is the half of the product a customer actually experiences, so it
 * gets its own screen rather than a section on the landing page. Anything on a
 * phone frame is what the customer sees; anything in a card is what the
 * merchant sees, and keeping those two distinct is the navigational idea of the
 * page.
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

const GUARDS = [
  "Opt-outs are removed from every audience automatically",
  "A dry run resolves the real list and sends nothing",
  "A typed confirmation before any real send",
  "Phone numbers are resolved server-side, never sent to the browser",
  "Nobody enters the same flow twice",
  "Remaining flow steps are dropped the moment they order",
];

export default function WhatsAppPage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 md:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-14">
          <div>
            <Badge variant="outline" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              The half your customer sees
            </Badge>
            <h1 className="mt-6 max-w-2xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              The message names the thing they actually buy.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Personalised from each customer&rsquo;s own order history — the item they spend most
              on, its photograph, and a link straight to it. Write once; everyone gets their own.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <Button size="lg" asChild className="h-10 px-5 text-sm">
                <Link href="/connect">
                  Get started free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-10 px-5 text-sm">
                <Link href="/pricing#delivery">Compare delivery routes</Link>
              </Button>
            </div>
          </div>

          <MessageMock />
        </div>
      </section>

      <Section id="auto-reply" className="bg-muted/30">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
          <AutoReplyMock />
          <div>
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
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading
          title="Who gets it, and when"
          body="The audience is a filter over the analytics you already have, so the list is never exported and never goes stale."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <CampaignMock />
          <FlowMock />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Users, "Segment", "Champions, at risk, hibernating — any of the ten"],
            [Ticket, "Coupon", "Created in WooCommerce, restricted to the product"],
            [Clock, "Schedule", "Send now, or steps days apart"],
            [Inbox, "Replies", "Every thread in one shared inbox"],
          ].map(([Icon, title, body]) => {
            const Ico = Icon as typeof Users;
            return (
              <Card key={title as string} className="h-full">
                <CardHeader>
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50">
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

      <Section id="templates" className="bg-muted/30">
        <SectionHeading
          title="Ten templates, personalised per customer"
          body="Each one fills itself from that customer's own history. You write the shape; the product writes the specifics."
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
      </Section>

      <Section id="inbox">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
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
          </div>

          <Card className="overflow-hidden p-0">
            <div className="border-b bg-muted/40 px-4 py-2.5">
              <p className="text-xs font-medium">Inbox — replies, with context</p>
            </div>
            {[
              ["A", "Yes please — can you send two?", "Champion · 14 orders"],
              ["R", "Where is my order?", "Loyal · 6 orders"],
              ["M", "Is this safe for sensitive skin?", "Handed over by the menu"],
              ["S", "STOP", "Opt-out recorded"],
            ].map(([initial, message, meta], i) => (
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
          </Card>
        </div>
      </Section>

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
        <SectionHeading
          title="Through a gateway you own"
          body="Run your own WhatsApp host and there is no per-message fee at all. Or use Meta's official Cloud API and get delivery backed by them. Everything above works identically either way."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                <MessageCircle className="size-5 text-primary" />
              </span>
              <CardTitle className="mt-3 text-base">Your own host</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your server, your number, your message history. No per-message cost however many you
                send — use a dedicated number, never your main business line.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                <ShieldCheck className="size-5 text-primary" />
              </span>
              <CardTitle className="mt-3 text-base">Official Cloud API</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Delivery backed by Meta, buttons and product cards, and no risk of your number being
                restricted. Meta charges per conversation, directly.
              </p>
            </CardContent>
          </Card>
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
                <Link href="/features">See every module</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}
