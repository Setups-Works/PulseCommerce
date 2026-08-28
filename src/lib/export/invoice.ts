import { jsPDF } from "jspdf";
import { BRAND, FONT, INK, MARGIN, MUTED, RULE, makeFormatter, registerFonts } from "./pdf";

/**
 * One-page invoice receipt, built on demand from a stored billing_invoices
 * row — not pre-rendered and stored, so there is nothing to regenerate if the
 * layout ever changes.
 *
 * Reuses buildPdf's own font embedding rather than re-registering Geist: this
 * project has already been bitten once by jsPDF's built-in fonts having no
 * rupee glyph (see registerFonts's own comment), and re-solving that here
 * would be the same bug waiting to happen twice.
 */

export interface Invoice {
  id: string;
  plan: "go" | "plus";
  amountPaise: number;
  currency: string;
  status: "paid" | "failed" | "refunded";
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  razorpayPaymentId: string | null;
}

const PLAN_LABEL: Record<Invoice["plan"], string> = { go: "Go", plus: "Plus" };

export function buildInvoicePdf(invoice: Invoice, account: { email: string }): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "a4" }); // portrait — a receipt, not a report
  registerFonts(doc);
  const fmt = makeFormatter(invoice.currency);
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = MARGIN;

  doc.setFont(FONT, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BRAND);
  doc.text("PulseCommerce", MARGIN, y);
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text("Invoice", pageWidth - MARGIN, y, { align: "right" });
  y += 28;

  doc.setDrawColor(...RULE);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 24;

  doc.setFont(FONT, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Billed to", MARGIN, y);
  doc.text("Invoice", pageWidth - MARGIN, y, { align: "right" });
  y += 14;

  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(account.email, MARGIN, y);
  doc.setFont(FONT, "normal");
  doc.text(invoice.id.slice(0, 8), pageWidth - MARGIN, y, { align: "right" });
  y += 40;

  const rowY = y;
  doc.setFont(FONT, "bold");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("Description", MARGIN, rowY);
  doc.text("Amount", pageWidth - MARGIN, rowY, { align: "right" });
  y += 6;
  doc.setDrawColor(...RULE);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 22;

  const start = new Date(invoice.periodStart).toISOString().slice(0, 10);
  const end = new Date(invoice.periodEnd).toISOString().slice(0, 10);
  doc.setFont(FONT, "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`PulseCommerce ${PLAN_LABEL[invoice.plan]} plan — ${start} to ${end}`, MARGIN, y);
  doc.text(fmt.currency(invoice.amountPaise / 100), pageWidth - MARGIN, y, { align: "right" });
  y += 30;

  doc.setDrawColor(...RULE);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 22;

  doc.setFont(FONT, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND);
  doc.text("Total", MARGIN, y);
  doc.text(fmt.currency(invoice.amountPaise / 100), pageWidth - MARGIN, y, { align: "right" });
  y += 34;

  doc.setFont(FONT, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Status: ${invoice.status}`, MARGIN, y);
  y += 14;
  doc.text(`Paid: ${new Date(invoice.paidAt).toISOString().slice(0, 16).replace("T", " ")} UTC`, MARGIN, y);
  y += 14;
  if (invoice.razorpayPaymentId) {
    doc.text(`Payment reference: ${invoice.razorpayPaymentId}`, MARGIN, y);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
