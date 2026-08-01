import ExcelJS from "exceljs";
import type { AnalyticsResult } from "@/lib/analytics/types";
import { buildNarrative, type Column, type Sheet } from "./datasets";

const BRAND = "1B4B8F";
const HEADER_FILL = "F1F5F9";

function numberFormat(column: Column, currency: string): string | undefined {
  switch (column.format) {
    case "currency":
      return `"${currencySymbol(currency)}"#,##0.00`;
    case "percent":
      return '#,##0.0"%"';
    case "integer":
      return "#,##0";
    case "number":
      return "#,##0.00";
    case "date":
      return "yyyy-mm-dd";
    case "datetime":
      return "yyyy-mm-dd hh:mm";
    default:
      return undefined;
  }
}

function currencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat("en", { style: "currency", currency: code }).formatToParts(1);
    return parts.find((p) => p.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

function coerce(value: unknown, format: Column["format"]): string | number | Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (format === "date" || format === "datetime") {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d;
  }
  if (format === "text") return Array.isArray(value) ? value.join(", ") : String(value);
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : String(value);
}

export async function buildWorkbook(result: AnalyticsResult, sheets: Sheet[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const narrative = buildNarrative(result);

  wb.creator = "PulseCommerce Analytics";
  wb.created = new Date();
  wb.properties.date1904 = false;

  // ---- Cover sheet -------------------------------------------------------
  const cover = wb.addWorksheet("Report", { properties: { tabColor: { argb: BRAND } } });
  cover.columns = [{ width: 34 }, { width: 62 }];

  cover.addRow([narrative.title]).font = { size: 18, bold: true, color: { argb: BRAND } };
  cover.addRow([narrative.subtitle]).font = { size: 12, color: { argb: "64748B" } };
  cover.addRow([]);

  const meta: [string, string][] = [
    ["Store", result.meta.storeName],
    ["Store URL", result.meta.storeUrl],
    ["Data source", "WooCommerce REST API"],
    ["Currency", result.meta.currency],
    ["Reporting period", `${result.meta.range.from} → ${result.meta.range.to}`],
    ["Comparison period", `${result.meta.previousRange.from} → ${result.meta.previousRange.to}`],
    ["Orders analysed", String(result.meta.orderCount)],
    ["Generated at", new Date(narrative.generatedAt).toUTCString()],
  ];
  for (const [k, v] of meta) {
    const row = cover.addRow([k, v]);
    row.getCell(1).font = { bold: true };
  }

  cover.addRow([]);
  const insightHeader = cover.addRow(["Key findings"]);
  insightHeader.font = { size: 14, bold: true, color: { argb: BRAND } };
  for (const insight of narrative.insights) {
    const row = cover.addRow([insight.title, insight.detail]);
    row.getCell(1).font = { bold: true, color: { argb: severityColour(insight.severity) } };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.height = 30;
  }

  // ---- Data sheets -------------------------------------------------------
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(safeSheetName(sheet.title), {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    ws.addRow([sheet.title]).font = { size: 13, bold: true, color: { argb: BRAND } };
    ws.addRow([sheet.description]).font = { size: 10, italic: true, color: { argb: "64748B" } };

    const header = ws.addRow(sheet.columns.map((c) => c.header));
    header.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
      cell.border = { bottom: { style: "thin", color: { argb: "CBD5E1" } } };
      cell.alignment = { wrapText: true, vertical: "middle" };
    });
    header.height = 28;

    ws.columns = sheet.columns.map((c) => ({ width: c.width ?? 16 }));

    for (const row of sheet.rows) {
      const values = sheet.columns.map((c) => coerce(row[c.key], c.format));
      const added = ws.addRow(values);
      sheet.columns.forEach((c, i) => {
        // A row may override the column's format — the executive summary mixes
        // money, counts and percentages down a single column.
        const override = c.key === "value" || c.key === "previous" ? row.valueFormat : undefined;
        const fmt = numberFormat(
          typeof override === "string" ? { ...c, format: override as Column["format"] } : c,
          result.meta.currency,
        );
        if (fmt) added.getCell(i + 1).numFmt = fmt;
      });
    }

    if (sheet.rows.length > 0) {
      ws.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: sheet.columns.length },
      };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function severityColour(severity: string): string {
  switch (severity) {
    case "positive":
      return "0CA30C";
    case "warning":
      return "B45309";
    case "critical":
      return "D03B3B";
    default:
      return "334155";
  }
}

/** Excel rejects >31 chars and the characters in this class. */
function safeSheetName(name: string): string {
  return name.replace(/[*?:\\/[\]]/g, "-").slice(0, 31);
}
