import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { LOGO } from "./logo";
import { FPS, font } from "./theme";

/**
 * The product, working.
 *
 * Not a feature list read aloud: one continuous demonstration. An audience is
 * filtered down, a message is written against a real product, it is sent, it
 * lands on a phone, the customer replies, and the reply comes back beside who
 * they are. That sequence is the product; everything else serves it.
 *
 * Solid fills only — no gradients, no blur. The palette is flat because the
 * blurred version could not be rendered: three large blurred layers made each
 * frame slow enough that the renderer timed out seeking. Flat also reads more
 * like software and less like a poster.
 */

const T = {
  open: [0, 70],
  audience: [70, 230],
  compose: [230, 390],
  send: [390, 530],
  reply: [530, 670],
  inbox: [670, 800],
  close: [800, 880],
} as const;

export const DURATION = 880;

/**
 * Solid fills, in the product's own blue.
 *
 * Colour returns as flat surfaces rather than gradients or blur: two renders
 * died with seek-to-frame timeouts on large blurred layers, so depth here comes
 * from stacked opaque shapes and never from a filter.
 */
const S = {
  bg: "#080b14",
  panel: "#111827",
  edge: "#1f2b45",
  chip: "#16203a",
  text: "#f4f6fb",
  dim: "#94a1bd",
  /** --primary, light mode: oklch(0.552 0.206 263.7) */
  accent: "#2f66e8",
  /** --primary, dark mode: oklch(0.639 0.179 262.4) */
  accentSoft: "#4d86f7",
};

function at(frame: number, from: number, to: number, easing = Easing.out(Easing.cubic)) {
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

function Stage({
  range, children,
}: {
  range: readonly [number, number];
  children: (local: number) => React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const [start, end] = range;
  const opacity = interpolate(frame, [start, start + 12, end - 12, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < start - 12 || frame > end + 12) return null;

  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font,
        color: S.text,
        padding: 92,
      }}
    >
      {children(frame - start)}
    </AbsoluteFill>
  );
}

/** The app window everything happens inside. */
function Window({ children, title, width = 880 }: { children: React.ReactNode; title: string; width?: number }) {
  return (
    <div style={{ width, borderRadius: 20, background: S.panel, border: `1px solid ${S.edge}`, overflow: "hidden" }}>
      <div style={{ height: 56, background: S.chip, borderBottom: `2px solid ${S.accent}`, display: "flex", alignItems: "center", gap: 13, padding: "0 22px" }}>
        <img src={LOGO} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
        <span style={{ fontSize: 18, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ padding: 26 }}>{children}</div>
    </div>
  );
}

function Caption({ text, local, delay }: { text: string; local: number; delay: number }) {
  const e = at(local, delay, delay + 16);
  return (
    <div style={{ marginTop: 28, fontSize: 31, fontWeight: 600, textAlign: "center", maxWidth: 840, opacity: e, transform: `translateY(${(1 - e) * 12}px)` }}>
      {text}
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 330, height: 640, flex: "0 0 330px", borderRadius: 40, background: S.panel, border: `8px solid ${S.edge}`, padding: 20, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 11 }}>
      {children}
    </div>
  );
}

function Bubble({ side, show, children }: { side: "in" | "out"; show: number; children: React.ReactNode }) {
  return (
    <div style={{
      alignSelf: side === "out" ? "flex-end" : "flex-start",
      maxWidth: "86%", padding: "13px 17px", borderRadius: 18,
      borderBottomRightRadius: side === "out" ? 5 : 18,
      borderBottomLeftRadius: side === "in" ? 5 : 18,
      background: side === "out" ? S.accent : S.chip,
      color: side === "out" ? "#fff" : S.text,
      fontSize: 18, lineHeight: 1.42, opacity: show,
      transform: `translateY(${(1 - show) * 20}px)`,
    }}>
      {children}
    </div>
  );
}

