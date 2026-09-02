import type { Metadata } from "next";
import { MagicLinkCatcher } from "@/components/auth/magic-link-catcher";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { AiAgent } from "@/components/marketing/landing/ai-agent";
import { Automation } from "@/components/marketing/landing/automation";
import { Cta } from "@/components/marketing/landing/cta";
import { DashboardPreview } from "@/components/marketing/landing/dashboard-preview";
import { Faq } from "@/components/marketing/landing/faq";
import { Features } from "@/components/marketing/landing/features";
import { Hero } from "@/components/marketing/landing/hero";
import { Integrations } from "@/components/marketing/landing/integrations";
import { Modules } from "@/components/marketing/landing/modules";
import { Pricing } from "@/components/marketing/landing/pricing";
import { Testimonials } from "@/components/marketing/landing/testimonials";
import { TrustedBy } from "@/components/marketing/landing/trusted-by";
import { WhyBento } from "@/components/marketing/landing/why-bento";
import { landingSchema, SITE_DESCRIPTION } from "@/lib/marketing/schema";

export const metadata: Metadata = {
  title: "PulseCommerce — AI Commerce Intelligence for WooCommerce",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "PulseCommerce — AI Commerce Intelligence for WooCommerce",
    description: SITE_DESCRIPTION,
    url: "/",
    type: "website",
  },
};

/**
 * The landing page.
 *
 * Each section is its own file under components/marketing/landing/, composed
 * here in reading order. Two reasons the page is a list of imports rather than
 * eight hundred lines of markup: a section is the unit anyone actually edits,
 * and only three of the fourteen need to be client components — keeping them
 * separate means the other eleven stay server-rendered rather than being
 * dragged across the boundary by a `"use client"` at the top of the page.
 *
 * Every claim here is one the product keeps. The file sits next to the code
 * that implements it, so an invented feature would be visible to anyone
 * reading both. The two places where the content is not yet real — the
 * placeholder prices and the placeholder testimonials — say so on the page and
 * in their own source files.
 */
export default function LandingPage() {
  return (
    <>
      {/*
       * Structured data, generated from the same constants the sections
       * render. See lib/marketing/schema.ts for why it is one @graph.
       *
       * `JSON.stringify` of an object we construct ourselves, so there is no
       * untrusted input to escape here — but the `<` guard stays because a
       * literal "</script>" appearing in any future FAQ answer would close the
       * tag early and break the page.
       */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(landingSchema()).replace(/</g, "\\u003c"),
        }}
      />

      <ScrollProgress className="h-0.5 bg-linear-to-r from-primary via-chart-7 to-primary" />
      <MagicLinkCatcher />

      <main>
        <Hero />
        <TrustedBy />
        <WhyBento />
        <Modules />
        <AiAgent />
        <DashboardPreview />
        <Features />
        <Automation />
        <Integrations />
        <Pricing />
        <Testimonials />
        <Faq />
        <Cta />
      </main>
    </>
  );
}
