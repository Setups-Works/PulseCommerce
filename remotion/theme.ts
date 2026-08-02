/**
 * The video's palette, taken from the application's own tokens.
 *
 * `globals.css` states these in oklch, which no video encoder understands, so
 * they are written here as the hex the tokens were converted from — the same
 * Setups Works blue the interface uses. Keeping the source in the comment means
 * a future change to the theme has an obvious counterpart here rather than the
 * video quietly drifting away from the product it advertises.
 */
export const theme = {
  /** --primary, light mode: oklch(0.552 0.206 263.7) */
  brand: "#2f66e8",
  /** --primary, dark mode: oklch(0.639 0.179 262.4) */
  brandLight: "#4d86f7",
  brandDeep: "#1e3670",
  /** --foreground: oklch(0.145 0 0) */
  ink: "#0d1017",
  muted: "#616b7d",
  line: "#e2e8f2",
  paper: "#ffffff",
  tint: "#f5f8ff",
} as const;

/** The interface is set in Geist; the video follows it. */
export const font =
  '"Geist", Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const FPS = 30;
export const SIDE = 1080;
