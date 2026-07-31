import type { Sheet } from "./datasets";

function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Guard against CSV formula injection when the file is opened in Excel.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function sheetToCsv(sheet: Sheet, opts: { includeHeaderBlock?: boolean } = {}): string {
  const lines: string[] = [];
  if (opts.includeHeaderBlock) {
    lines.push(escape(sheet.title));
    lines.push(escape(sheet.description));
    lines.push("");
  }
  lines.push(sheet.columns.map((c) => escape(c.header)).join(","));
  for (const row of sheet.rows) {
    lines.push(sheet.columns.map((c) => escape(formatCell(row[c.key]))).join(","));
  }
  // BOM keeps Excel from mangling non-ASCII customer names.
  return `﻿${lines.join("\r\n")}`;
}

export function sheetsToCsv(sheets: Sheet[]): string {
  return sheets.map((s) => sheetToCsv(s, { includeHeaderBlock: true }).replace(/^﻿/, "")).join("\r\n\r\n");
}

function formatCell(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return value;
}
