import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { resolveTenant } from "@/lib/auth/tenant";
import { cancelSubscription } from "@/lib/billing/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reverts an abandoned checkout attempt. Session only, like /api/billing/checkout.
 *
 * /api/billing/checkout writes plan + subscription_status="created" the
 * instant a Razorpay subscription object exists -- before the customer has
 * even seen the Checkout.js popup, let alone completed the mandate. If they
 * close that popup without finishing, nothing else ever runs: no webhook
 * fires (Razorpay only sends one once a mandate is actually authorized), so
 * the "created" record dangles forever. This is what the popup's own
 * `ondismiss` calls, so the plan shown in Settings reverts immediately
 * instead of quietly claiming a plan nothing was ever paid for.
 *
 * Deliberately narrow: this only clears a *pending* (non-active) attempt. An
 * already-active subscription, or an authenticated trial that's actually
 * running, is a real cancellation with real consequences (losing paid-for
 * or trial access before the period ends) and isn't this route's job.
 */
export async function POST(request: Request) {
  const tenant = await resolveTenant(request);
  if (!tenant || tenant.via === "api-key") {
    return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  }

  const [profile] = await db()<
    { razorpay_subscription_id: string | null; subscription_status: string }[]
  >`select razorpay_subscription_id, subscription_status from profiles where id = ${tenant.userId}`;

  if (
    !profile?.razorpay_subscription_id ||
    profile.subscription_status === "active" ||
    profile.subscription_status === "authenticated"
  ) {
    return NextResponse.json({ ok: true });
  }

  try {
    await cancelSubscription(profile.razorpay_subscription_id);
  } catch {
    // Already cancelled or expired on Razorpay's side is fine to proceed past.
  }

  await db()`
    update profiles
       set plan = null, subscription_status = 'none', razorpay_subscription_id = null, trial_ends_at = null
     where id = ${tenant.userId}
  `;

  return NextResponse.json({ ok: true });
}
