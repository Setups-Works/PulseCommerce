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
    { razorpay_customer_id: string | null; razorpay_subscription_id: string | null }[]
  >`select razorpay_customer_id, razorpay_subscription_id from profiles where id = ${tenant.userId}`;

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

  const subscription = await createSubscription({ customerId, planId });

  await db()`
    update profiles
       set razorpay_customer_id = ${customerId},
           razorpay_subscription_id = ${subscription.id},
           plan = ${parsed.data.plan},
           subscription_status = 'created'
     where id = ${tenant.userId}
  `;

  return NextResponse.json({ subscriptionId: subscription.id });
}
