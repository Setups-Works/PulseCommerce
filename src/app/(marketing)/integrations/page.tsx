import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Code2, Lock, ShieldCheck, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { Separator } from "@/components/ui/separator";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { Automation } from "@/components/marketing/landing/automation";
import { Cta } from "@/components/marketing/landing/cta";
import { PageHero } from "@/components/marketing/landing/page-hero";
import { PlatformList, PlatformOrbit } from "@/components/marketing/landing/platform-orbit";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "WooCommerce over its own app-authorization flow, read-only. WhatsApp through your own host or the official Cloud API. Shopify next, as an adapter rather than a rewrite.",
  alternates: { canonical: "/integrations" },
};

/**
 * The integrations page.
 *
 * Says plainly what exists and what does not. A roadmap item dressed as a
 * feature costs more trust than the feature would have won, so Shopify is
 * marked as absent in the same weight as WooCommerce is marked as present.
 *
 * Every platform on this page is drawn with its real brand mark from
 * simple-icons rather than a generic glyph. Someone scanning this page is
 * looking for the specific logo of the thing they already run, and a shopping
 * bag icon does not answer that question.
 */

const SCOPES: [string, string, boolean][] = [
  ["Orders", "Read — every line item, total and date", true],
  ["Customers", "Read — names, emails, billing phone", true],
  ["Products", "Read — price, stock, categories, images", true],
  ["Coupons", "Write — only when you create a campaign code", false],
  ["Settings", "Never touched", false],
  ["Themes and plugins", "Never touched", false],
];

