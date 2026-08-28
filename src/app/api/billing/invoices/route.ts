import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireTenant } from "@/lib/auth/tenant";

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
}

export async function GET(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const rows = await db()<InvoiceRow[]>`
    select id, plan, amount_paise, currency, status, period_start, period_end, paid_at
    from billing_invoices
    where user_id = ${userId}
    order by paid_at desc
    limit 100
  `;

  return NextResponse.json({
    invoices: rows.map((row) => ({
      id: row.id,
      plan: row.plan,
      amountPaise: row.amount_paise,
      currency: row.currency,
      status: row.status,
      periodStart: row.period_start.toISOString(),
      periodEnd: row.period_end.toISOString(),
      paidAt: row.paid_at.toISOString(),
      downloadUrl: `/api/billing/invoices/${row.id}/pdf`,
    })),
  });
}
