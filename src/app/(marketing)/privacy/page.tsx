import type { Metadata } from "next";
import { Section } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What PulseCommerce collects, why, and who it's shared with.",
  alternates: { canonical: "/privacy" },
};

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <main>
      <Section className="max-w-3xl pt-16 md:pt-24">
        <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated September 3, 2026.</p>

        <div className="mt-10 space-y-10 text-base leading-relaxed text-muted-foreground">
          <LegalSection title="Who this covers">
            <p>
              This policy covers data PulseCommerce (operated by Setups Works, Udyam Registration
              UDYAM-TN-24-0086773) collects from merchants who create an account. It does not cover
              how an individual merchant chooses to message their own customers — that&apos;s the
              merchant&apos;s own responsibility under our Terms of Service.
            </p>
          </LegalSection>

          <LegalSection title="What we collect">
            <ul className="list-disc space-y-2 pl-5">
              <li>Your account email and authentication details.</li>
              <li>
                Your store&apos;s WooCommerce order, customer, and product data, mirrored via the
                store&apos;s own API credentials to power analytics and messaging.
              </li>
              <li>
                Your connected WhatsApp Business number&apos;s session state, used to send and
                receive messages on your behalf.
              </li>
              <li>Billing details processed by Razorpay for paid plans.</li>
            </ul>
          </LegalSection>

          <LegalSection title="How it's used">
            <p>
              To render your dashboard&apos;s analytics, to send messages you configure (campaigns,
              order confirmations, abandoned-checkout reminders) through your own connected WhatsApp
              number, and to operate billing for paid plans.
            </p>
            <p>
              Message content and customer phone numbers are never sent to a language model or any
              third party for the AI assistant feature — the assistant reads aggregated store data
              only.
            </p>
          </LegalSection>

          <LegalSection title="Who it's shared with">
            <ul className="list-disc space-y-2 pl-5">
              <li>Supabase, our database and authentication provider.</li>
              <li>Razorpay, for payment processing on paid plans.</li>
              <li>
                Your own WhatsApp Business connection — messages you send go through WhatsApp
                itself, the same as any WhatsApp Business account.
              </li>
            </ul>
            <p>We don&apos;t sell customer or store data to anyone, for any purpose.</p>
          </LegalSection>

          <LegalSection title="Your controls">
            <p>
              You can disconnect your store or your WhatsApp connection at any time from Settings.
              To request deletion of your account and associated data, email us at the address
              below.
            </p>
          </LegalSection>

          <LegalSection title="Contact">
            <p>
              Privacy questions or a deletion request:{" "}
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
