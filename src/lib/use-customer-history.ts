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
 */
export function useCustomerHistory(customer: CustomerRecord | null) {
  const { queryParams } = useAnalytics();
  const [history, setHistory] = useState<History | null>(customer?.history ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = customer?.key ?? null;
  const alreadyHave = customer?.history;

  useEffect(() => {
    if (!key) return;
    if (alreadyHave) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory(alreadyHave);
      return;
    }

    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const search = new URLSearchParams();
    if (queryParams.from) search.set("from", queryParams.from);
    if (queryParams.to) search.set("to", queryParams.to);
    if (queryParams.granularity) search.set("granularity", queryParams.granularity);

    fetch(`/api/customers/${encodeURIComponent(key)}?${search.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `Request failed with ${res.status}`);
        setHistory((json.customer as CustomerRecord).history ?? []);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load orders.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [key, alreadyHave, queryParams]);

  return { history, loading, error };
}