function Open() {
  return (
    <Stage range={T.open}>
      {(l) => (
        <div style={{ textAlign: "center" }}>
          <img src={LOGO} alt="" style={{ width: 128, height: 128, objectFit: "contain", opacity: at(l, 0, 24), transform: `scale(${0.9 + at(l, 0, 24) * 0.1})` }} />
          <div style={{ marginTop: 32, fontSize: 78, fontWeight: 800, letterSpacing: "-0.04em", opacity: at(l, 12, 34) }}>PulseCommerce</div>
          <div style={{ marginTop: 14, fontSize: 29, color: S.dim, opacity: at(l, 24, 46) }}>Find the customer. Write the message. Send it.</div>
        </div>
      )}
    </Stage>
  );
}

/** Filters apply and the audience falls to the people who matter. */
function Audience() {
  const filters = ["At risk", "Ordered before", "Has WhatsApp"];
  return (
    <Stage range={T.audience}>
      {(l) => {
        const n = Math.round(interpolate(at(l, 44, 92), [0, 1], [4820, 214]));
        return (
          <>
            <Window title="Campaigns">
              <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
                {filters.map((f, i) => {
                  const on = at(l, 16 + i * 12, 30 + i * 12);
                  return (
                    <span key={f} style={{ fontSize: 18, fontWeight: 600, padding: "10px 17px", borderRadius: 999, background: on > 0.5 ? S.accent : S.chip, color: on > 0.5 ? "#fff" : S.dim, border: `1px solid ${S.edge}`, opacity: at(l, 10 + i * 12, 24 + i * 12) }}>{f}</span>
                  );
                })}
              </div>
              <div style={{ padding: "24px 22px", borderRadius: 14, background: S.chip, border: `1px solid ${S.edge}`, display: "flex", alignItems: "baseline", gap: 15 }}>
                <span style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>{n.toLocaleString()}</span>
                <span style={{ fontSize: 23, color: S.dim }}>customers reachable on WhatsApp</span>
              </div>
            </Window>
            <Caption text="Filter to the customers who are slipping away." local={l} delay={98} />
          </>
        );
      }}
    </Stage>
  );
}

/** The message types itself; the product is attached from the catalogue. */
function Compose() {
  const body = "Hi Priya, your Rose Clay is running low. Reorder here:";
  return (
    <Stage range={T.compose}>
      {(l) => {
        const typed = Math.floor(at(l, 18, 96, Easing.linear) * body.length);
        const p = at(l, 100, 120);
        return (
          <>
            <Window title="Compose">
              <div style={{ minHeight: 126, padding: 21, borderRadius: 14, background: S.chip, border: `1px solid ${S.edge}`, fontSize: 26, lineHeight: 1.5 }}>
                {body.slice(0, typed)}
                <span style={{ opacity: Math.round(l / 7) % 2 ? 1 : 0 }}>|</span>
              </div>
              <div style={{ marginTop: 15, display: "flex", alignItems: "center", gap: 17, padding: 17, borderRadius: 14, background: S.chip, border: `1px solid ${S.edge}`, opacity: p, transform: `translateY(${(1 - p) * 15}px)` }}>
                <div style={{ width: 58, height: 58, borderRadius: 11, background: S.edge }} />
                <div>
                  <b style={{ display: "block", fontSize: 23 }}>Rose Clay Powder</b>
                  <span style={{ fontSize: 18, color: S.dim }}>photo and buy link, from your catalogue</span>
                </div>
              </div>
            </Window>
            <Caption text="The product, its photo and its link — taken from your store." local={l} delay={124} />
          </>
        );
      }}
    </Stage>
  );
}

/** The send fills, and the message lands on the phone. */
function Send() {
  return (
    <Stage range={T.send}>
      {(l) => {
        const p = at(l, 14, 76, Easing.inOut(Easing.cubic));
        const landed = at(l, 74, 94);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 52 }}>
            <Window title="Sending" width={520}>
              <div style={{ fontSize: 25, marginBottom: 17, color: S.dim }}>Sending to {Math.round(p * 214)} of 214</div>
              <div style={{ height: 13, borderRadius: 999, background: S.chip }}>
                <div style={{ height: 13, width: `${p * 100}%`, borderRadius: 999, background: S.accent }} />
              </div>
              <div style={{ marginTop: 19, fontSize: 19, color: S.dim }}>Paced deliberately · opt-outs excluded · resumable</div>
            </Window>
            <Phone>
              <Bubble side="out" show={landed}>Hi Priya, your Rose Clay is running low. Reorder here: your-store.com/rose-clay</Bubble>
            </Phone>
          </div>
        );
      }}
    </Stage>
  );
}

