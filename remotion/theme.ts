/**
 * Monochrome, deliberately.
 *
 * A film that is only black, white and grey cannot be undermined by a bad
 * screen or a compressed feed, and it reads as a product rather than a poster.
 * Emphasis has to come from weight, scale and motion instead of from colour,
 * which is a harder discipline and a better result.
 */
export const theme = {
  ink: "#0a0a0b",
  /** Panel surfaces, lifted off the black by a few percent. */
  raise: "rgba(255,255,255,.06)",
  edge: "rgba(255,255,255,.16)",
  paper: "#ffffff",
  /** Body copy on black. Never pure white — it strobes at this size. */
  soft: "#c9cbd1",
  muted: "#8b8f99",
} as const;

/** The interface is set in Geist; the video follows it. */
export const font =
  '"Geist", Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const FPS = 30;
export const SIDE = 1080;
