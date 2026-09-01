import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { resolveTenant } from "@/lib/auth/tenant";
import { cancelSubscription, createCustomer, createSubscription } from "@/lib/billing/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts a subscription. Session only — like managing API keys
 * (src/app/api/keys/route.ts), a leaked API key must not be able to change
 * what the account is billed, so this is not reachable with one.
 */
const bodySchema = z.object({ plan: z.enum(["go", "plus"]) });

const PLAN_ENV: Record<"go" | "plus", string | undefined> = {
  go: process.env.RAZORPAY_PLAN_ID_GO,
  plus: process.env.RAZORPAY_PLAN_ID_PLUS,
};

/**
 * One-time, account-level: consumed the moment a mandate is actually
 * authenticated (see the webhook's subscription.authenticated case), not by
 * merely starting a checkout. Switching plans before authenticating is free
 * to restart with a fresh trial window; switching after authenticating
 * (mid-trial) bills the new plan immediately, same as any post-trial
 * resubscription — no prorating, no carrying remaining days onto a new plan.
 */
const TRIAL_DAYS = 14;

export async function POST(request: Request) {
  const tenant = await resolveTenant(request);
  if (!tenant || tenant.via === "api-key") {
    return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A plan of \"go\" or \"plus\" is required." }, { status: 422 });
  }

  const planId = PLAN_ENV[parsed.data.plan];
  if (!planId) {
    return NextResponse.json(
      { error: `RAZORPAY_PLAN_ID_${parsed.data.plan.toUpperCase()} is not set.` },
      { status: 503 },
    );
  }

  const [profile] = await db()<
    {
      razorpay_customer_id: string | null;
      razorpay_subscription_id: string | null;
      plan: "go" | "plus" | null;
      subscription_status: string;
      trial_used_at: Date | null;
    }[]
  >`select razorpay_customer_id, razorpay_subscription_id, plan, subscription_status, trial_used_at
    from profiles where id = ${tenant.userId}`;

  // Already on (or mid-trial of) exactly this plan — re-clicking Subscribe
  // must not cancel a working mandate and create a redundant one.
  if (
    profile?.plan === parsed.data.plan &&
    (profile.subscription_status === "active" || profile.subscription_status === "authenticated")
  ) {
    return NextResponse.json({ subscriptionId: profile.razorpay_subscription_id, trialDays: 0 });
  }

  // Upgrading (or re-subscribing) cancels whatever's there first — Razorpay
  // subscriptions have no clean in-place plan change, and a customer with two
  // live mandates would be charged twice.
  if (profile?.razorpay_subscription_id) {
    try {
      await cancelSubscription(profile.razorpay_subscription_id);
    } catch {
      // Already cancelled/expired on Razorpay's side is fine to proceed past.
    }
  }

  let customerId = profile?.razorpay_customer_id ?? null;
  if (!customerId) {
    const customer = await createCustomer(tenant.email);
    customerId = customer.id;
  }

  // Eligible exactly once, ever, per account — see TRIAL_DAYS above.
  const eligibleForTrial = !profile?.trial_used_at;
  const startAtSeconds = eligibleForTrial
    ? Math.floor(Date.now() / 1000) + TRIAL_DAYS * 24 * 60 * 60
    : undefined;

  let subscription;
  try {
    subscription = await createSubscription({ customerId, planId, startAt: startAtSeconds });
  } catch (error) {
    // A real failure mode: Razorpay can reject start_at as outside its
    // allowed lead time for this plan's billing interval. Nothing has been
    // written to profiles yet at this point, so there's no partial state to
    // clean up — just report it. razorpay.ts has no custom error class; the
    // SDK's own thrown shape carries `error.error.description`.
    const description = (error as { error?: { description?: string } })?.error?.description;
    return NextResponse.json({ error: description ?? "Could not start the subscription." }, { status: 502 });
  }

  await db()`
    update profiles
       set razorpay_customer_id = ${customerId},
           razorpay_subscription_id = ${subscription.id},
           plan = ${parsed.data.plan},
           subscription_status = 'created',
           trial_ends_at = ${eligibleForTrial ? new Date(startAtSeconds! * 1000).toISOString() : null}
     where id = ${tenant.userId}
  `;

  return NextResponse.json({ subscriptionId: subscription.id, trialDays: eligibleForTrial ? TRIAL_DAYS : 0 });
}