/** The customer replies — the half most tools cannot show. */
function Reply() {
  return (
    <Stage range={T.reply}>
      {(l) => {
        const typing = at(l, 16, 28) - at(l, 56, 64);
        const r = at(l, 64, 82);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 52 }}>
            <Phone>
              <Bubble side="out" show={1}>Hi Priya, your Rose Clay is running low. Reorder here:</Bubble>
              {typing > 0.05 ? (
                <div style={{ alignSelf: "flex-start", padding: "15px 19px", borderRadius: 18, background: S.chip, opacity: typing, display: "flex", gap: 7 }}>
                  {[0, 1, 2].map((d) => (
                    <span key={d} style={{ width: 9, height: 9, borderRadius: "50%", background: S.dim, opacity: 0.35 + 0.65 * Math.abs(Math.sin((l - d * 4) / 6)) }} />
                  ))}
                </div>
              ) : null}
              <Bubble side="in" show={r}>Yes please — can you send two?</Bubble>
            </Phone>
            <div style={{ maxWidth: 420 }}>
              <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", opacity: r }}>They reply.</div>
              <div style={{ marginTop: 15, fontSize: 26, color: S.dim, opacity: at(l, 76, 94) }}>And it comes back to you, not into a void.</div>
            </div>
          </div>
        );
      }}
    </Stage>
  );
}

/** The reply arrives beside who the customer actually is. */
function Inbox() {
  return (
    <Stage range={T.inbox}>
      {(l) => {
        const a = at(l, 12, 28);
        const b = at(l, 30, 46);
        return (
          <>
            <Window title="Inbox">
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px", borderRadius: 12, background: S.chip, border: `1px solid ${S.edge}`, opacity: a, transform: `translateY(${(1 - a) * 14}px)` }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: S.edge }} />
                <div style={{ flex: 1 }}>
                  <b style={{ display: "block", fontSize: 23 }}>Priya R.</b>
                  <span style={{ fontSize: 19, color: S.dim }}>“Yes please — can you send two?”</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <b style={{ display: "block", fontSize: 21 }}>11 orders</b>
                  <span style={{ fontSize: 18, color: S.dim }}>lifetime value</span>
                </div>
              </div>
              <div style={{ marginTop: 11, padding: "16px 18px", borderRadius: 12, background: S.chip, border: `1px solid ${S.edge}`, fontSize: 20, color: S.dim, opacity: b, transform: `translateY(${(1 - b) * 14}px)` }}>
                Champion · last ordered 41 days ago · reachable
              </div>
            </Window>
            <Caption text="Answering a customer is different when you know they have ordered eleven times." local={l} delay={54} />
          </>
        );
      }}
    </Stage>
  );
}

function Close() {
  return (
    <Stage range={T.close}>
      {(l) => (
        <div style={{ textAlign: "center" }}>
          <img src={LOGO} alt="" style={{ width: 88, height: 88, objectFit: "contain", opacity: at(l, 0, 20) }} />
          <div style={{ marginTop: 28, fontSize: 54, fontWeight: 800, letterSpacing: "-0.035em", opacity: at(l, 10, 32) }}>Analytics and WhatsApp, in one place</div>
          <div style={{ marginTop: 20, fontSize: 31, color: S.dim, opacity: at(l, 24, 46) }}>setups.works</div>
        </div>
      )}
    </Stage>
  );
}

/** A steady line, so a held beat reads as deliberate rather than stalled. */
function Progress() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 92, right: 92, bottom: 58 }}>
        <div style={{ height: 2, background: S.edge }}>
          <div style={{ height: 2, width: `${(frame / DURATION) * 100}%`, background: S.accent }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  // One slow push across the whole film, so nothing sits perfectly still.
  const scale = interpolate(frame, [0, DURATION], [1, 1.05]);
  return (
    <AbsoluteFill style={{ background: S.bg }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Open />
        <Audience />
        <Compose />
        <Send />
        <Reply />
        <Inbox />
        <Close />
      </AbsoluteFill>
      <Progress />
    </AbsoluteFill>
  );
};

export const promoConfig = { fps: FPS, durationInFrames: DURATION };
