"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AnalyticsResult, DateRange, Granularity } from "@/lib/analytics/types";
import { createPersistedStore, usePersisted } from "@/lib/persisted-store";

export interface RangePreset {
  id: string;
  label: string;
  /** null = "everything we have", resolved against the dataset bounds. */
  days: number | null;
}

export const RANGE_PRESETS: RangePreset[] = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "180d", label: "Last 6 months", days: 180 },
  { id: "365d", label: "Last 12 months", days: 365 },
  { id: "all", label: "All time", days: null },
];

interface AnalyticsState {
  data: AnalyticsResult | null;
  loading: boolean;
  /** True only on the very first load, so refreshes don't blank the page. */
  initialising: boolean;
  error: string | null;
  /** True when no WooCommerce store has been authorized yet. */
  notConnected: boolean;
  range: DateRange | null;
  presetId: string;
  granularity: Granularity | "auto";
  setPreset: (id: string) => void;
  setCustomRange: (range: DateRange) => void;
  setGranularity: (g: Granularity | "auto") => void;
  refresh: () => void;
  /** Current query params, so exports match exactly what's on screen. */
  queryParams: { from?: string; to?: string; granularity?: Granularity };
}

const AnalyticsContext = createContext<AnalyticsState | null>(null);

interface PersistedView {
  presetId: string;
  range: DateRange | null;
  granularity: Granularity | "auto";
}

/**
 * The selected window lives in localStorage so a reload keeps the analyst's
 * context. It's read through an external store rather than restored in an
 * effect, so there is no flash of the default range on first paint.
 */
const viewStore = createPersistedStore<PersistedView>("pulse.range", {
  presetId: "30d",
  range: null,
  granularity: "auto",
});

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialising, setInitialising] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [view, setView] = usePersisted(viewStore);
  const { presetId, range, granularity } = view;
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const queryParams = useMemo(() => {
    const params: { from?: string; to?: string; granularity?: Granularity } = {};
    if (range) {
      params.from = range.from;
      params.to = range.to;
    }
    if (granularity !== "auto") params.granularity = granularity;
    return params;
  }, [range, granularity]);

  const fetchData = useCallback(
    async (opts: { refresh?: boolean } = {}) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const search = new URLSearchParams();
      if (queryParams.from) search.set("from", queryParams.from);
      if (queryParams.to) search.set("to", queryParams.to);
      if (queryParams.granularity) search.set("granularity", queryParams.granularity);
      if (opts.refresh) search.set("refresh", "1");

      try {
        const res = await fetch(`/api/analytics?${search.toString()}`, { signal: controller.signal });
        const json = await res.json();

        if (res.status === 409 && json?.code === "not_connected") {
          setNotConnected(true);
          setData(null);
          return;
        }
        if (!res.ok) throw new Error(json?.error ?? `Request failed with ${res.status}`);

        setNotConnected(false);
        setData(json as AnalyticsResult);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
        setInitialising(false);
      }
    },
    [queryParams],
  );

  // Fetching on mount and on range change is exactly what an effect is for;
  // the state it sets lands in async callbacks, not during render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData, nonce]);

  const setPreset = useCallback(
    (id: string) => {
      const preset = RANGE_PRESETS.find((p) => p.id === id);
      if (!preset) return;

      // Anchor presets to the newest data we hold, not to wall-clock today:
      // a store that stopped syncing yesterday should still show its last 30 days.
      const bounds = data?.meta.dataBounds;
      let nextRange: DateRange | null;

      if (preset.days === null) {
        nextRange = bounds ? { from: bounds.from, to: bounds.to } : null;
      } else {
        const end = bounds ? new Date(bounds.to) : new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - (preset.days - 1));
        nextRange = { from: toIso(start), to: toIso(end) };
        if (bounds && nextRange.from < bounds.from) nextRange.from = bounds.from;
      }

      setView({ presetId: id, range: nextRange, granularity });
    },
    [data?.meta.dataBounds, granularity, setView],
  );

  const setCustomRange = useCallback(
    (next: DateRange) => {
      setView({ presetId: "custom", range: next, granularity });
    },
    [granularity, setView],
  );

  const changeGranularity = useCallback(
    (g: Granularity | "auto") => {
      setView({ presetId, range, granularity: g });
    },
    [presetId, range, setView],
  );

  const value = useMemo<AnalyticsState>(
    () => ({
      data,
      loading,
      initialising,
      error,
      notConnected,
      range,
      presetId,
      granularity,
      setPreset,
      setCustomRange,
      setGranularity: changeGranularity,
      refresh: () => setNonce((n) => n + 1),
      queryParams,
    }),
    [
      data, loading, initialising, error, notConnected, range, presetId, granularity,
      setPreset, setCustomRange, changeGranularity, queryParams,
    ],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsState {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error("useAnalytics must be used inside <AnalyticsProvider>.");
  return ctx;
}

/** Convenience for pages that can't render without data. */
export function useAnalyticsData(): AnalyticsResult | null {
  return useAnalytics().data;
}
