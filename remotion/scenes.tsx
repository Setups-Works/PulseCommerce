import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { LOGO } from "./logo";
import { font } from "./theme";

/**
 * The vocabulary the film is built from.
 *
 * Every beat is the same window on the same background, so the film reads as
 * one session with a product rather than a sequence of unrelated cards. Solid
 * fills only — two earlier renders died with seek-to-frame timeouts on large
 * blurred layers, and that constraint outlives any palette change.
 */

export const S = {
  bg: "#ffffff",
  panel: "#ffffff",
  edge: "#e3e9f3",
  chip: "#f4f7fc",
  text: "#0d1017",
  dim: "#5f6a7d",
  /** --primary, light mode: oklch(0.552 0.206 263.7) */
  accent: "#2f66e8",
  /** --primary, dark mode: oklch(0.639 0.179 262.4) */
  accentSoft: "#4d86f7",
  good: "#3fb27f",
  warn: "#e0a33e",
};

export function at(frame: number, from: number, to: number, easing = Easing.out(Easing.cubic)) {
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

/**
 * A beat.
 *
 * Holds for its window, then hands over. `zoom` pushes in on the panel over the
 * beat's life, which keeps a twelve-second hold from feeling static without a
 * cut.
 */
export function Beat({
  range, children, zoom = 0.03,
}: {
  range: readonly [number, number];
  children: (local: number) => React.ReactNode;
  zoom?: number;
}) {
  const frame = useCurrentFrame();
  const [start, end] = range;
  const opacity = interpolate(frame, [start, start + 14, end - 14, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < start - 14 || frame > end + 14) return null;

  const local = frame - start;
  const scale = 1 + (local / (end - start)) * zoom;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font,
        color: S.text,
        // Clear of the heading above and the progress line below.
        padding: "184px 92px 116px",
        transform: `scale(${scale})`,
      }}
    >
      {children(local)}
    </div>
  );
}

export function Window({
  children, title, width = 890,
}: {
  children: React.ReactNode;
  title: string;
  width?: number;
}) {
  return (
    <div
      style={{
        width,
        borderRadius: 20,
        background: S.panel,
        border: `1px solid ${S.edge}`,
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(13,16,23,.10)",
      }}
    >
      <div
        style={{
          height: 56,
          background: S.chip,
          borderBottom: `2px solid ${S.accent}`,
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "0 22px",
        }}
      >
        <img src={LOGO} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
        <span style={{ fontSize: 18, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ padding: 26 }}>{children}</div>
    </div>
  );
}

export function Caption({ text, local, delay }: { text: string; local: number; delay: number }) {
  const e = at(local, delay, delay + 18);
  return (
    <div
      style={{
        marginTop: 26,
        fontSize: 30,
        fontWeight: 600,
        textAlign: "center",
        maxWidth: 860,
        opacity: e,
        transform: `translateY(${(1 - e) * 12}px)`,
      }}
    >
      {text}
    </div>
  );
}

/** A number that counts to its value, so a figure is watched rather than read. */
export function Counter({
  to, local, from = 0, start = 10, span = 60, prefix = "", size = 56,
}: {
  to: number;
  local: number;
  from?: number;
  start?: number;
  span?: number;
  prefix?: string;
  size?: number;
}) {
  const v = Math.round(interpolate(at(local, start, start + span), [0, 1], [from, to]));
  return (
    <span style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {v.toLocaleString("en-IN")}
    </span>
  );
}

export function Tile({
  label, children, local, delay,
}: {
  label: string;
  children: React.ReactNode;
  local: number;
  delay: number;
}) {
  const e = at(local, delay, delay + 16);
  return (
    <div
      style={{
        flex: 1,
        padding: "20px 22px",
        borderRadius: 14,
        background: S.chip,
        border: `1px solid ${S.edge}`,
        opacity: e,
        transform: `translateY(${(1 - e) * 16}px)`,
      }}
    >
      <div style={{ fontSize: 17, color: S.dim, marginBottom: 8, letterSpacing: "0.04em" }}>{label}</div>
      {children}
    </div>
  );
}

export function Bar({
  label, value, local, delay, colour = S.accent,
}: {
  label: string;
  value: number;
  local: number;
  delay: number;
  colour?: string;
}) {
  const g = at(local, delay, delay + 34);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 13 }}>
      <span style={{ width: 220, fontSize: 20, color: S.dim }}>{label}</span>
      <span style={{ height: 22, borderRadius: 999, width: `${g * value * 100}%`, background: colour }} />
    </div>
  );
}

export function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 330,
        height: 620,
        flex: "0 0 330px",
        borderRadius: 40,
        background: S.chip,
        border: `8px solid ${S.edge}`,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: 11,
      }}
    >
      {children}
    </div>
  );
}

export function Bubble({
  side, show, children,
}: {
  side: "in" | "out";
  show: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        alignSelf: side === "out" ? "flex-end" : "flex-start",
        maxWidth: "86%",
        padding: "13px 17px",
        borderRadius: 18,
        borderBottomRightRadius: side === "out" ? 5 : 18,
        borderBottomLeftRadius: side === "in" ? 5 : 18,
        background: side === "out" ? S.accent : S.chip,
        color: side === "out" ? "#fff" : S.text,
        fontSize: 18,
        lineHeight: 1.42,
        opacity: show,
        transform: `translateY(${(1 - show) * 20}px)`,
      }}
    >
      {children}
    </div>
  );
}

/** Text that types itself, with a caret that blinks while it does. */
export function Typed({
  text, local, start, span, size = 25,
}: {
  text: string;
  local: number;
  start: number;
  span: number;
  size?: number;
}) {
  const n = Math.floor(at(local, start, start + span, Easing.linear) * text.length);
  const done = n >= text.length;
  return (
    <span style={{ fontSize: size, lineHeight: 1.5 }}>
      {text.slice(0, n)}
      <span style={{ opacity: done ? 0 : Math.round(local / 7) % 2 }}>|</span>
    </span>
  );
}

export function Panel({
  children, local, delay, pad = 20,
}: {
  children: React.ReactNode;
  local: number;
  delay: number;
  pad?: number;
}) {
  const e = at(local, delay, delay + 16);
  return (
    <div
      style={{
        padding: pad,
        borderRadius: 14,
        background: S.chip,
        border: `1px solid ${S.edge}`,
        opacity: e,
        transform: `translateY(${(1 - e) * 14}px)`,
      }}
    >
      {children}
    </div>
  );
}
