import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/marketing/schema";

/**
 * The social card, generated rather than checked in.
 *
 * A PNG in /public goes stale the moment the positioning changes and nobody
 * notices, because the one place it appears is somebody else's timeline.
 * Generating it from the same constants as the page means it cannot.
 *
 * ImageResponse runs on Satori, which supports flexbox and a subset of CSS —
 * no grid, no CSS variables, no Tailwind. Hence the literal hex values below:
 * they are the resolved dark-theme tokens from globals.css. If those change,
 * change these.
 */

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* The brand wash, as a positioned blurred disc. Satori has no filter
            support, so the softness comes from a radial gradient instead. */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: 340,
            width: 900,
            height: 900,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(47,102,232,0.30) 0%, rgba(47,102,232,0.10) 45%, rgba(10,10,10,0) 70%)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#2f66e8",
              color: "#ffffff",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            P
          </div>
          <div style={{ display: "flex", color: "#fafafa", fontSize: 30, fontWeight: 600 }}>
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "#fafafa",
              fontSize: 68,
              fontWeight: 600,
              letterSpacing: -2,
              lineHeight: 1.1,
            }}
          >
            Know who buys.
          </div>
          <div
            style={{
              display: "flex",
              color: "#8f8f8f",
              fontSize: 68,
              fontWeight: 600,
              letterSpacing: -2,
              lineHeight: 1.1,
            }}
          >
            Win them back on WhatsApp.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {["13 analytics modules", "AI commerce agent", "Read-only access"].map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  width: 8,
                  height: 8,
                  borderRadius: 9999,
                  background: "#2f66e8",
                }}
              />
              <div style={{ display: "flex", color: "#a3a3a3", fontSize: 24 }}>{item}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
