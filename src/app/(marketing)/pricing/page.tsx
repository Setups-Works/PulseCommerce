import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { AuroraText } from "@/components/ui/aurora-text";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Separator } from "@/components/ui/separator";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { Cta } from "@/components/marketing/landing/cta";
import { Pricing as LandingPricing } from "@/components/marketing/landing/pricing";
import { FAQ } from "@/lib/marketing/faq";
import { INCLUDED } from "@/lib/marketing/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "One price for all thirteen modules. Choose how messages are carried: your own WhatsApp host with no per-message fee, or the official Cloud API with delivery backed by Meta.",
  alternates: { canonical: "/pricing" },
};

/**
 * The pricing page.
 *
 * The tiers, the included list and the questions all come from
 * lib/marketing/, shared with the landing page and with the FAQPage
 * structured data. A price that is right here and stale on the home page is
 * the fastest way to lose a reader's trust in every other number on the site.
 */

/**
 * The two delivery routes.
 *
 * Presented as a genuine trade-off with both columns the same weight: each
 * carries its own drawbacks in the same list as its advantages. A comparison
 * where one side has no `cons` is not a comparison, it is an upsell, and this
 * choice really does go either way depending on volume.
 */
const DELIVERY = [
  {
    brand: BRANDS.meta,
    badge: "Guaranteed delivery",
    title: "Official WhatsApp Cloud API",
    body: "Meta's own API. Messages are delivered under their terms, tappable buttons and product cards work, and your number cannot be restricted for using it as intended.",
    pros: ["Delivery backed by Meta", "Buttons and product cards available"],
    cons: [
      "Template approval required before sending",
      "Meta charges per conversation, ongoing",
    ],
    verdict:
      "Best when delivery matters more than cost, or you send to people who have not bought from you before.",
  },
  {
    brand: BRANDS.whatsapp,
    badge: "No per-message fee",
    title: "Your own WhatsApp host",
    body: "A messaging server on infrastructure you control. Your number, your message history, nobody in the middle, and no charge per message however many you send.",
    pros: [
      "No per-message cost, ever",
      "Your number and your history stay yours",
      "No template approval, no waiting",
    ],
    cons: ["Delivery is not guaranteed; use a dedicated number"],
    verdict:
      "Best for messaging your own past customers at volume, where a per-message fee would dominate the cost.",
  },
];

export default function PricingPage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden">
        <AnimatedGridPattern
          id="pricing-hero-grid"
          numSquares={26}
          maxOpacity={0.05}
          duration={4.5}
          className={cn(
            "inset-x-0 inset-y-[-35%] h-[170%] skew-y-12",
            "[mask-image:radial-gradient(520px_circle_at_center,white,transparent)]",
          )}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-36 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/14" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-14 pb-12 text-center sm:px-6 md:pt-20">
          <BlurFade inView>
            <Badge variant="outline" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              Every module, every tier
            </Badge>
          </BlurFade>
          <BlurFade delay={0.08} inView>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              One price.{" "}
              <AuroraText
                colors={["var(--chart-7)", "var(--primary)", "var(--chart-3)", "var(--primary)"]}
                speed={0.6}
              >
                No feature gates.
              </AuroraText>
            </h1>
          </BlurFade>
          <BlurFade delay={0.16} inView>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              Tiers are sized by how many WhatsApp messages you send a month, not by what the
              product will tell you about your store. Go and Plus get the same thirteen modules.
            </p>
          </BlurFade>
        </div>
      </section>

      {/*
       * The tier cards.
       *
       * Shared with the landing page through components/marketing/landing/
       * pricing.tsx, so the two cannot show different prices — see the note in
       * lib/marketing/plans.ts.
       */}
      <LandingPricing heading={false} />

      <Section className="bg-muted/20">
        <SectionHeading
          eyebrow="Included"
          title="What every tier includes"
          body="All of it. The list is here so nobody has to go looking for the asterisk."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED.map((item, i) => (
            <BlurFade key={item} delay={Math.min(i * 0.03, 0.3)} inView>
              <div className="flex items-start gap-2.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm">{item}</span>
              </div>
            </BlurFade>
          ))}
        </div>
      </Section>

      <Section id="delivery">
        <SectionHeading
          eyebrow="Delivery"
          title="Two ways to send. Same platform."
          body="The analytics, the flows, the assistant and the inbox are identical either way. The only difference is what carries the messages — and that choice is a genuine trade-off, not an upsell."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {DELIVERY.map(({ brand, badge, title, body, pros, cons, verdict }, i) => (
            <BlurFade key={title} delay={i * 0.08} inView className="h-full">
              <div className="flex h-full flex-col rounded-xl bg-card p-6 ring-1 ring-foreground/10">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-lg border bg-muted/50">
                    <BrandMark icon={brand} className="size-6" brandColor />
                  </span>
                  <Badge variant="secondary">{badge}</Badge>
                </div>
                <h3 className="mt-3.5 font-heading text-lg font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>

                <ul className="mt-5 space-y-2.5">
                  {pros.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                  {cons.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                      <Minus className="mt-0.5 size-4 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Separator className="my-5 mt-auto" />
                <p className="text-sm font-medium">{verdict}</p>
              </div>
            </BlurFade>
          ))}
        </div>
      </Section>

      <Section id="faq" className="bg-muted/20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <BlurFade inView>
            <SectionHeading title="Everything you need to know" />
          </BlurFade>
          <BlurFade delay={0.1} inView>
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map(({ question, answer }) => (
                <AccordionItem key={question} value={question}>
                  <AccordionTrigger className="text-left text-base font-medium">
                    {question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </BlurFade>
        </div>
      </Section>

      <Cta
        id="pricing-cta"
        title="Connect a store. See your own data first."
        body="Sign up and connect WooCommerce before choosing a plan — subscribing is a switch in Settings once you've seen what it says about your customers."
      />
    </main>
  );
}
