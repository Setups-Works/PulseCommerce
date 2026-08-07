import type { Metadata } from "next";
import { ArrowRight, Check, Clock, Minus, ServerCog, TriangleAlert } from "lucide-react";
import { Button, Card, Chip, Link as HeroLink } from "@heroui/react";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Choose how messages send",
  robots: { index: false, follow: false },
};

/**
 * Onboarding, step two: how WhatsApp messages are carried.
 *
 * Presented as a real trade-off rather than a funnel. Both routes list their
 * drawbacks in the same weight as their advantages, because this choice
 * genuinely goes either way — a store sending a few hundred messages a month
 * wants Meta's reliability, and one sending tens of thousands cannot afford
 * per-conversation pricing.
 *
 * The official Cloud API is marked as not yet available and is deliberately
 * not selectable. A "coming soon" option that can be clicked is a support
 * ticket; one that cannot be is information.
 *
 * Nothing is persisted here yet — the actual gateway credentials are entered
 * in Settings, which is where they can also be changed later. This step is
 * about the decision, and it links to the screen that acts on it.
 */

const SELF_HOSTED = {
  pros: [
    "No per-message fee, at any volume",
    "Your number, your server, your message history",
    "No template approval and no waiting",
    "Works with everything: campaigns, flows, auto-reply, the shared inbox",
  ],
  cons: [
    "Delivery is not guaranteed by Meta",
    "Use a dedicated number, never your main business line",
    "You run and update the messaging server",
  ],
  requirements: [
    "A small always-on server, or a container on one you already have",
    "A phone number that is not your primary business line",
    "Roughly fifteen minutes to scan a QR code and confirm the link",
  ],
};

const CLOUD_API = {
  pros: [
    "Delivery backed by Meta",
    "Tappable buttons and product cards",
    "Your number cannot be restricted for using it as intended",
  ],
  cons: [
    "Meta charges per conversation, ongoing",
    "Templates need approval before they can send",
    "A Meta Business account and a verified business are prerequisites",
  ],
};

export default function OnboardingWhatsAppPage() {
  return (
    <OnboardingShell
      step="whatsapp"
      title="Choose how your messages send"
      subtitle="The analytics, the flows, the assistant and the shared inbox are identical either way. The only thing that changes is what carries the messages — and you can change it later."
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* ---- Self-hosted: available now ---------------------------------- */}
        <Card className="relative flex h-full flex-col overflow-hidden p-6 ring-2 ring-accent">
          <div className="flex items-center justify-between gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-secondary">
              <BrandMark icon={BRANDS.whatsapp} className="size-6" brandColor />
            </span>
            <Chip color="success">Available now</Chip>
          </div>

          <h2 className="mt-4 font-heading text-lg font-medium">Your own WhatsApp host</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A messaging server on infrastructure you control. Nobody sits between you and your
            customers, and there is no charge per message however many you send.
          </p>

          <ul className="mt-5 flex flex-col gap-2.5">
            {SELF_HOSTED.pros.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>{item}</span>
              </li>
            ))}
            {SELF_HOSTED.cons.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-muted">
                <Minus className="mt-0.5 size-4 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <span className="my-5 block h-px bg-border" />

          <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-border p-3">
            <ServerCog className="mt-0.5 size-4 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-xs font-semibold">What you need</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {SELF_HOSTED.requirements.map((item) => (
                  <li key={item} className="text-xs leading-relaxed text-muted">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-xs leading-relaxed">
              <span className="font-medium">Use a dedicated number.</span> Self-hosted delivery is
              not sanctioned by Meta, and a number can be restricted. Never connect the line your
              business depends on.
            </p>
          </div>

          <HeroLink href="/settings?tab=whatsapp" className="mt-6">
            Set up the gateway
            <ArrowRight className="size-4" />
          </HeroLink>
        </Card>

        {/* ---- Cloud API: not yet ------------------------------------------ */}
        {/* No ring, no shadow, no accent: the visual weight says "not yet"
            before the badge has to. */}
        <div className={cn("flex h-full flex-col rounded-xl border border-dashed border-border bg-surface/60 p-6")}>
          <div className="flex items-center justify-between gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-secondary">
              <BrandMark icon={BRANDS.meta} className="size-6 text-muted" />
            </span>
            <Chip variant="soft" className="gap-1.5">
              <Clock className="size-3" />
              Coming soon
            </Chip>
          </div>

          <h2 className="mt-4 font-heading text-lg font-medium">Official WhatsApp Cloud API</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Meta&rsquo;s own API, with delivery under their terms. The integration is being built —
            it is honest to say it does not exist today, so it is not offered as a choice you can
            make yet.
          </p>

          <ul className="mt-5 flex flex-col gap-2.5">
            {CLOUD_API.pros.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-muted">
                <Check className="mt-0.5 size-4 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
            {CLOUD_API.cons.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-muted">
                <Minus className="mt-0.5 size-4 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <span className="mt-auto mb-5 block h-px bg-border" />

          <p className="text-sm font-medium">
            Best when delivery matters more than cost, or you message people who have not bought
            from you before.
          </p>

          <Button variant="outline" fullWidth isDisabled className="mt-6">
            Not available yet
          </Button>
          <p className="mt-2 text-center text-xs text-muted">
            Start self-hosted and switch when it lands — nothing else about the product changes.
          </p>
        </div>
      </div>

      {/* ---- Move on ------------------------------------------------------- */}
      <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
        <p className="text-sm text-muted">
          Not ready to decide? The analytics work without a gateway connected.
        </p>
        <div className="flex flex-wrap gap-3">
          <HeroLink href="/pricing#delivery">
            Compare in detail
          </HeroLink>
          <HeroLink href="/onboarding/done">
            Continue
            <ArrowRight className="size-4" />
          </HeroLink>
        </div>
      </div>
    </OnboardingShell>
  );
}
