import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  LayoutDashboard,
  Megaphone,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { Separator } from "@/components/ui/separator";
import { FeatureRow, Section, SectionHeading, TerminalMock } from "@/components/marketing/sections";
import { Cta } from "@/components/marketing/landing/cta";
import { PageHero } from "@/components/marketing/landing/page-hero";

export const metadata: Metadata = {
  title: "For developers",
  description:
    "Everything the dashboard does is a REST API call underneath. Script it directly, or use the pulse CLI — same API key, same scopes, same rules about what a customer's number is allowed to reach.",
  alternates: { canonical: "/developers" },
};

/**
 * The developer page.
 *
 * There is no new product here, only a new way in — every claim below maps to
 * something the dashboard already does through `src/lib/openapi.ts` and
 * `src/proxy.ts`. The three "ways in" are deliberately presented as equals
 * rather than the API being pitched as an upgrade from the dashboard: a
 * merchant who never opens a terminal is not the audience for this page, but
 * the copy should not talk down to the dashboard either.
 */

const WAYS_IN = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    body: "Everything below, without writing a line of code. Where a session cookie signs you in.",
  },
  {
    icon: BarChart3,
    title: "REST API",
    body: "The same 29 routes the dashboard calls, documented and browsable. An API key signs you in.",
  },
  {
    icon: Terminal,
    title: "CLI",
    body: "A thin client over the SDK, for a terminal or a cron job. `pulse login` signs it in through your browser.",
  },
];

const API_POINTS = [
  "Analytics, customers and products — the cached snapshot, not a live WooCommerce call",
  "Campaigns: resolve an audience, dry-run it, then send",
  "Flows: multi-step sequences, created as drafts and advanced on a schedule",
  "Reports: the same Excel, PDF and CSV exports the dashboard generates",
  "An official TypeScript SDK (pulsecommerce-sdk) if you'd rather not hand-write requests",
];

const CLI_POINTS = [
  "One command per route, built on the same SDK you can install directly",
  "Every send-adjacent command previews first and asks before it acts",
  "Config lives in one file; a key can also be passed by flag or environment variable",
  "No key management — a key can never create or revoke another key",
];

export default function DevelopersPage() {
  return (
    <main>
      <PageHero
        id="developers"
        eyebrow="For developers"
        title="Run it headlessly."
        accent="Full API, real CLI."
        body="Every screen in the dashboard reads from the same API you can call yourself. Script your own reporting, wire a campaign into your own automation, or reach for the CLI when a curl command would do."
        primary={{ label: "Read the docs", href: "/docs" }}
        secondary={{ label: "API reference", href: "/api-docs" }}
        aside={
          <div className="relative">
            <TerminalMock />
            <BorderBeam
              size={140}
              duration={10}
              colorFrom="var(--primary)"
              colorTo="color-mix(in oklch, var(--chart-3) 70%, transparent)"
            />
          </div>
        }
      />

      {/* ---- Three ways in ---------------------------------------------------- */}
      <Section className="bg-muted/20">
        <SectionHeading
          eyebrow="Three ways in"
          title="Same rules, whichever one you use"
          body="A key or a session authenticates the request either way, and neither can see a phone number the dashboard could not also see."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {WAYS_IN.map((way, i) => (
            <BlurFade key={way.title} delay={Math.min(i * 0.08, 0.24)} inView className="h-full">
              <MagicCard
                className="h-full rounded-xl ring-1 ring-foreground/10"
                gradientFrom="var(--primary)"
                gradientTo="var(--chart-3)"
                gradientColor="color-mix(in oklch, var(--primary) 9%, transparent)"
                gradientOpacity={1}
              >
                <div className="p-6">
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                    <way.icon className="size-4.5 text-primary" />
                  </span>
                  <h3 className="mt-3 font-heading text-base font-medium">{way.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{way.body}</p>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </div>
      </Section>

      {/* ---- The API and the CLI ------------------------------------------------ */}
      <Section className="space-y-16 sm:space-y-20">
        <FeatureRow
          eyebrow="The API"
          title="A REST API for everything the dashboard does"
          body="Documented as OpenAPI 3.1 and rendered at /api-docs — every route, every field, every error code. It is the same document the dashboard's own team reads."
          points={API_POINTS}
        >
          <div
            aria-hidden
            className="overflow-hidden rounded-xl border bg-card p-5 ring-1 ring-foreground/10 shadow-[0_16px_50px_-20px_rgb(0_0_0/0.3)]"
          >
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-primary" />
              <span className="text-sm font-medium">Campaigns</span>
            </div>
            <Separator className="my-3" />
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-md border px-2.5 py-1.5">
                <span className="text-muted-foreground">POST</span>
                <span className="font-mono">/api/whatsapp/preview</span>
              </div>
              <div className="flex items-center justify-between rounded-md border px-2.5 py-1.5">
                <span className="text-muted-foreground">POST</span>
                <span className="font-mono">/api/whatsapp/broadcast</span>
              </div>
              <div className="flex items-center justify-between rounded-md border px-2.5 py-1.5">
                <span className="text-muted-foreground">GET</span>
                <span className="font-mono">/api/whatsapp/broadcast/{"{id}"}</span>
              </div>
            </div>
          </div>
        </FeatureRow>

        <FeatureRow
          flip
          eyebrow="The CLI"
          title="For a terminal, or a cron job"
          body="pulse wraps the same API with commands instead of curl flags. Nothing new is exposed — it is the identical set of routes, with the identical scopes, from a different door."
          points={CLI_POINTS}
        >
          <TerminalMock />
        </FeatureRow>
      </Section>

      {/* ---- Privacy, restated rather than invented --------------------------- */}
      <Section>
        <BlurFade inView>
          <div className="relative overflow-hidden rounded-2xl bg-card p-8 ring-1 ring-foreground/10 md:p-10">
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
              The API keeps the same rule the dashboard does
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Phone numbers are never returned by any endpoint — analytics carries a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">hasPhone</code> boolean,
              and numbers are resolved server-side only at the moment a message sends. Campaign endpoints
              accept a filter and resolve recipients themselves; there is no request shape that accepts a
              list of numbers.
            </p>

            <Separator className="my-8" />

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "A key sees exactly one tenant's data — its own",
                "A key can neither create nor revoke another key",
                "A missing or wrong scope returns 403, naming it",
                "The connect flow is the only place a WooCommerce key is ever entered",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>
      </Section>

      {/* ---- Next --------------------------------------------------------------- */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-14">
          <BlurFade inView>
            <Badge variant="secondary">Next</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Guides for the first API key, the first sync, the first send
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              The docs walk through authentication, the CLI&rsquo;s full command set, and the
              preview-then-broadcast pattern every send goes through.
            </p>
            <Button size="lg" asChild className="mt-7 h-10 px-5 text-sm">
              <Link href="/docs">
                Read the docs
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </BlurFade>

          <BlurFade delay={0.1} inView className="w-full lg:w-80">
            <TerminalMock />
          </BlurFade>
        </div>
      </Section>

      <Cta
        id="developers-cta"
        title="Get an API key in a couple of minutes"
        body="Connect a store, create a key in Settings, and the same figures the dashboard shows are one request away."
      />
    </main>
  );
}
