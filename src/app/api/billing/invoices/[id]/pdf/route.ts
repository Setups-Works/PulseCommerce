import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireTenant } from "@/lib/auth/tenant";
import { buildInvoicePdf, type Invoice } from "@/lib/export/invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InvoiceRow {
  id: string;
  plan: "go" | "plus";
  amount_paise: number;
  currency: string;
  status: "paid" | "failed" | "refunded";
  period_start: Date;
  period_end: Date;
  paid_at: Date;
  razorpay_payment_id: string | null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId, email } = resolved.value;
  const { id } = await params;

  // Scoped by user_id in the query itself, not checked after the fact — an
  // invoice id for another tenant simply does not match this row.
  const [row] = await db()<InvoiceRow[]>`
    select id, plan, amount_paise, currency, status, period_start, period_end, paid_at, razorpay_payment_id
    from billing_invoices
    where id = ${id} and user_id = ${userId}
  `;
  if (!row) return NextResponse.json({ error: "No such invoice." }, { status: 404 });

  const invoice: Invoice = {
    id: row.id,
    plan: row.plan,
    amountPaise: row.amount_paise,
    currency: row.currency,
    status: row.status,
    periodStart: row.period_start.toISOString(),
    periodEnd: row.period_end.toISOString(),
    paidAt: row.paid_at.toISOString(),
    razorpayPaymentId: row.razorpay_payment_id,
  };

  const buffer = buildInvoicePdf(invoice, { email });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pulsecommerce-invoice-${row.id.slice(0, 8)}.pdf"`,
      "Content-Length": String(buffer.byteLength),
      // A billing_invoices row is written once by the webhook and never
      // updated by any code path in this app -- re-downloading the same
      // invoice (an accounting tool, a repeat click) has no reason to
      // re-transfer identical bytes. `private` keeps it out of any
      // shared/CDN cache. Vary: Cookie so a browser's own cache can't reuse
      // this response for a request carrying a different session cookie --
      // the id in the URL is an unguessable UUID scoped to one account by
      // the query itself, but a shared browser switching accounts should
      // never even have the *option* of replaying a cached response instead
      // of hitting the server's own ownership check again.
      "Cache-Control": "private, max-age=86400, immutable",
      Vary: "Cookie",
    },
  });
}