export default function IntegrationsPage() {
  return (
    <main>
      <PageHero
        id="integrations"
        eyebrow="Connects to what you already run"
        title="One store to connect."
        accent="Nothing to migrate."
        body="You approve read-only access inside your own WordPress admin. No password is shared, no key is emailed, and disconnecting wipes every cached order."
        secondary={{ label: "Read the API docs", href: "/api-docs" }}
        aside={<PlatformOrbit className="max-w-sm" />}
      >
        {/* The accessible, indexable copy of the orbit above. */}
        <PlatformList className="mt-8" />
      </PageHero>

      {/* ---- Platforms ------------------------------------------------------- */}
      <Section>
        <SectionHeading
          eyebrow="Platforms"
          title="One available today, one being built"
          body="Both stated at the same weight, because a roadmap item dressed as a feature costs more trust than the feature would have won."
        />

        <div className="mt-10 grid items-stretch gap-6 md:grid-cols-2">
          <BlurFade inView className="h-full">
            <MagicCard
              className="h-full rounded-xl ring-1 ring-foreground/10"
              gradientFrom="var(--primary)"
              gradientTo="var(--chart-3)"
              gradientColor="color-mix(in oklch, var(--primary) 9%, transparent)"
              gradientOpacity={1}
            >
              <div className="flex h-full flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-lg border bg-muted/50">
                    <BrandMark icon={BRANDS.woocommerce} className="size-6" brandColor />
                  </span>
                  <Badge variant="secondary">Available now</Badge>
                </div>
                <h3 className="mt-3.5 font-heading text-lg font-medium">WooCommerce</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Authorised through WooCommerce&rsquo;s own app-authorization screen inside your
                  WordPress admin. You approve <b className="text-foreground">read-only</b> access;
                  coupons are the single thing written back, and only when you create one.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Orders, products, customers, coupons",
                    "One pull, then every metric is instant",
                    "Disconnecting wipes every cached order",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" asChild className="mt-auto h-10 w-full pt-0 text-sm">
                  <Link href="/connect">
                    Connect a store
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </MagicCard>
          </BlurFade>

          {/* Dashed and unglowing: absence stated, not sold. */}
          <BlurFade delay={0.08} inView className="h-full">
            <div
              id="shopify"
              className="h-full scroll-mt-20 rounded-xl border border-dashed bg-card/40 p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg border bg-muted/50">
                  <BrandMark icon={BRANDS.shopify} className="size-6 text-muted-foreground" />
                </span>
                <Badge variant="outline">Not yet built</Badge>
              </div>
              <h3 className="mt-3.5 font-heading text-lg font-medium">Shopify</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The analytics engine reads a normalised snapshot rather than WooCommerce directly, so
                a second platform is an adapter rather than a rewrite. Every module works unchanged
                once orders arrive in the same shape — but it is honest to say that adapter does not
                exist today.
              </p>
              <p className="mt-4 text-sm font-medium">
                Want it sooner? Tell us and we will prioritise it.
              </p>
            </div>
          </BlurFade>
        </div>
      </Section>

      {/* ---- Scope ------------------------------------------------------------ */}
      <Section className="bg-muted/20">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <BlurFade inView>
            <Badge variant="secondary">Scope</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Exactly what the key can reach
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              WooCommerce issues the key and delivers it to this app directly, so you never handle a
              secret. The scope is the whole story — there is no path by which this app could change
              your catalogue, your settings or your theme.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {(
                [
                  [Lock, "The key is held in your own storage, never in a browser bundle."],
                  [
                    ShieldCheck,
                    "Phone numbers are resolved server-side at send time, never sent to the browser.",
                  ],
                ] as const
              ).map(([Icon, text]) => (
                <div key={text} className="flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-sm">{text}</p>
                </div>
              ))}
            </div>
          </BlurFade>

          <BlurFade delay={0.1} inView>
            <div className="relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                <BrandMark icon={BRANDS.woocommerce} className="size-3.5 text-muted-foreground" />
                <p className="text-xs font-medium">Permissions granted to PulseCommerce</p>
              </div>
              {SCOPES.map(([resource, detail, granted], i) => (
                <div key={resource}>
                  {i > 0 ? <Separator /> : null}
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md",
                        granted
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {granted ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : (
                        <Lock className="size-2.5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{resource}</span>
                      <span className="block text-xs text-muted-foreground">{detail}</span>
                    </span>
                  </div>
                </div>
              ))}
              <BorderBeam
                size={140}
                duration={12}
                colorFrom="var(--primary)"
                colorTo="color-mix(in oklch, var(--chart-7) 70%, transparent)"
              />
            </div>
          </BlurFade>
        </div>
      </Section>

      {/* ---- WhatsApp routes ---------------------------------------------------- */}
      <Section id="whatsapp">
        <SectionHeading
          eyebrow="Delivery"
          title="Two ways to carry the messages"
          body="Pick one at setup and change it later. Everything above this line works identically either way."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <BlurFade inView className="h-full">
            <div className="h-full rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <span className="flex size-11 items-center justify-center rounded-lg border bg-muted/50">
                <BrandMark icon={BRANDS.whatsapp} className="size-6" brandColor />
              </span>
              <h3 className="mt-3.5 font-heading text-base font-medium">Your own WhatsApp host</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A messaging server on infrastructure you control. No per-message fee, no template
                approval, and your message history never leaves your deployment. Use a dedicated
                number.
              </p>
            </div>
          </BlurFade>

          <BlurFade delay={0.08} inView className="h-full">
            <div className="h-full rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <span className="flex size-11 items-center justify-center rounded-lg border bg-muted/50">
                <BrandMark icon={BRANDS.meta} className="size-6" brandColor />
              </span>
              <h3 className="mt-3.5 font-heading text-base font-medium">Official Cloud API</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Meta&rsquo;s own API. Delivery is backed by them, buttons and product cards work, and
                your number cannot be restricted for using it as intended. Meta charges per
                conversation.
              </p>
            </div>
          </BlurFade>
        </div>

        <Button variant="outline" size="lg" asChild className="mt-6 h-10 px-5 text-sm">
          <Link href="/pricing#delivery">
            Compare the two in detail
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </Section>

      {/* ---- The pipeline -------------------------------------------------------- */}
      {/* Shared with the landing page: the diagram of how the four parts fit
          together is the same claim on both, and two drawings of one topology
          is one drawing too many. */}
      <div className="bg-muted/20">
        <Automation />
      </div>

      {/* ---- Developer doors ------------------------------------------------------ */}
      <Section>
        <SectionHeading
          eyebrow="For developers"
          title="Two generic doors for everything else"
          body="Anything not named on this page is reachable through one of these."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {(
            [
              [
                Webhook,
                "Webhooks",
                "Push events out as they happen — a send completed, a customer opted out, a flow step fired.",
              ],
              [
                Code2,
                "REST API",
                "Everything the interface reads is available over the same documented API, with a browsable OpenAPI reference.",
                "/api-docs",
              ],
            ] as const
          ).map(([Icon, title, body, href]) => (
            <BlurFade key={title} inView className="h-full">
              <MagicCard
                className="h-full rounded-xl ring-1 ring-foreground/10"
                gradientFrom="var(--primary)"
                gradientTo="var(--chart-7)"
                gradientColor="color-mix(in oklch, var(--primary) 8%, transparent)"
                gradientOpacity={1}
              >
                <div className="p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                    <Icon className="size-5 text-primary" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-3.5 font-heading text-base font-medium">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  {href ? (
                    <Link
                      href={href}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open the reference
                      <ArrowRight className="size-3.5" />
                    </Link>
                  ) : null}
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </div>
      </Section>

      <Cta
        id="integrations-cta"
        title="Connect in a couple of minutes"
        body="Enter your store address, approve read-only access, and the first pull starts on its own."
      />
    </main>
  );
}
