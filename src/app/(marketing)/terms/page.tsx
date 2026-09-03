import type { Metadata } from "next";
import { Section } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply to using PulseCommerce.",
  alternates: { canonical: "/terms" },
};

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <main>
      <Section className="max-w-3xl pt-16 md:pt-24">
        <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated September 3, 2026.</p>

        <div className="mt-10 space-y-10 text-base leading-relaxed text-muted-foreground">
          <LegalSection title="1. Who this agreement is with">
            <p>
              PulseCommerce is operated by Setups Works (Udyam Registration UDYAM-TN-24-0086773).
              By creating an account or connecting a store, you agree to these terms.
            </p>
          </LegalSection>

          <LegalSection title="2. The service">
            <p>
              PulseCommerce connects to your WooCommerce store and your WhatsApp Business
              connection to provide analytics, campaign, and automated-messaging features. You
              control which store and which WhatsApp connection are linked, and can disconnect
              either at any time from Settings.
            </p>
          </LegalSection>

          <LegalSection title="3. Your account and your responsibilities">
            <p>
              You&apos;re responsible for the accuracy of the WooCommerce and WhatsApp credentials
              you provide, and for how PulseCommerce is used under your account — including
              obtaining any consent required before messaging a customer, and complying with
              WhatsApp&apos;s own terms and India&apos;s applicable messaging/spam regulations.
            </p>
            <p>
              Sending unsolicited bulk messages to recipients who haven&apos;t consented to hear
              from your store is not permitted, and may result in your account or your connected
              WhatsApp number being restricted by WhatsApp itself, independent of anything
              PulseCommerce does.
            </p>
          </LegalSection>

          <LegalSection title="4. Billing and plans">
            <p>
              Paid plans (Go and Plus) bill monthly via Razorpay UPI Autopay. New subscriptions
              include a one-time 14-day free trial; your payment mandate is authorized immediately,
              and the first charge is deferred to the end of the trial. You can cancel from Settings
              → Billing at any time; cancelling stops future billing but doesn&apos;t refund the
              current period.
            </p>
          </LegalSection>

          <LegalSection title="5. Data and your store">
            <p>
              Your order, customer, and product data is mirrored from WooCommerce to power
              analytics and messaging, and remains yours. See our{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>{" "}
              for what&apos;s collected and how it&apos;s used.
            </p>
          </LegalSection>

          <LegalSection title="6. Limitation of liability">
            <p>
              PulseCommerce is provided as-is. To the extent permitted by law, Setups Works isn&apos;t
              liable for indirect or consequential damages arising from use of the service,
              including messages sent through a WhatsApp connection you configured.
            </p>
          </LegalSection>

          <LegalSection title="7. Changes to these terms">
            <p>
              We may update these terms as the product changes. Material changes will be reflected
              here with an updated date above.
            </p>
          </LegalSection>

          <LegalSection title="8. Contact">
            <p>
              Questions about these terms:{" "}
              <a href="mailto:hello@pulsecommerce.io" className="text-primary hover:underline">
                hello@pulsecommerce.io
              </a>
              .
            </p>
          </LegalSection>
        </div>
      </Section>
    </main>
  );
}
