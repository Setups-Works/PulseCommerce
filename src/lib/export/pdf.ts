import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalyticsResult } from "@/lib/analytics/types";
import { buildNarrative, toPrintable, type Column, type Sheet } from "./datasets";
import { GEIST_REGULAR_BASE64 } from "./fonts/geist-regular";
import { GEIST_SEMIBOLD_BASE64 } from "./fonts/geist-semibold";

const BRAND: [number, number, number] = [17, 17, 17];
const INK: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [115, 115, 115];
const RULE: [number, number, number] = [224, 224, 224];
const BAND: [number, number, number] = [248, 248, 248];

/** Landscape A4 in points. */
const MARGIN = 34;

const FONT = "Geist";

/**
 * Registers Geist with the document.
 *
 * jsPDF's built-in fonts use WinAnsi encoding, which has no rupee glyph, so
 * every INR figure previously printed as a stray superscript one. An embedded
 * Unicode font fixes that, and matches the dashboard's own typeface.
 */
function registerFonts(doc: jsPDF): void {
  doc.addFileToVFS("Geist-Regular.ttf", GEIST_REGULAR_BASE64);
  doc.addFont("Geist-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("Geist-SemiBold.ttf", GEIST_SEMIBOLD_BASE64);
  doc.addFont("Geist-SemiBold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
}

export function buildPdf(result: AnalyticsResult, sheets: Sheet[]): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  registerFonts(doc);

  const narrative = buildNarrative(result);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fmt = makeFormatter(result.meta.currency);

  // ---- Cover -------------------------------------------------------------
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 120, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont(FONT, "bold");
  doc.setFontSize(24);
  doc.text(result.meta.storeName, MARGIN, 56);

  doc.setFont(FONT, "normal");
  doc.setFontSize(12);
  doc.text("Commerce analytics report", MARGIN, 78);

  doc.setFontSize(9.5);
  doc.text(
    `${result.meta.range.from}  to  ${result.meta.range.to}     ${result.meta.orderCount.toLocaleString()} orders     ${result.meta.currency}`,
    MARGIN,
    98,
  );

  let y = 156;
  doc.setTextColor(...INK);
  doc.setFont(FONT, "bold");
  doc.setFontSize(14);
  doc.text("Headline performance", MARGIN, y);
  y += 16;

  const headline: [string, string, number | null][] = [
    ["Net revenue", fmt.currency(result.kpis.netRevenue.value), result.kpis.netRevenue.change],
    ["Orders", fmt.integer(result.kpis.orders.value), result.kpis.orders.change],
    [
      "Average order value",
      fmt.currency(result.kpis.averageOrderValue.value),
      result.kpis.averageOrderValue.change,
    ],
    ["Active customers", fmt.integer(result.kpis.activeCustomers.value), result.kpis.activeCustomers.change],
    ["New customers", fmt.integer(result.kpis.newCustomers.value), result.kpis.newCustomers.change],
    [
      "Returning customer rate",
      `${result.kpis.returningCustomerRate.value.toFixed(1)}%`,
      result.kpis.returningCustomerRate.change,
    ],
    ["Units sold", fmt.integer(result.kpis.unitsSold.value), result.kpis.unitsSold.change],
    ["Refunded", fmt.currency(result.kpis.refundedAmount.value), result.kpis.refundedAmount.change],
  ];

  const cardW = (pageWidth - MARGIN * 2 - 21) / 4;
  headline.forEach(([label, value, change], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = MARGIN + col * (cardW + 7);
    const cy = y + row * 60;

    doc.setDrawColor(...RULE);
    doc.setFillColor(...BAND);
    doc.roundedRect(x, cy, cardW, 52, 3, 3, "FD");

    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 10, cy + 16);

    doc.setFont(FONT, "bold");
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(value, x + 10, cy + 35);

    if (change !== null) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      const up = change >= 0;
      doc.setTextColor(...(up ? ([12, 130, 12] as [number, number, number]) : ([185, 45, 45] as [number, number, number])));
      doc.text(`${up ? "+" : ""}${(change * 100).toFixed(1)}% vs previous`, x + 10, cy + 46);
    }
  });

  y += 60 * 2 + 28;

  // ---- Findings ----------------------------------------------------------
  doc.setFont(FONT, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text("Key findings", MARGIN, y);
  y += 16;

  for (const insight of narrative.insights.slice(0, 6)) {
    if (y > pageHeight - 58) break;

    doc.setFont(FONT, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const title = doc.splitTextToSize(insight.title, pageWidth - MARGIN * 2);
    doc.text(title, MARGIN, y);
    y += title.length * 12;

    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const detail = doc.splitTextToSize(insight.detail, pageWidth - MARGIN * 2);
    doc.text(detail, MARGIN, y);
    y += detail.length * 11 + 9;
  }

  // ---- Data tables -------------------------------------------------------
  for (const original of sheets) {
    const sheet = toPrintable(original);
    const trimmed = sheet.columns.length < original.columns.length;

    doc.addPage();

    doc.setFont(FONT, "bold");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(sheet.title, MARGIN, 42);

    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const note = trimmed
      ? `${sheet.description} Showing the ${sheet.columns.length} columns that fit a printed page; the Excel and CSV exports carry all ${original.columns.length}.`
      : sheet.description;
    const noteLines = doc.splitTextToSize(note, pageWidth - MARGIN * 2);
    doc.text(noteLines, MARGIN, 57);

    const rows = sheet.rows.slice(0, 250);
    const startY = 57 + noteLines.length * 10 + 8;

    autoTable(doc, {
      startY,
      margin: { left: MARGIN, right: MARGIN, bottom: 36 },
      head: [sheet.columns.map((c) => c.header)],
      body: rows.map((row) => sheet.columns.map((c) => renderCell(row[c.key], c, fmt))),
      styles: {
        font: FONT,
        fontStyle: "normal",
        fontSize: 7.5,
        cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
        // Ellipsis rather than wrapping: a value broken across three lines is
        // harder to read than one that says plainly it has been shortened.
        overflow: "ellipsize",
        textColor: INK,
        lineColor: RULE,
        lineWidth: 0.4,
        valign: "middle",
      },
      headStyles: {
        font: FONT,
        fontStyle: "bold",
        fillColor: BRAND,
        textColor: [255, 255, 255],
        fontSize: 7.5,
        // Headers are short, so wrapping them is fine and beats truncation.
        overflow: "linebreak",
        valign: "bottom",
      },
      alternateRowStyles: { fillColor: BAND },
      columnStyles: buildColumnStyles(sheet.columns),
      theme: "grid",
      tableWidth: "auto",
      showHead: "everyPage",
    });

    if (sheet.rows.length > rows.length) {
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(
        `Showing the first ${rows.length.toLocaleString()} of ${sheet.rows.length.toLocaleString()} rows. Export as Excel or CSV for the complete dataset.`,
        MARGIN,
        Math.min(finalY + 14, pageHeight - 26),
      );
    }
  }

  // ---- Footers -----------------------------------------------------------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE);
    doc.line(MARGIN, pageHeight - 24, pageWidth - MARGIN, pageHeight - 24);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `${result.meta.storeName}  ·  generated ${new Date(narrative.generatedAt).toUTCString()}`,
      MARGIN,
      pageHeight - 12,
    );
    doc.text(`Page ${p} of ${pages}`, pageWidth - MARGIN, pageHeight - 12, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Alignment per column, plus a width hint for the ones that would otherwise be
 * starved. Text columns get the slack; numbers need only their digits.
 */
function buildColumnStyles(columns: Column[]) {
  const styles: Record<number, Record<string, unknown>> = {};

  columns.forEach((c, i) => {
    const isText = c.format === "text" || c.format === "date" || c.format === "datetime";
    styles[i] = { halign: isText ? "left" : "right" };

    if (c.format === "text") {
      // Names and emails are the columns worth reading; give them room.
      styles[i].cellWidth = c.width && c.width >= 26 ? 108 : "auto";
    } else if (c.format === "datetime") {
      styles[i].cellWidth = 74;
    } else if (c.format === "date") {
      styles[i].cellWidth = 54;
    }
  });

  return styles;
}

interface Formatter {
  currency: (n: number) => string;
  integer: (n: number) => string;
  decimal: (n: number) => string;
}

function makeFormatter(currency: string): Formatter {
  const money = new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 });
  const int = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
  const dec = new Intl.NumberFormat("en", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return {
    currency: (n) => (Number.isFinite(n) ? money.format(n) : "—"),
    integer: (n) => (Number.isFinite(n) ? int.format(n) : "—"),
    decimal: (n) => (Number.isFinite(n) ? dec.format(n) : "—"),
  };
}

function renderCell(value: unknown, column: Column, fmt: Formatter): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (column.format) {
    case "currency":
      return fmt.currency(Number(value));
    case "percent":
      return `${fmt.decimal(Number(value))}%`;
    case "integer":
      return fmt.integer(Number(value));
    case "number":
      return fmt.decimal(Number(value));
    case "date": {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
    }
    case "datetime": {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 16).replace("T", " ");
    }
    default:
      return Array.isArray(value) ? value.join(", ") : String(value);
  }
}
