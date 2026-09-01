"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useBilling } from "@/components/providers/billing-provider";
import { Button } from "@/components/ui/button";

/**
 * Shown on every app page for an account with no usable plan — not just
 * inside Settings, because the actual failure (a send silently refused with
 * `code: "limit_reached"`) happens on a campaigns or flows page, nowhere
 * near where billing lives. Someone should not have to go looking for
 * Settings → Billing to learn why a send didn't go out.
 *
 * Reads BillingProvider's shared status rather than fetching its own — the
 * Billing card reads the same context, so the banner and the settings page
 * can never disagree about whether an account is blocked.
 *
 * `checkSendAllowance` in src/lib/billing/usage.ts is the real gate; this is
 * only the advance warning for the same rule. Reads `usage.limit === 0`
 * directly rather than re-deriving "which statuses count as blocked" from
 * `subscriptionStatus` here — that used to be a second, hand-maintained copy
 * of the same policy `planMessageLimit` already computes, and it had drifted
 * (this banner treated a still-mid-mandate "created" account as not blocked,
 * while the real gate already refused it). `usage.limit` is null for
 * anything actually unlimited (legacy_unlimited, or an active/trialing
 * Plus), so it can never misfire for those.
 */
export function SubscriptionBanner() {
  const { status, initialising } = useBilling();

  if (initialising || !status) return null;

  const blocked = status.usage.limit === 0;
  if (!blocked) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-amber-900 dark:text-amber-200"
    >
      <CircleAlert className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 text-xs leading-relaxed sm:text-sm">
        {status.plan
          ? "Your subscription isn't active, so WhatsApp sends are disabled."
          : "No plan is active yet, so WhatsApp sends are disabled."}
      </p>
      <Button
        asChild
        size="sm"
        variant="outline"
        className="h-7 shrink-0 border-amber-500/40 bg-transparent text-xs text-amber-900 hover:bg-amber-500/15 dark:text-amber-200"
      >
        <Link href="/settings?section=billing">Add a subscription</Link>
      </Button>
    </div>
  );
}
