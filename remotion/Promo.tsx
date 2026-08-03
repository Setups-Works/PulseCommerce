import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { LOGO } from "./logo";
import { FPS, font } from "./theme";
import { S, at } from "./scenes";

/**
 * The product, recorded.
 *
 * Every frame shows the real application — these are screenshots of the running
 * pages, not rebuilt approximations, so nothing here can claim a capability the
 * software does not have.
 *
 * The film is one continuous move across those pages rather than a sequence of
 * slides: a single browser frame stays on screen for the whole minute, its
 * contents cross-fade, and the camera pushes toward whatever is being talked
 * about. A cursor travels ahead of each change and clicks on arrival.
 */

/** Where each beat begins, from the holds above. */
const STARTS: number[] = [];

/**
 * The tour.
 *
 * `focus` is where the camera pushes, in percentages of the shot — chosen per
 * page so the zoom lands on the thing the caption is describing rather than on
 * the middle of the screen.
 */
const TOUR: {
  shot: string;
  title: string;
  desc: string;
  focus: [number, number];
  zoom: number;
  /** Frames to hold. Uneven on purpose — even beats read as a metronome. */
  hold: number;
}[] = [
  { shot: "dashboard", title: "Dashboard", desc: "Every figure from one cached pull of your order history", focus: [40, 34], zoom: 1.5 , hold: 150 },
  { shot: "dashboard", title: "Compared, always", desc: "Each metric against the equal-length previous period", focus: [66, 30], zoom: 1.85 , hold: 110 },
  { shot: "customers", title: "Customers", desc: "Ten RFM segments and five value tiers, scored on your own base", focus: [45, 42], zoom: 1.45 , hold: 130 },
  { shot: "cohorts", title: "Cohorts & retention", desc: "Who came back, month by month", focus: [46, 48], zoom: 1.4 , hold: 120 },
  { shot: "products", title: "Products", desc: "What carries the revenue, and what does not", focus: [42, 40], zoom: 1.5 , hold: 100 },
  { shot: "inventory", title: "Inventory", desc: "Days of cover, and the revenue behind each", focus: [42, 40], zoom: 1.5 , hold: 95 },
  { shot: "campaigns", title: "Build an audience", desc: "Filter to the customers who are slipping away", focus: [30, 46], zoom: 1.55 , hold: 130 },
  { shot: "campaigns", title: "Write the message", desc: "Personalised from each customer's own history", focus: [66, 44], zoom: 1.7 , hold: 125 },
  { shot: "campaigns", title: "Dry run", desc: "See exactly who it reaches — nothing is sent", focus: [66, 62], zoom: 1.8 , hold: 135 },
  { shot: "inbox", title: "Shared inbox", desc: "Replies arrive beside who the customer is", focus: [44, 44], zoom: 1.45 , hold: 125 },
  { shot: "flows", title: "Automated flows", desc: "A sequence that runs itself over days", focus: [34, 46], zoom: 1.5 , hold: 120 },
  { shot: "flows", title: "They leave when it works", desc: "A customer who buys stops receiving the rest", focus: [64, 40], zoom: 1.7 , hold: 110 },
  { shot: "menu", title: "Auto-reply", desc: "Answering when nobody is at a desk", focus: [42, 44], zoom: 1.5 , hold: 115 },
  { shot: "assistant", title: "The assistant", desc: "Ask the business a question in plain English", focus: [50, 40], zoom: 1.4 , hold: 135 },
  { shot: "assistant", title: "It proposes, you approve", desc: "Nothing sends until a person says so", focus: [50, 62], zoom: 1.6 , hold: 140 },
  { shot: "dashboard", title: "PulseCommerce", desc: "setups.works", focus: [50, 45], zoom: 1.12 , hold: 150 },
];

TOUR.reduce((acc, t, i) => {
  STARTS[i] = acc;
  return acc + t.hold;
}, 0);

export const DURATION = STARTS[TOUR.length - 1] + TOUR[TOUR.length - 1].hold;

/** Which beat a frame belongs to, and how far into it. */
function beatAt(frame: number) {
  let i = 0;
  while (i < TOUR.length - 1 && frame >= STARTS[i + 1]) i += 1;
  return { i, local: frame - STARTS[i], hold: TOUR[i].hold };
}

/**
 * The browser frame. Mounted once, for the whole film.
 *
 * This is what stops the result reading as a slideshow: the window never leaves
 * the screen, so consecutive beats are one interface being used rather than two
 * cards exchanging places.
 */
