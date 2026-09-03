import type { Metadata } from "next";
import Image from "next/image";
import { Section } from "@/components/marketing/sections";
import { Cta } from "@/components/marketing/landing/cta";

export const metadata: Metadata = {
  title: "About",
  description: "PulseCommerce is a product of Setups Works — who we are, and how to reach us.",
  alternates: { canonical: "/about" },
};

/**
 * The one page that exists specifically to answer "who actually runs this" —
 * for a human visitor, and for anything (a platform's business-verification
 * review, a payments provider's KYB check) that needs the operating company
 * spelled out rather than inferred from a product name.
 */
export default function AboutPage() {
  return (
    <main>
      <Section className="max-w-3xl pt-16 md:pt-24">
        <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          About PulseCommerce
        </h1>

        <div className="mt-8 space-y-8 text-base leading-relaxed text-muted-foreground">
          <p>
            PulseCommerce is a self-hosted analytics and WhatsApp-messaging platform for
            WooCommerce stores. It turns a store&apos;s order history into RFM segmentation, cohort
            retention, product affinity, and a revenue forecast — then lets a merchant act on that
            directly over WhatsApp, through a connection the merchant controls.
          </p>

          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              The company behind it
            </h2>
            <p className="mt-2">
              PulseCommerce is a product of{" "}
              <span className="font-medium text-foreground">Setups Works</span>, registered as a
              Micro, Small &amp; Medium Enterprise in India under Udyam Registration number{" "}
              <span className="font-medium text-foreground">UDYAM-TN-24-0086773</span>.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Contact</h2>
            <p className="mt-2">
              For anything — support, a partnership question, a security report —{" "}
              <a href="mailto:hello@pulsecommerce.io" className="text-primary hover:underline">
                hello@pulsecommerce.io
              </a>
              .
            </p>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3 border-t pt-8">
          <Image
            src="/brand/setups-works-black.png"
            alt="Setups Works"
            width={140}
            height={32}
            className="h-8 w-auto dark:hidden"
          />
          <Image
            src="/brand/setups-works-white.png"
            alt="Setups Works"
            width={140}
            height={32}
            className="hidden h-8 w-auto dark:block"
          />
        </div>
      </Section>

      <Cta
        id="about-cta"
        title="See it against your own store's numbers."
        body="Connect your store, and every claim on this page becomes something you can go check yourself."
      />
    </main>
  );
}
