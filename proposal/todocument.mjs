import { marked } from "marked";
import { readFileSync, writeFileSync } from "node:fs";

/*
 * Branded print build of the proposal.
 *
 * The plain markdown-to-PDF path produced a correct document that looked like
 * nothing in particular. This renders the same source against the Setups Works
 * Brand Kit — Brand Blue 500 with its scale, Space Grotesk for display, Inter
 * for body — with a full-bleed blue cover and the logo embedded, so the client
 * receives something that matches the deck rather than a plain manuscript.
 *
 * One source of truth: proposal.md. Nothing here edits content.
 */

const md = readFileSync(new URL("proposal.md", import.meta.url), "utf8");
const logoWhite = readFileSync(new URL("../public/brand/setups-works-white.png", import.meta.url)).toString("base64");
const logoBlack = readFileSync(new URL("../public/brand/setups-works-black.png", import.meta.url)).toString("base64");

/*
 * The first block of the source is a cover: the client name, their site, and who
 * prepared it. It becomes the blue cover page rather than body copy, so it is
 * lifted out before the rest is rendered.
 */
const parts = md.split(/^---$/m);
const body = parts.slice(1).join("---").trim();

// The signature block is HTML already and carries a remote logo; the print build
// uses the embedded one so the PDF has no external dependency.
const rendered = marked
  .parse(body, { mangle: false, headerIds: false })
  .replace(/<img[^>]*crm\.setups\.works[^>]*>/g, `<img class="sig-logo" src="data:image/png;base64,${logoBlack}" alt="Setups Works">`);

const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>PulseCommerce — Proposal for Nature's Joy</title>
<style>
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap");

  :root {
    --brand-50:#eff4ff; --brand-100:#dbe6ff; --brand-500:#4d86f7;
    --brand-600:#2f66e8; --brand-900:#243d85;
    --ink:#0a0b0f; --paper:#ffffff; --panel:#f5f7fb; --hair:#e4e8f0; --muted:#5b6472;
    --display:"Space Grotesk","Futura",system-ui,sans-serif;
    --body:"Inter",-apple-system,"Segoe UI",system-ui,sans-serif;
  }

  @page { size: A4; margin: 20mm 18mm 18mm; }
  @page :first { margin: 0; }

  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:var(--body); color:var(--ink); font-size:10.5pt; line-height:1.62; }

  /* --- Cover ------------------------------------------------------------ */
  .cover {
    background:linear-gradient(135deg,var(--brand-500) 0%,var(--brand-600) 52%,var(--brand-900) 100%);
    color:#fff; height:297mm; width:210mm; padding:26mm 22mm;
    display:flex; flex-direction:column; page-break-after:always;
  }
  .cover img { height:16mm; align-self:flex-start; }
  .cover .spacer { flex:1; }
  .cover .kicker { font-size:9.5pt; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; opacity:.85; margin-bottom:5mm; }
  .cover h1 {
    font-family:var(--display); font-size:34pt; line-height:1.03; letter-spacing:-0.03em;
    font-weight:700; color:#fff; border:none; padding:0; margin:0;
    page-break-before:auto;
  }
  .cover .sub { font-size:13pt; line-height:1.5; opacity:.92; margin-top:6mm; max-width:135mm; }
  .cover .meta { font-size:9.5pt; opacity:.8; line-height:1.8; }
  .cover .divider { height:2px; background:rgba(255,255,255,.5); width:26mm; margin:7mm 0; }

  /* --- Body -------------------------------------------------------------- */
  h1 {
    font-family:var(--display); font-size:20pt; font-weight:700; letter-spacing:-0.02em;
    color:var(--ink); margin:0 0 4mm; padding-bottom:3mm;
    border-bottom:2.5px solid var(--brand-500);
    page-break-after:avoid; page-break-before:always;
  }
  h1:first-of-type { page-break-before:avoid; }
  h2 { font-family:var(--display); font-size:13pt; font-weight:700; letter-spacing:-0.01em;
       margin:7mm 0 2.5mm; color:var(--ink); page-break-after:avoid; }
  h3 { font-family:var(--display); font-size:11pt; font-weight:700; margin:5mm 0 2mm; page-break-after:avoid; }

  p { margin:0 0 3mm; }
  strong { font-weight:600; color:var(--ink); }
  a { color:var(--brand-600); text-decoration:none; }

  ul, ol { margin:0 0 3.5mm; padding-left:5mm; }
  li { margin-bottom:1.5mm; color:#2b3038; }
  li::marker { color:var(--brand-500); }

  table { border-collapse:collapse; width:100%; margin:3mm 0 5mm; font-size:9.5pt; page-break-inside:avoid; }
  th { text-align:left; font-family:var(--display); font-weight:700; font-size:9.5pt;
       background:var(--brand-50); border-bottom:2px solid var(--brand-500); padding:2.4mm 3mm; }
  td { border-bottom:1px solid var(--hair); padding:2.4mm 3mm; color:#2b3038; vertical-align:top; }

  blockquote { margin:4mm 0; padding:3mm 4mm; background:var(--brand-50);
               border-left:3px solid var(--brand-500); font-size:9.5pt; color:#2b3038; }
  blockquote p:last-child { margin-bottom:0; }

  code { font-family:"JetBrains Mono",ui-monospace,Menlo,monospace; font-size:9pt;
         background:var(--panel); padding:0.4mm 1.2mm; border-radius:2px; }

  hr { border:0; border-top:1px solid var(--hair); margin:6mm 0; }

  /* The closing signature block. */
  div[style*="text-align:center"] { margin-top:10mm !important; text-align:center; page-break-inside:avoid; }
  .sig-logo { height:11mm; margin-bottom:3mm; }
</style></head>
<body>

<section class="cover">
  <img src="data:image/png;base64,${logoWhite}" alt="Setups Works">
  <div class="spacer"></div>
  <div class="kicker">Proposal · Nature's Joy Herbal Cosmetics</div>
  <h1>PulseCommerce</h1>
  <div class="divider"></div>
  <p class="sub">Customer intelligence and WhatsApp campaigns for your WooCommerce
  store — built on infrastructure you own, with no per-message fees.</p>
  <div class="spacer"></div>
  <div class="meta">
    Prepared by Nitheesh Rajendran, Setups Works<br>
    setups.works · ${today}
  </div>
</section>

${rendered}

</body></html>`;

writeFileSync(new URL("proposal-document.html", import.meta.url), html);
console.log("wrote proposal-document.html");
