"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface BillingStatus {
  plan: "go" | "plus" | null;
  subscriptionStatus: "none" | "created" | "active" | "past_due" | "halted" | "cancelled";
  legacyUnlimited: boolean;
}

/**
 * Shown on every app page for an account with no usable plan — not just
 * inside Settings, because the actual failure (a send silently refused with
 * `code: "limit_reached"`) happens on a campaigns or flows page, nowhere
 * near where billing lives. Someone should not have to go looking for
 * Settings → Billing to learn why a send didn't go out.
 *
 * `checkSendAllowance` in src/lib/billing/usage.ts is the real gate; this is
 * only the advance warning for the same rule, read from the same
 * /api/billing/status this session's own Billing card uses. Absent for
 * unlimited (Plus, or a grandfathered pre-billing account) and for an
 * account still mid-mandate ("created") or gracing a bounced charge
 * ("past_due") — those can still send.
 */
export function SubscriptionBanner() {
  const pathname = usePathname();
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        // No banner is the right failure mode here — a status check that
        // itself failed is not evidence of an unpaid account.
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!status || status.legacyUnlimited) return null;

  const blocked =
    status.plan === null ||
    status.subscriptionStatus === "halted" ||
    status.subscriptionStatus === "cancelled" ||
    status.subscriptionStatus === "none";
  if (!blocked) return null;

  return (
    <div className="flex items-center gap-2.5 border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-900 dark:text-amber-200">
      <TriangleAlert className="size-3.5 shrink-0" />
      <p className="min-w-0 flex-1">
        {status.plan
          ? "Your subscription isn't active, so WhatsApp sends are disabled."
          : "No plan is active yet, so WhatsApp sends are disabled."}
      </p>
      <Link
        href="/settings?section=billing"
        className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
      >
        Add a subscription
      </Link>
    </div>
  );
}
