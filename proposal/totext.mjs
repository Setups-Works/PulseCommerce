import { readFileSync, writeFileSync } from "node:fs";

/*
 * Plain-text build of the proposal, for a CRM whose editor takes text but no
 * markup.
 *
 * Two decisions come from what that editor actually does with a paste:
 *
 * Nothing is hard-wrapped. The editor reflows text to its own column width, so
 * a file wrapped at 78 characters arrives broken mid-sentence on every line.
 * One paragraph is one line, however long.
 *
 * Nothing is drawn with characters. Underlines of "=", rules of "-" and
 * space-aligned table columns all assume a monospaced fixed-width viewer. In a
 * proportional font they arrive as noise that has to be deleted by hand.
 * Hierarchy is carried by capitalisation and blank lines instead, which survive
 * any renderer, and the headings can be promoted with the editor's own H2/H3
 * buttons afterwards.
 */

/** A run of source lines all shorter than this keeps its line breaks. */
const STANZA_MAX = 55;

const src = readFileSync(new URL("proposal.md", import.meta.url), "utf8");

/** Strips inline markup that would otherwise show up as stray punctuation. */
function inline(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // An image cannot render here, so keep the one thing that survives: its URL.
    .replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, "$1")
    // [label](url) → "label (url)", unless the label already is the url.
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
      label.trim() === url.trim() ? url : `${label} (${url})`,
    )
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
const isTableDivider = (line) => /^\s*\|[\s:|-]+\|\s*$/.test(line);

const cellsOf = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => inline(c));

/**
 * One labelled block per row.
 *
 * Column alignment is not attempted: it only works in a monospaced font, and
 * the destination is proportional, so padded columns would arrive crooked.
 */
function renderTable(rows) {
  const [header, ...body] = rows;
  const out = [];

  for (const row of body) {
    out.push(row[0]);
    for (let i = 1; i < header.length; i++) {
      if (!row[i]) continue;
      out.push(`    ${header[i]}: ${row[i]}`);
    }
    out.push("");
  }
  if (out.at(-1) === "") out.pop();
  return out;
}

const lines = src.split("\n");
const out = [];
let i = 0;

/** Collapses the blank-line runs that markdown block boundaries leave behind. */
function pushBlank() {
  if (out.length && out.at(-1) !== "") out.push("");
}

while (i < lines.length) {
  const line = lines[i].trimEnd();

  // Tables
  if (isTableRow(line)) {
    const rows = [];
    while (i < lines.length && isTableRow(lines[i].trimEnd())) {
      if (!isTableDivider(lines[i])) rows.push(cellsOf(lines[i]));
      i++;
    }
    pushBlank();
    out.push(...renderTable(rows));
    pushBlank();
    continue;
  }

  // Headings. Capitals mark the top level; the rest stand alone on a line.
  const heading = line.match(/^(#{1,6})\s+(.*)$/);
  if (heading) {
    const [, hashes, text] = heading;
    const content = inline(text);
    pushBlank();
    out.push(hashes.length === 1 ? content.toUpperCase() : content);
    out.push("");
    i++;
    continue;
  }

  // Horizontal rules become a paragraph break: a row of dashes is decoration
  // the destination cannot use.
  if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
    pushBlank();
    i++;
    continue;
  }

  // Bullets
  const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
  if (bullet) {
    const [, lead, text] = bullet;
    let body = text;
    while (
      i + 1 < lines.length &&
      /^\s{2,}\S/.test(lines[i + 1]) &&
      !/^\s*[-*+]\s/.test(lines[i + 1])
    ) {
      body += ` ${lines[i + 1].trim()}`;
      i++;
    }
    out.push(`${"  ".repeat(Math.floor(lead.length / 2))}- ${inline(body)}`);
    i++;
    continue;
  }

  // Numbered items
  const numbered = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if (numbered) {
    const [, lead, num, text] = numbered;
    let body = text;
    while (
      i + 1 < lines.length &&
      /^\s{3,}\S/.test(lines[i + 1]) &&
      !/^\s*\d+\.\s/.test(lines[i + 1])
    ) {
      body += ` ${lines[i + 1].trim()}`;
      i++;
    }
    out.push(`${"  ".repeat(Math.floor(lead.length / 2))}${num}. ${inline(body)}`);
    i++;
    continue;
  }

  // Block quotes
  if (/^\s*>\s?/.test(line)) {
    let body = line.replace(/^\s*>\s?/, "");
    while (i + 1 < lines.length && /^\s*>\s?/.test(lines[i + 1])) {
      body += ` ${lines[i + 1].replace(/^\s*>\s?/, "").trim()}`;
      i++;
    }
    pushBlank();
    out.push(inline(body));
    pushBlank();
    i++;
    continue;
  }

  if (!line.trim()) {
    pushBlank();
    i++;
    continue;
  }

  // Paragraph: gather the run of source lines that belong to it.
  const block = [line];
  while (
    i + 1 < lines.length &&
    lines[i + 1].trim() &&
    !/^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>|\|)/.test(lines[i + 1]) &&
    !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i + 1])
  ) {
    block.push(lines[i + 1]);
    i++;
  }

  /*
   * Prose is wrapped at the source width, so its lines run long; address and
   * signature blocks are a stack of short ones where the break is the whole
   * point. Reflowing those into a paragraph would read as a run-on, so a run
   * of uniformly short lines keeps its breaks.
   */
  if (block.every((l) => l.trim().length <= STANZA_MAX)) {
    for (const l of block) {
      const text = inline(l);
      if (text) out.push(text);
    }
  } else {
    const text = inline(block.join(" "));
    if (text) out.push(text);
  }
  i++;
}

while (out[0] === "") out.shift();
while (out.at(-1) === "") out.pop();

writeFileSync(new URL("proposal-for-crm.txt", import.meta.url), `${out.join("\n")}\n`, "utf8");
console.log(`wrote proposal-for-crm.txt (${out.length} lines)`);
