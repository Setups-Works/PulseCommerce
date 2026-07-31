/**
 * Series colour assignment.
 *
 * Slots are handed out in fixed order and never cycled — an entity keeps its
 * colour even when a filter changes how many series are on screen. Past eight
 * series, fold the tail into "Other" rather than inventing a ninth hue.
 */

export const SERIES_SLOTS = 8;

export function seriesColor(index: number): string {
  return `var(--chart-${Math.min(index, SERIES_SLOTS - 1) + 1})`;
}

/**
 * Scatter, bubble and choropleth forms compare every pair at once, and the full
 * eight-slot ramp cannot clear the CVD floor under all-pairs. Three does.
 */
export const ALL_PAIRS_SAFE_SLOTS = 3;

export const STATUS_COLORS = {
  good: "var(--good)",
  warning: "var(--warning)",
  serious: "var(--serious)",
  critical: "var(--critical)",
} as const;

/**
 * Single-hue ramp for magnitude encoding (heatmaps, cohort matrices).
 *
 * The steps live in CSS rather than here so light and dark swap through the
 * cascade. Detecting the theme in JS would need a mounted flag to stay
 * hydration-safe, which means the first paint is always the wrong palette.
 */
export const RAMP_STEPS = 10;

export const SEQUENTIAL_RAMP = Array.from({ length: RAMP_STEPS }, (_, i) => `var(--ramp-${i})`);

/** Quantises a 0–1 magnitude to a ramp step index. */
export function rampStep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return Math.min(RAMP_STEPS - 1, Math.round(clamped * (RAMP_STEPS - 1)));
}

/** Maps a 0–1 magnitude onto the ramp. */
export function rampColor(t: number): string {
  return SEQUENTIAL_RAMP[rampStep(t)];
}

/**
 * Props for a ramp-filled cell. The step index goes out as a data attribute so
 * the `.ramp-cell` rules in globals.css can pick the legible ink per theme —
 * the light and dark ramps cross the readability boundary at different steps,
 * which no single JS threshold can express.
 */
export function rampCellProps(t: number) {
  const step = rampStep(t);
  return {
    className: "ramp-cell",
    "data-step": step,
    style: { backgroundColor: `var(--ramp-${step})` },
  } as const;
}

/** Recessive chart chrome. */
export const AXIS_STYLE = {
  stroke: "var(--grid)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;
