import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { PLANS } from "@/lib/marketing/plans";
import { cn } from "@/lib/utils";

/**
 * Pricing.
 *
 * The figures come from lib/marketing/plans.ts, shared with /pricing — a price
 * that is right on one page and stale on the other is the fastest way to lose
 * a reader's trust in every other number on the site.
 *
 * Exactly one card carries a beam. The recommended tier is the only thing on
 * this section that should be moving; a beam on both would say nothing.
 */

export interface PricingProps {
  /**
   * Set false on /pricing, where the page's own h1 already says this. The
   * cards are the shared part; the heading above them is not.
   */
  heading?: boolean;
  /** Set false on /pricing, where the "compare tiers" link would point at itself. */
  footer?: boolean;
}

export function Pricing({ heading = true, footer = heading }: PricingProps = {}) {
  return (
    <Section id="pricing" className={cn(heading && "bg-muted/20")}>
      {heading ? (
        <SectionHeading
          align="center"
          eyebrow="Pricing"
          title="Every feature, on both plans."
          body="Tiers are sized by how many WhatsApp messages you send a month, not by what the product will tell you about your store. A store on Go gets the same analytics, flows and assistant as one on Plus."
        />
      ) : null}

      <div className={cn("mx-auto grid max-w-3xl items-stretch gap-6 sm:grid-cols-2", heading && "mt-12")}>
        {PLANS.map((plan, i) => (
          <BlurFade key={plan.name} delay={i * 0.08} inView className="h-full">
            <div
              className={cn(
                "relative flex h-full flex-col overflow-hidden rounded-2xl bg-card p-6",
                plan.highlight
                  ? "ring-2 ring-primary shadow-[0_20px_60px_-24px_color-mix(in_oklch,var(--primary)_55%,transparent)] lg:-my-2 lg:py-8"
                  : "ring-1 ring-foreground/10",
              )}
            >
              {plan.highlight ? (
                <BorderBeam
                  size={140}
                  duration={9}
                  colorFrom="var(--primary)"
                  colorTo="color-mix(in oklch, var(--chart-7) 70%, transparent)"
                  borderWidth={2}
                />
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <h3 className="font-heading text-base font-medium">{plan.name}</h3>
                {plan.highlight ? <Badge>Most chosen</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">{plan.cadence}</span>
              </div>

              <Separator className="my-6" />

              <ul className="space-y-3">
                {plan.limits.map((limit) => (
                  <li key={limit} className="flex gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{limit}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                variant={plan.highlight ? "default" : "outline"}
                asChild
                className="mt-auto h-11 w-full text-sm"
              >
                <Link href={plan.href}>
                  {plan.cta}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </BlurFade>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Billed monthly by UPI Autopay. Cancel anytime — nothing else is charged after.{" "}
        {footer ? (
          <Link
            href="/pricing"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Compare tiers in full
          </Link>
        ) : null}
      </p>
    </Section>
  );
}
