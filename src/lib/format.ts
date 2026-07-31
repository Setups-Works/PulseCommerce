/** Shared display formatting. Charts and tables must agree on these. */

const cache = new Map<string, Intl.NumberFormat>();

function nf(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en", options);
    cache.set(key, f);
  }
  return f;
}

export function formatCurrency(value: number, currency = "USD", opts: { compact?: boolean; decimals?: number } = {}): string {
  if (!Number.isFinite(value)) return "—";
  if (opts.compact) {
    return nf(`c-compact-${currency}`, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  const decimals = opts.decimals ?? (Math.abs(value) >= 1000 ? 0 : 2);
  return nf(`c-${currency}-${decimals}`, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return nf(`n-${decimals}`, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return nf("compact", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** `value` is already in percentage points (e.g. 42.5 → "42.5%"). */
export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${nf(`p-${decimals}`, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)}%`;
}

/** `value` is a fraction (e.g. 0.425 → "+42.5%"). */
export function formatChange(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${nf(`p-${decimals}`, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value * 100)}%`;
}

const dateFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export function formatDateTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

export function formatRelative(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatDays(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value < 1) return "today";
  if (value === 1) return "1 day";
  return `${formatNumber(value)} days`;
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
