import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalyticsResult } from "@/lib/analytics/types";
import { buildNarrative, type Column, type Sheet } from "./datasets";

const BRAND: [number, number, number] = [27, 75, 143];
const MUTED: [number, number, number] = [100, 116, 139];
const RULE: [number, number, number] = [226, 232, 240];

/** Landscape A4 in points, with a comfortable text column. */
const MARGIN = 36;

export function buildPdf(result: AnalyticsResult, sheets: Sheet[]): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const narrative = buildNarrative(result);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const fmt = makeFormatter(result.meta.currency);

  // ---- Cover -------------------------------------------------------------
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 132, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(result.meta.storeName, MARGIN, 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("Advanced commerce analytics report", MARGIN, 86);

  doc.setFontSize(10);
  doc.text(
    `${result.meta.range.from}  \u2192  ${result.meta.range.to}   \u00b7   ${result.meta.orderCount.toLocaleString()} orders   \u00b7   ${result.meta.storeUrl}`,
    MARGIN,
    108,
  );

  let y = 168;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Headline performance", MARGIN, y);
  y += 18;

  // KPI grid — four across, two rows.
  const headline: [string, string, number | null][] = [
    ["Net revenue", fmt.currency(result.kpis.netRevenue.value), result.kpis.netRevenue.change],
    ["Orders", fmt.integer(result.kpis.orders.value), result.kpis.orders.change],
    ["Average order value", fmt.currency(result.kpis.averageOrderValue.value), result.kpis.averageOrderValue.change],
    ["Active customers", fmt.integer(result.kpis.activeCustomers.value), result.kpis.activeCustomers.change],
    ["New customers", fmt.integer(result.kpis.newCustomers.value), result.kpis.newCustomers.change],
    ["Returning customer rate", `${result.kpis.returningCustomerRate.value.toFixed(1)}%`, result.kpis.returningCustomerRate.change],
    ["Units sold", fmt.integer(result.kpis.unitsSold.value), result.kpis.unitsSold.change],
    ["Refunded", fmt.currency(result.kpis.refundedAmount.value), result.kpis.refundedAmount.change],
  ];

  const cardW = (pageWidth - MARGIN * 2 - 24) / 4;
  headline.forEach(([label, value, change], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = MARGIN + col * (cardW + 8);
    const cy = y + row * 62;

    doc.setDrawColor(...RULE);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, cy, cardW, 54, 4, 4, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 10, cy + 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(value, x + 10, cy + 36);

    if (change !== null) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const up = change >= 0;
      doc.setTextColor(...(up ? ([12, 163, 12] as [number, number, number]) : ([208, 59, 59] as [number, number, number])));
      doc.text(`${up ? "▲" : "▼"} ${Math.abs(change * 100).toFixed(1)}% vs prev.`, x + 10, cy + 48);
    }
  });

  y += 62 * 2 + 12;

  // ---- Findings ----------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text("Key findings", MARGIN, y);
  y += 16;

  doc.setFontSize(9.5);
  for (const insight of narrative.insights.slice(0, 7)) {
    if (y > pageHeight - 60) break;
    doc.setFillColor(...severityFill(insight.severity));
    doc.circle(MARGIN + 4, y - 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(insight.title, MARGIN + 14, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(insight.detail, pageWidth - MARGIN * 2 - 14);
    doc.text(lines, MARGIN + 14, y);
    y += lines.length * 11 + 8;
  }

  // ---- Data tables -------------------------------------------------------
  for (const sheet of sheets) {
    doc.addPage();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND);
    doc.text(sheet.title, MARGIN, 44);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(sheet.description, pageWidth - MARGIN * 2), MARGIN, 60);

    // PDFs are for reading, not for holding an entire order register.
    const rows = sheet.rows.slice(0, 200);

    autoTable(doc, {
      startY: 76,
      margin: { left: MARGIN, right: MARGIN, bottom: 40 },
      head: [sheet.columns.map((c) => c.header)],
      body: rows.map((row) => sheet.columns.map((c) => renderCell(row[c.key], c, fmt))),
      styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak", textColor: [30, 41, 59] },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: Object.fromEntries(
        sheet.columns.map((c, i) => [
          i,
          {
            halign:
              c.format === "text" || c.format === "date" || c.format === "datetime" ? "left" : "right",
          } as const,
        ]),
      ),
      theme: "grid",
      tableLineColor: RULE,
      tableLineWidth: 0.5,
    });

    if (sheet.rows.length > rows.length) {
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(
        `Showing the first ${rows.length} of ${sheet.rows.length} rows. Export as Excel or CSV for the complete dataset.`,
        MARGIN,
        Math.min(finalY + 16, pageHeight - 30),
      );
    }
  }

  // ---- Footers -----------------------------------------------------------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE);
    doc.line(MARGIN, pageHeight - 28, pageWidth - MARGIN, pageHeight - 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `${result.meta.storeName} · generated ${new Date(narrative.generatedAt).toUTCString()}`,
      MARGIN,
      pageHeight - 14,
    );
    doc.text(`Page ${p} of ${pages}`, pageWidth - MARGIN, pageHeight - 14, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

interface Formatter {
  currency: (n: number) => string;
  integer: (n: number) => string;
  decimal: (n: number) => string;
}

function makeFormatter(currency: string): Formatter {
  const money = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
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

function severityFill(severity: string): [number, number, number] {
  switch (severity) {
    case "positive":
      return [12, 163, 12];
    case "warning":
      return [250, 178, 25];
    case "critical":
      return [208, 59, 59];
    default:
      return [42, 120, 214];
  }
}
