#!/usr/bin/env node
/**
 * Renders README.md into a branded "Developer Guide" PDF.
 *
 * Not part of the build or CI — a one-off (or occasionally re-run) doc export.
 * Reuses the same Geist font already embedded for the app's own PDF reports
 * (src/lib/export/fonts/*) so the guide matches the product's own typography,
 * and renders every mermaid diagram for real in a headless browser rather
 * than shipping the raw diagram source as a code block.
 *
 * Usage: node scripts/build-developer-guide-pdf.mjs [output-path]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { chromium } from "@playwright/test";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = resolve(process.argv[2] || join(ROOT, "PulseCommerce-Developer-Guide.pdf"));

function extractBase64(file, constName) {
  const src = readFileSync(join(ROOT, file), "utf8");
  const match = src.match(new RegExp(`${constName}\\s*=\\s*\\n?\\s*"([^"]+)"`));
  if (!match) throw new Error(`Could not find ${constName} in ${file}`);
  return match[1];
}

function slugify(text, seen) {
  let slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
  const base = slug;
  let n = 1;
  while (seen.has(slug)) slug = `${base}-${n++}`;
  seen.add(slug);
  return slug;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function dataUri(file, mime) {
  return `data:${mime};base64,${readFileSync(join(ROOT, file)).toString("base64")}`;
}

async function main() {
  let readme = readFileSync(join(ROOT, "README.md"), "utf8");
  const logo = readFileSync(join(ROOT, "public/logo.svg"), "utf8");
  const geistRegular = extractBase64("src/lib/export/fonts/geist-regular.ts", "GEIST_REGULAR_BASE64");
  const geistSemibold = extractBase64("src/lib/export/fonts/geist-semibold.ts", "GEIST_SEMIBOLD_BASE64");
  const mermaidSrc = readFileSync(
    join(ROOT, "node_modules/mermaid/dist/mermaid.min.js"),
    "utf8",
  );
  const setupsWorksWhite = dataUri("public/brand/setups-works-white.png", "image/png");
  const setupsWorksBlack = dataUri("public/brand/setups-works-black.png", "image/png");

  // The README opens with a raw-HTML banner (logo picture + shields.io
  // badges) built for GitHub's renderer — relative image paths and remote
  // badge fetches that don't belong in a standalone PDF. The custom cover
  // page below replaces it, so drop everything before the first real
  // section heading instead of trying to make GitHub's markup work here.
  const firstHeading = readme.indexOf("\n## ");
  if (firstHeading !== -1) readme = readme.slice(firstHeading + 1);

  // Same reasoning for the hand-written table of contents: a custom TOC page
  // with real anchors replaces it, so the source list would just be a second,
  // redundant one sitting in the middle of the content.
  readme = readme.replace(/## Table of contents\n[\s\S]*?\n---\n\n/, "");

  // The closing "Built by Setups Works" credit block references
  // public/brand/*.png by a relative path that only resolves on GitHub —
  // swapped for the embedded data URIs so it renders standalone.
  readme = readme
    .replaceAll("public/brand/setups-works-white.png", setupsWorksWhite)
    .replaceAll("public/brand/setups-works-black.png", setupsWorksBlack);

  const seenSlugs = new Set();
  let mermaidCount = 0;

  marked.use({
    renderer: {
      heading(token) {
        const text = this.parser.parseInline(token.tokens);
        const plain = token.text;
        const id = slugify(plain, seenSlugs);
        return `<h${token.depth} id="${id}">${text}</h${token.depth}>`;
      },
      code(token) {
        if (token.lang === "mermaid") {
          mermaidCount += 1;
          return `<pre class="mermaid">${escapeHtml(token.text)}</pre>`;
        }
        const cls = token.lang ? ` class="language-${escapeHtml(token.lang)}"` : "";
        return `<pre><code${cls}>${escapeHtml(token.text)}</code></pre>`;
      },
    },
  });

  // The TOC's own links already point at GitHub-slug anchors; the heading
  // renderer above reproduces that exact algorithm so they still resolve.
  const bodyHtml = marked.parse(readme);

  const generatedOn = new Date().toISOString().slice(0, 10);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>PulseCommerce — Developer Guide</title>
<style>
  @font-face {
    font-family: "Geist";
    src: url(data:font/ttf;base64,${geistRegular}) format("truetype");
    font-weight: 400;
  }
  @font-face {
    font-family: "Geist";
    src: url(data:font/ttf;base64,${geistSemibold}) format("truetype");
    font-weight: 600;
  }

  :root {
    --ink: #18181b;
    --muted: #6b7280;
    --line: #e4e4e7;
    --brand: #2f66e8;
    --brand-dark: #0b0b0b;
    --code-bg: #f4f4f5;
  }

  * { box-sizing: border-box; }

  body {
    font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
    color: var(--ink);
    font-size: 10.5pt;
    line-height: 1.55;
    margin: 0;
  }

  /* ── Cover page ─────────────────────────────────────────────────────── */
  .cover {
    /* A4 is 297mm; page.pdf() below applies 16mm top+bottom margins around
       the printable area, leaving ~265mm — sized under that so the last row
       (the "Built by" credit) doesn't spill onto its own near-blank page. */
    height: 260mm;
    background: var(--brand-dark);
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 0 22mm;
    page-break-after: always;
  }
  .cover .logo { width: 64px; height: 64px; margin-bottom: 28px; }
  .cover h1 {
    color: #fff;
    font-size: 40pt;
    font-weight: 600;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
  }
  .cover .tagline {
    font-size: 15pt;
    color: #a1a1aa;
    margin: 0 0 46px;
    font-weight: 400;
    max-width: 130mm;
  }
  .cover .kicker {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 9pt;
    color: var(--brand);
    font-weight: 600;
    margin-bottom: 10px;
  }
  .cover .meta {
    border-top: 1px solid #3f3f46;
    padding-top: 18px;
    margin-top: auto;
    margin-bottom: 8mm;
    font-size: 9.5pt;
    color: #a1a1aa;
    display: flex;
    gap: 28px;
  }
  .cover .meta strong { color: #fff; display: block; font-weight: 600; }
  .cover .built-by {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 9pt;
    color: #71717a;
  }
  .cover .built-by img { display: block; opacity: 0.92; }

  /* ── Table of contents ──────────────────────────────────────────────── */
  .toc-page { page-break-after: always; }
  .toc-page h2 {
    font-size: 20pt;
    border: none;
    margin: 0 0 18px;
  }
  .toc-list { list-style: none; margin: 0; padding: 0; columns: 1; }
  .toc-list li { margin: 0 0 9px; }
  .toc-list a {
    color: var(--ink);
    text-decoration: none;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px dotted var(--line);
    padding-bottom: 3px;
  }
  .toc-list a::after { content: "→"; color: var(--brand); font-size: 8pt; margin-left: 8px; }

  /* ── Body content ───────────────────────────────────────────────────── */
  .content { padding: 0; }
  .content > h1:first-child { display: none; } /* the H1 is the cover title */

  h1, h2, h3, h4 { font-weight: 600; letter-spacing: -0.01em; color: var(--ink); }
  h2 {
    font-size: 16pt;
    margin: 0 0 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--brand-dark);
    page-break-before: always;
  }
  h2:first-of-type { page-break-before: avoid; }
  h3 { font-size: 12.5pt; margin: 22px 0 8px; }
  h4 { font-size: 11pt; margin: 16px 0 6px; }
  p, ul, ol, table { margin: 0 0 10px; }
  ul, ol { padding-left: 20px; }
  li { margin-bottom: 3px; }
  a { color: var(--brand); }
  hr { border: none; border-top: 1px solid var(--line); margin: 18px 0; }
  strong { font-weight: 600; }

  blockquote {
    margin: 0 0 10px;
    padding: 6px 14px;
    border-left: 3px solid var(--brand);
    background: #f4f6ff;
    color: #3f3f46;
  }

  code {
    font-family: "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace;
    font-size: 8.6pt;
    background: var(--code-bg);
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre {
    background: var(--code-bg);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 10px 12px;
    overflow: hidden;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0 0 12px;
  }
  pre code { background: none; padding: 0; font-size: 8.4pt; }

  pre.mermaid {
    background: #fff;
    border: none;
    text-align: center;
    padding: 14px 8px;
    overflow: visible;
    page-break-inside: avoid;
  }
  /* mermaid sets an inline style="max-width: <n>px" on every diagram it
     renders, sized to the diagram's natural width — inline style always
     beats an external rule of equal-or-lesser specificity, so without
     !important this never actually constrains a diagram wider than the
     page and it overflows the right margin instead of scaling down.

     max-height matters just as much: "page-break-inside: avoid" below can
     only push a too-tall diagram onto its own page, never shrink it — for
     anything taller than one page it still doesn't fit there either, so the
     browser gives up on "avoid" and splits it mid-box instead, which is
     worse than the blank page it was meant to prevent. Capping height too
     (960px ~= this page's ~265mm usable height at 96dpi) forces the same
     proportional scale-down for height that max-width already does for
     width, so the whole diagram is guaranteed to actually fit. */
  pre.mermaid svg {
    max-width: 100% !important;
    max-height: 960px !important;
    width: auto !important;
    height: auto !important;
  }

  table { border-collapse: collapse; width: 100%; font-size: 9pt; }
  th, td { border: 1px solid var(--line); padding: 5px 8px; text-align: left; }
  th { background: var(--code-bg); font-weight: 600; }

  img { max-width: 100%; }

  section.setup-callout {
    background: #f4f6ff;
    border: 1px solid #c7d7ff;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 0 0 16px;
    font-size: 9.5pt;
  }
  section.setup-callout strong { color: var(--brand); }

  div[align="center"] { text-align: center; }
  div[align="center"] picture img { display: inline-block; margin: 8px 0; }
  sub { display: block; color: var(--muted); font-size: 8.5pt; margin-top: 4px; }
</style>
</head>
<body>

  <div class="cover">
    ${logo.replace("<svg", '<svg class="logo"')}
    <div class="kicker">Developer Guide</div>
    <h1>PulseCommerce</h1>
    <p class="tagline">Self-hosted WooCommerce analytics and WhatsApp campaigns —
    architecture, data pipelines, setup, and everything self-hosting the
    WhatsApp gateway involves.</p>
    <div class="meta">
      <div><strong>Generated</strong>${generatedOn}</div>
      <div><strong>Source</strong>github.com/nitheeshdr/PulseCommerce</div>
      <div><strong>License</strong>MIT</div>
    </div>
    <div class="built-by">
      <span>Built by</span>
      <img src="${setupsWorksWhite}" alt="Setups Works" height="26" />
    </div>
  </div>

  <div class="toc-page">
    <h2>Contents</h2>
    <ul class="toc-list">
      ${[
        "Setup &amp; quick start|quick-start",
        "Connecting a store|connecting-a-store",
        "Environment variables|environment-variables",
        "Architecture|architecture",
        "Data pipeline|data-pipeline",
        "Broadcast pipeline|broadcast-pipeline",
        "Flow pipeline|flow-pipeline",
        "Assistant pipeline|assistant-pipeline",
        "Inbound pipeline|inbound-pipeline",
        "WhatsApp campaigns (self-hosting the gateway)|whatsapp-campaigns",
        "Automated flows|automated-flows",
        "Abandoned checkout recovery|abandoned-checkout-recovery",
        "Gateway plugins and the menu bot|gateway-plugins-and-the-menu-bot",
        "The assistant|the-assistant",
        "Deployment|deployment",
        "Troubleshooting|troubleshooting",
        "Scripts &amp; tests|scripts",
      ]
        .map((row) => {
          const [label, id] = row.split("|");
          return `<li><a href="#${id}">${label}</a></li>`;
        })
        .join("\n      ")}
    </ul>
  </div>

  <div class="content">
    ${bodyHtml}
  </div>

  <script>${mermaidSrc}</script>
</body>
</html>`;

  console.log(`Rendering ${mermaidCount} mermaid diagram(s)...`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      // "strict" disables HTML labels, and several diagrams in this README
      // use "<br/>" inside a node label for a second line — under strict
      // that renders as literal text (or empty), and the container's height
      // ends up wrong for print pagination, which showed up as one diagram
      // spilling a whole blank page before its real content on the next one.
      // The source is this repo's own README, not user input, so loose is
      // safe here the way it would not be for arbitrary external markdown.
      securityLevel: "loose",
      flowchart: { htmlLabels: true },
    });
    // eslint-disable-next-line no-undef
    await mermaid.run({ querySelector: ".mermaid" });
    // eslint-disable-next-line no-undef
    await document.fonts.ready;
  });
  // A beat for layout to settle against the CSS above before print measures
  // page breaks against each diagram's final, scaled-down size.
  await page.waitForTimeout(200);

  mkdirSync(dirname(OUT), { recursive: true });
  await page.pdf({
    path: OUT,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "18mm", right: "18mm" },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:7.5px; color:#9ca3af; width:100%; padding:0 18mm; font-family:sans-serif;"></div>`,
    footerTemplate: `<div style="font-size:7.5px; color:#9ca3af; width:100%; padding:0 18mm; display:flex; justify-content:space-between; font-family:sans-serif;">
      <span>PulseCommerce — Developer Guide</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
  });

  await browser.close();
  console.log(`Wrote ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
