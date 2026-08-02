import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FPS, font, theme } from "./theme";

/**
 * The product film.
 *
 * Built from the application's own palette rather than from the poster HTML, so
 * the two cannot drift apart: change the theme and this follows.
 *
 * Every scene is a `Sequence` with its own local frame, which is what keeps the
 * timing readable — a scene animates from its own zero and does not need to know
 * where it sits in the film.
 */

const SCENE = 90; // three seconds each

/** Rise-and-settle, used for anything entering. One easing across the film. */
function useEnter(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 90 } });
}

function Scene({
  children, dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  const frame = useCurrentFrame();

  // Every scene fades out over its last eight frames, so cuts are never hard.
  const out = interpolate(frame, [SCENE - 8, SCENE], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: out,
        fontFamily: font,
        padding: 86,
        justifyContent: "center",
        background: dark
          ? `radial-gradient(820px 640px at 86% -14%, ${theme.brandLight}88, transparent 62%), linear-gradient(155deg, #16295a, #0d1730)`
          : `radial-gradient(760px 580px at 92% -10%, ${theme.brand}22, transparent 62%), ${theme.paper}`,
        color: dark ? theme.paper : theme.ink,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

function Kicker({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  const e = useEnter(2);
  return (
    <div
      style={{
        opacity: e,
        transform: `translateY(${(1 - e) * 14}px)`,
        alignSelf: "flex-start",
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "11px 20px",
        borderRadius: 999,
        marginBottom: 26,
        color: dark ? "#dbe6ff" : theme.brand,
        background: dark ? "rgba(255,255,255,.13)" : `${theme.brand}18`,
        border: `1px solid ${dark ? "rgba(255,255,255,.24)" : `${theme.brand}38`}`,
      }}
    >
      {children}
    </div>
  );
}

function Title({ children, size = 78 }: { children: React.ReactNode; size?: number }) {
  const e = useEnter(6);
  return (
    <h1
      style={{
        opacity: e,
        transform: `translateY(${(1 - e) * 24}px)`,
        fontSize: size,
        lineHeight: 1.03,
        letterSpacing: "-0.035em",
        fontWeight: 800,
        margin: 0,
      }}
    >
      {children}
    </h1>
  );
}

function Lede({ children, delay = 14 }: { children: React.ReactNode; delay?: number }) {
  const e = useEnter(delay);
  return (
    <p
      style={{
        opacity: e,
        transform: `translateY(${(1 - e) * 18}px)`,
        fontSize: 30,
        lineHeight: 1.5,
        marginTop: 26,
        color: "inherit",
      }}
    >
      {children}
    </p>
  );
}

/** A card that drops in on its own beat. Used for every list in the film. */
function Card({
  index, title, sub, accent = false, dark = false,
}: {
  index: number;
  title: string;
  sub?: string;
  accent?: boolean;
  dark?: boolean;
}) {
  const e = useEnter(16 + index * 7);
  return (
    <div
      style={{
        opacity: e,
        transform: `translateY(${(1 - e) * 26}px) scale(${0.97 + e * 0.03})`,
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "22px 26px",
        borderRadius: 22,
        background: accent
          ? `linear-gradient(120deg, ${theme.brand}, ${theme.brandDeep})`
          : dark
            ? "rgba(255,255,255,.07)"
            : theme.paper,
        border: `1px solid ${accent ? "transparent" : dark ? "rgba(255,255,255,.16)" : theme.line}`,
        boxShadow: accent || dark ? "none" : "0 14px 34px rgba(13,16,23,.08)",
        color: accent ? theme.paper : "inherit",
      }}
    >
      <span
        style={{
          flex: "0 0 52px",
          height: 52,
          borderRadius: 15,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 21,
          fontWeight: 800,
          color: theme.paper,
          background: accent
            ? "rgba(255,255,255,.22)"
            : `linear-gradient(140deg, ${theme.brand}, ${theme.brandLight})`,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div>
        <b style={{ display: "block", fontSize: 27, lineHeight: 1.2 }}>{title}</b>
        {sub ? (
          <span
            style={{
              fontSize: 19,
              lineHeight: 1.4,
              color: accent ? "rgba(255,255,255,.85)" : theme.muted,
            }}
          >
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Opening() {
  const e = useEnter(0);
  return (
    <Scene dark>
      <div
        style={{
          opacity: e,
          transform: `scale(${0.92 + e * 0.08})`,
          width: 104,
          height: 104,
          borderRadius: 28,
          background: `linear-gradient(140deg, ${theme.brand}, ${theme.brandLight})`,
          marginBottom: 34,
        }}
      />
      <Title size={104}>PulseCommerce</Title>
      <Lede delay={18}>
        WooCommerce tells you <em>what</em> sold.
        <br />
        This tells you <b>who bought it</b>.
      </Lede>
    </Scene>
  );
}

function Problem() {
  return (
    <Scene>
      <Kicker>The gap</Kicker>
      <Title>
        Reports end where
        <br />
        decisions begin
      </Title>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 34 }}>
        <Card index={0} title="Orders are recorded" sub="Customers are not understood" />
        <Card index={1} title="Segments sit in a spreadsheet" sub="If they exist at all" />
        <Card index={2} title="The list and the message" sub="Live in different tools" />
      </div>
    </Scene>
  );
}

/**
 * The architecture, assembled a part at a time.
 *
 * The most useful three seconds in the film: it is the one idea a viewer cannot
 * get from a screenshot, so each part lands on its own beat rather than all at
 * once.
 */
function Architecture() {
  return (
    <Scene dark>
      <Kicker dark>Architecture</Kicker>
      <Title>Four parts, one product</Title>
      <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 32 }}>
        <Card index={0} dark title="Your WooCommerce store" sub="orders · products · customers" />
        <Card index={1} accent title="PulseCommerce" sub="one cached snapshot → every metric" />
        <Card index={2} dark title="Your own WhatsApp API" sub="your server, your number" />
        <Card index={3} dark title="Groq" sub="counts and names only" />
      </div>
    </Scene>
  );
}

function Intelligence() {
  return (
    <Scene>
      <Kicker>Customer intelligence</Kicker>
      <Title>Know who is worth keeping</Title>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 34 }}>
        <Card index={0} title="RFM segmentation" sub="Ten segments, scored on your own base" />
        <Card index={1} title="Predicted lifetime value" sub="Discounted by churn risk" />
        <Card index={2} title="Churn risk" sub="Against each customer’s own cadence" />
      </div>
    </Scene>
  );
}

/**
 * One step of the flow timeline.
 *
 * Its own component because the enter animation is a hook, and a hook cannot be
 * called from inside a map callback — each step has to be a component for React
 * to keep their state apart.
 */
function Step({
  index, day, text, dimmed,
}: {
  index: number;
  day: string;
  text: string;
  dimmed: boolean;
}) {
  const e = useEnter(16 + index * 8);
  return (
    <div
      style={{
        flex: 1,
        opacity: e * (dimmed ? 0.32 : 1),
        transform: `translateY(${(1 - e) * 24}px)`,
        padding: 26,
        borderRadius: 22,
        background: theme.paper,
        border: `1px solid ${theme.line}`,
        boxShadow: dimmed ? "none" : "0 14px 34px rgba(13,16,23,.08)",
      }}
    >
      <u
        style={{
          textDecoration: "none",
          display: "block",
          fontSize: 22,
          fontWeight: 800,
          color: theme.brand,
          marginBottom: 9,
        }}
      >
        {day}
      </u>
      <span style={{ fontSize: 19, lineHeight: 1.4, color: theme.muted }}>{text}</span>
    </div>
  );
}

/** The flow scene, where the point is what does *not* send. */
function Flow() {
  const frame = useCurrentFrame();
  // Steps two and three grey out once the customer has ordered.
  const ordered = frame > 52;

  return (
    <Scene>
      <Kicker>Automation</Kicker>
      <Title>Campaigns that run themselves</Title>
      <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
        {([
          ["DAY 0", "Reminder naming their product"],
          ["DAY 3", "A code, expiring in a fortnight"],
          ["DAY 10", "Last note before it lapses"],
        ] as const).map(([day, text], i) => (
          <Step key={day} index={i} day={day} text={text} dimmed={ordered && i > 0} />
        ))}
      </div>
      <p
        style={{
          opacity: ordered ? 1 : 0,
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginTop: 30,
          color: theme.brand,
        }}
      >
        They order on day 4 — the rest never send.
      </p>
    </Scene>
  );
}

function Assistant() {
  return (
    <Scene dark>
      <Kicker dark>The assistant</Kicker>
      <Title>Ask the business a question</Title>
      <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 32 }}>
        <Card index={0} dark title="“How did revenue do this month?”" sub="Answered from your own figures" />
        <Card index={1} dark title="“Make a PDF of my top customers”" sub="Generated and downloaded" />
        <Card index={2} accent title="It proposes. You approve." sub="Nothing sends until you say so" />
      </div>
    </Scene>
  );
}

function Closing() {
  const e = useEnter(4);
  return (
    <Scene dark>
      <div
        style={{
          opacity: e,
          transform: `scale(${0.92 + e * 0.08})`,
          width: 96,
          height: 96,
          borderRadius: 26,
          background: `linear-gradient(140deg, ${theme.brand}, ${theme.brandLight})`,
          marginBottom: 32,
        }}
      />
      <Title size={82}>
        Analytics and WhatsApp,
        <br />
        in one place
      </Title>
      <Lede delay={18}>
        <b>setups.works</b>
      </Lede>
    </Scene>
  );
}

const SCENES = [Opening, Problem, Architecture, Intelligence, Flow, Assistant, Closing];

export const DURATION = SCENES.length * SCENE;

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ background: theme.ink }}>
    {SCENES.map((S, i) => (
      <Sequence key={i} from={i * SCENE} durationInFrames={SCENE}>
        <S />
      </Sequence>
    ))}
  </AbsoluteFill>
);

export const promoConfig = { fps: FPS, durationInFrames: DURATION };
