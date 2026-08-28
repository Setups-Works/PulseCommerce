"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface BillingStatus {
  plan: "go" | "plus" | null;
  subscriptionStatus: "none" | "created" | "active" | "past_due" | "halted" | "cancelled";
  currentPeriodEnd: string | null;
  graceUntil: string | null;
  legacyUnlimited: boolean;
  usage: { sent: number; limit: number | null };
}

interface BillingState {
  status: BillingStatus | null;
  /** True only on the very first load, so a refresh doesn't blank the banner/card. */
  initialising: boolean;
  refresh: () => void;
}

const BillingContext = createContext<BillingState | null>(null);

/**
 * One fetch of /api/billing/status per session, shared by the Billing card
 * and the SubscriptionBanner rather than each polling it independently —
 * the two are reading the same fact ("is a send going to be refused right
 * now?") and disagreeing about it, even briefly between two separate
 * fetches landing at different times, would be a worse experience than one
 * shared source refreshed in one place.
 *
 * Mirrors AnalyticsProvider's own shape: a context wrapping the whole app
 * shell, `refresh()` exposed for whoever changes the plan to pull the new
 * state immediately rather than waiting on the next mount.
 */
export function BillingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [initialising, setInitialising] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status", { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } catch {
      // Silently keep whatever was last known — a failed check is not
      // evidence of an unpaid account, and should not flip the banner on.
    } finally {
      setInitialising(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <BillingContext.Provider value={{ status, initialising, refresh: load }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling(): BillingState {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used inside <BillingProvider>.");
  return ctx;
}
