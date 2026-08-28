import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireTenant } from "@/lib/auth/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GO_MONTHLY_LIMIT = 10_000;

interface ProfileRow {
  plan: "go" | "plus" | null;
  subscription_status: string;
  current_period_end: Date | null;
  grace_until: Date | null;
  legacy_unlimited: boolean;
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
  const unlimited = Boolean(profile?.legacy_unlimited) || profile?.plan === "plus";

  return NextResponse.json({
    plan: profile?.plan ?? null,
    subscriptionStatus: profile?.subscription_status ?? "none",
    currentPeriodEnd: profile?.current_period_end?.toISOString() ?? null,
    graceUntil: profile?.grace_until?.toISOString() ?? null,
    legacyUnlimited: profile?.legacy_unlimited ?? false,
    usage: { sent, limit: unlimited ? null : GO_MONTHLY_LIMIT },
  });
}
