"use client";

import { useMemo } from "react";
import { formatCompact, formatCurrency, formatNumber, formatPercent } from "@/lib/format";

/** Currency-aware formatters bound to the connected store's currency. */
export function useFormatters(currency: string) {
  return useMemo(
    () => ({
      currency: (v: number) => formatCurrency(v, currency),
      currencyCompact: (v: number) => formatCurrency(v, currency, { compact: true }),
      currencyExact: (v: number) => formatCurrency(v, currency, { decimals: 2 }),
      number: (v: number) => formatNumber(v),
      compact: (v: number) => formatCompact(v),
      percent: (v: number) => formatPercent(v),
      decimal: (v: number) => formatNumber(v, 2),
    }),
    [currency],
  );
}

export type Formatters = ReturnType<typeof useFormatters>;
