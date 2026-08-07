import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Megaphone, Sparkles, Users } from "lucide-react";
import { Link as HeroLink } from "@heroui/react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { readStoreConfig } from "@/lib/store/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You are set up",
  robots: { index: false, follow: false },
};

/**
 * Onboarding, step three: where to go first.
 *
 * Four destinations rather than a single "Go to dashboard", because the useful
 * first action depends on why they signed up — someone here for churn wants
 * the customers screen, not a revenue chart. The dashboard is still the
 * primary button.
 *
 * If no store is connected the copy changes rather than the page redirecting:
 * arriving here having skipped step one is a legitimate path, and bouncing
 * them back would trap anyone who genuinely wanted to look around first.
 */

const DESTINATIONS: [typeof Users, string, string, string][] = [
  [BarChart3, "Dashboard", "Headline KPIs, the revenue trend and generated insights.", "/dashboard"],
  [Users, "Customers", "Ten RFM segments, predicted value and churn risk.", "/customers"],
  [Sparkles, "Assistant", "Ask about the business in plain English.", "/assistant"],
  [Megaphone, "Campaigns", "Build an audience and dry-run it before anything sends.", "/campaigns"],
];

export default async function OnboardingDonePage() {
  const config = await readStoreConfig();
  const connected = Boolean(config);

  return (
    <OnboardingShell
      step="done"
      title={connected ? "Your store is connected" : "You are ready when your store is"}
      subtitle={
        connected
          ? "The first pull may still be running. Every figure below comes from your own orders — there is no sample data anywhere in the product."
          : "No store is connected yet, so the screens below will be empty. Connect one whenever you are ready and they fill in on their own."
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {DESTINATIONS.map(([Icon, title, body, href]) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-[0_8px_28px_-12px_rgb(0_0_0/0.22)]"
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-secondary">
              <Icon className="size-4.5 text-accent" strokeWidth={1.75} />
            </span>
            <h2 className="mt-3.5 font-heading text-base font-medium">{title}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{body}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
              Open
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        <HeroLink href={connected ? "/dashboard" : "/onboarding"}>
          {connected ? "Open the dashboard" : "Connect a store"}
          <ArrowRight className="size-4" />
        </HeroLink>
        <HeroLink href="/settings">
          Review settings
        </HeroLink>
      </div>
    </OnboardingShell>
  );
}
