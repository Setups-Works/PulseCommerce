import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireTenant } from "@/lib/auth/tenant";
import { planMessageLimit, type BillingProfile } from "@/lib/billing/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProfileRow extends BillingProfile {
  current_period_end: Date | null;
}

export async function GET(request: Request) {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved.value;

  const [profile] = await db()<ProfileRow[]>`
    select plan, subscription_status, current_period_end, grace_until, legacy_unlimited
    from profiles
    where id = ${userId}
  `;

  const period = new Date().toISOString().slice(0, 7);
  const [usage] = await db()<{ sent_count: number }[]>`
    select sent_count from whatsapp_usage where user_id = ${userId} and period = ${period}
  `;
  const sent = usage?.sent_count ?? 0;

  // Same policy the send gate itself uses (checkSendAllowance) -- a profile
  // with no active plan gets a 0 limit here too, not the Go figure by default.
  const limit = profile
    ? planMessageLimit(profile)
    : 0;

  return NextResponse.json({
    plan: profile?.plan ?? null,
    subscriptionStatus: profile?.subscription_status ?? "none",
    currentPeriodEnd: profile?.current_period_end?.toISOString() ?? null,
    graceUntil: profile?.grace_until?.toISOString() ?? null,
    legacyUnlimited: profile?.legacy_unlimited ?? false,
    usage: { sent, limit },
  });
}
