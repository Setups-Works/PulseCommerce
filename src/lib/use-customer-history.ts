"use client";

import { useEffect, useState } from "react";
import { useAnalytics } from "@/components/providers/analytics-provider";
import type { CustomerRecord } from "@/lib/analytics/types";

type History = NonNullable<CustomerRecord["history"]>;

/**
 * Fetches one customer's order history.
 *
 * The ledger payload omits history so every customer can be listed rather than
 * a capped slice; this fills it in for the one customer being looked at. A
 * record that already carries history (an export, say) skips the request.
 *
 * What is fetched is stored against the key it belongs to, so switching
 * customers cannot briefly show the previous one's orders — the mismatch reads
 * as "not loaded" without needing an effect to clear anything.
 */
export function useCustomerHistory(customer: CustomerRecord | null) {
  const { queryParams } = useAnalytics();
  const [fetched, setFetched] = useState<{ key: string; history: History } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = customer?.key ?? null;
  const alreadyHave = customer?.history ?? null;

  // Derived rather than stored: a record that arrives with its history needs
  // no state and no effect to copy it into one.
  const history = alreadyHave ?? (fetched && fetched.key === key ? fetched.history : null);

  useEffect(() => {
    if (!key || alreadyHave) return;

    const controller = new AbortController();
    let cancelled = false;

    /*
     * Deferred by a tick so the loading flag is not set synchronously in the
     * effect body, which causes a cascading render. The request is unchanged;
     * only when its first state update happens is.
     */
    const start = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      const search = new URLSearchParams();
      if (queryParams.from) search.set("from", queryParams.from);
      if (queryParams.to) search.set("to", queryParams.to);
      if (queryParams.granularity) search.set("granularity", queryParams.granularity);

      fetch(`/api/customers/${encodeURIComponent(key)}?${search.toString()}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error ?? `Request failed with ${res.status}`);
          setFetched({ key, history: (json.customer as CustomerRecord).history ?? [] });
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Could not load orders.");
        })
        .finally(() => setLoading(false));
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(start);
      controller.abort();
    };
  }, [key, alreadyHave, queryParams]);

  return { history, loading, error };
}
