import type { Column, Sheet } from "./datasets";

/**
 * Formula-injection guard.
 *
 * Only text can be a formula. Applying this to every cell prefixed an
 * apostrophe onto negative numbers, which turned every negative change and
 * every refund into a text cell that no spreadsheet would sum.
 */
function guard(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function quote(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Formats one cell for CSV, using the column's declared type. */
function cell(value: unknown, format: Column["format"]): string {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) return quote(guard(value.join("; ")));

  if (format === "date" || format === "datetime") {
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return quote(guard(String(value)));
    // Spreadsheet-parseable, unlike an ISO string with a Z suffix. Times are
    // kept when the value actually has one.
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (format === "date") return date;
    return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  if (format === "text") return quote(guard(String(value)));

  // Numeric columns emit bare numbers: no thousands separators, no currency
  // symbol, no apostrophe. Formatting is the spreadsheet's job.
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return quote(guard(String(value)));
  if (format === "integer") return String(Math.round(n));
  // Two decimals is enough for money and percentages alike, and stops a
  // floating-point tail like -8.02493082743501 leaking into the file.
  return String(Math.round(n * 100) / 100);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function sheetToCsv(sheet: Sheet, opts: { includeHeaderBlock?: boolean } = {}): string {
  const lines: string[] = [];

  if (opts.includeHeaderBlock) {
    lines.push(quote(sheet.title));
    lines.push(quote(sheet.description));
    lines.push("");
  }

  lines.push(sheet.columns.map((c) => quote(c.header)).join(","));
  for (const row of sheet.rows) {
    lines.push(sheet.columns.map((c) => cell(row[c.key], c.format)).join(","));
  }

  // BOM keeps Excel from mangling non-ASCII customer names.
  return `﻿${lines.join("\r\n")}`;
}

export function sheetsToCsv(sheets: Sheet[]): string {
  return sheets
    .map((s) => sheetToCsv(s, { includeHeaderBlock: true }).replace(/^﻿/, ""))
    .join("\r\n\r\n");
}