function Screen() {
  const frame = useCurrentFrame();
  const { i, local, hold } = beatAt(frame);
  const cur = TOUR[i];
  const prev = TOUR[Math.max(0, i - 1)];

  /*
   * One path across the whole film, not a move per beat.
   *
   * Interpolating over every keyframe at once means the camera is never at
   * rest and never restarts — it eases from wherever it happens to be toward
   * the next point of interest. A per-beat animation that begins and ends is
   * what made this read as slides however smooth each one was.
   */
  const keys = TOUR.map((_, n) => STARTS[n] + TOUR[n].hold * 0.55);
  const zoom = interpolate(frame, keys, TOUR.map((x) => x.zoom), {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const fx = interpolate(frame, keys, TOUR.map((x) => x.focus[0]), {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const fy = interpolate(frame, keys, TOUR.map((x) => x.focus[1]), {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // The page beneath cross-fades, so a change of page is a transition rather
  // than a cut.
  const swap = at(local, 0, Math.min(18, hold * 0.2));

  return (
    <div
      style={{
        width: 1010,
        borderRadius: 20,
        overflow: "hidden",
        background: "#fff",
        border: `1px solid rgba(13,16,23,.07)`,
        // Two shadows: a tight one that seats the frame, and a long soft one
        // that lifts it off the page. A single shadow reads as a sticker.
        boxShadow: "0 2px 6px rgba(13,16,23,.06), 0 44px 90px -20px rgba(13,16,23,.28)",
      }}
    >
      <div
        style={{
          height: 46,
          background: S.chip,
          borderBottom: `1px solid ${S.edge}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 18px",
        }}
      >
        {["#e4e8f0", "#e4e8f0", "#e4e8f0"].map((c, n) => (
          <span key={n} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
        ))}
        <span
          style={{
            marginLeft: 14,
            fontSize: 14,
            color: S.dim,
            background: "#fff",
            border: `1px solid ${S.edge}`,
            borderRadius: 999,
            padding: "5px 14px",
          }}
        >
          pulsecommerce.app/{cur.shot}
        </span>
      </div>

      <div style={{ position: "relative", height: 628, overflow: "hidden" }}>
        {prev.shot !== cur.shot ? (
          <Img
            src={staticFile(`shots/${prev.shot}.png`)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              transformOrigin: `${fx}% ${fy}%`,
              transform: `scale(${zoom})`,
              opacity: 1 - swap,
            }}
          />
        ) : null}
        <Img
          src={staticFile(`shots/${cur.shot}.png`)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            transformOrigin: `${fx}% ${fy}%`,
            transform: `scale(${zoom})`,
            opacity: prev.shot !== cur.shot ? swap : 1,
          }}
        />
      </div>
    </div>
  );
}

/** The caption for the current beat, changing under the window. */
function Caption() {
  const frame = useCurrentFrame();
  const { i, local, hold } = beatAt(frame);
  const e = at(local, 4, 20);
  const { title, desc } = TOUR[i];

  return (
    /*
     * A caption in the corner, not a title under a slide.
     *
     * Centred headings beneath the frame were the last thing making each beat
     * look like a card. This sits out of the way, and only the words change.
     */
    <div
      style={{
        position: "absolute",
        left: 76,
        bottom: 92,
        maxWidth: 520,
        opacity: e,
        transform: `translateY(${(1 - e) * 8}px)`,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: S.text }}>
        {title}
      </div>
      <div style={{ marginTop: 4, fontSize: 18, color: S.dim, lineHeight: 1.45 }}>{desc}</div>
    </div>
  );
}

/**
 * A pointer that arrives before each change and rings once.
 *
 * It moves toward the point the camera is pushing at, so the eye is led to the
 * same place the zoom is going.
 */
function Cursor() {
  const frame = useCurrentFrame();
  const { i, local, hold } = beatAt(frame);
  const from = TOUR[Math.max(0, i - 1)].focus;
  const to = TOUR[i].focus;

  const t = at(local, 4, 30);
  // Mapped onto the window's area rather than the whole frame, so it lands on
  // the interface and not on the caption.
  const x = 18 + interpolate(t, [0, 1], [from[0], to[0]]) * 0.64;
  const y = 12 + interpolate(t, [0, 1], [from[1], to[1]]) * 0.62;

  const ring = at(local, 30, 48);
  const press = 1 - at(local, 30, 36) * 0.18 + at(local, 36, 44) * 0.18;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: `${x}%`, top: `${y}%` }}>
        {ring > 0 && ring < 1 ? (
          <span
            style={{
              position: "absolute",
              left: -20,
              top: -20,
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `2px solid ${S.accent}`,
              opacity: 1 - ring,
              transform: `scale(${0.5 + ring * 1.2})`,
            }}
          />
        ) : null}
        <span
          style={{
            position: "absolute",
            left: -8,
            top: -8,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: S.accent,
            boxShadow: "0 2px 10px rgba(13,16,23,.4)",
            transform: `scale(${press})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

/** Opens on the mark, and closes on it. */
function Bookend({ range }: { range: readonly [number, number] }) {
  const frame = useCurrentFrame();
  const [start, end] = range;
  if (frame < start || frame > end) return null;
  const l = frame - start;
  const o = interpolate(l, [0, 16, end - start - 16, end - start], [1, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#fff",
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        fontFamily: font,
      }}
    >
      <img
        src={LOGO}
        alt=""
        style={{
          width: 116,
          height: 116,
          objectFit: "contain",
          filter: "invert(1)",
          opacity: at(l, 0, 18),
          transform: `scale(${0.92 + at(l, 0, 18) * 0.08})`,
        }}
      />
      <div
        style={{
          marginTop: 28,
          fontSize: 60,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          color: S.text,
          opacity: at(l, 10, 30),
        }}
      >
        PulseCommerce
      </div>
      <div style={{ marginTop: 12, fontSize: 26, color: S.dim, opacity: at(l, 20, 40) }}>
        Analytics and WhatsApp for WooCommerce
      </div>
    </AbsoluteFill>
  );
}

export const Promo: React.FC = () => (
  <AbsoluteFill
    style={{
      fontFamily: font,
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      // A hair off pure white, so the frame's shadow has something to fall on.
      background: "#f7f8fb",
    }}
  >
    <Screen />
    <Caption />
    <Cursor />
    <Bookend range={[0, TOUR[0].hold] as const} />
  </AbsoluteFill>
);

export const promoConfig = { fps: FPS, durationInFrames: DURATION };
