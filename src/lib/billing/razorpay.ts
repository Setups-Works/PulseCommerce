import { createHash } from "node:crypto";
import Razorpay from "razorpay";

/**
 * Razorpay subscriptions and customers, via the official SDK.
 *
 * A thin wrapper rather than calling `client.subscriptions.create(...)`
 * everywhere it's needed — this is the one place that knows the plan-id env
 * vars and the "12 cycles, autopay" shape, so every caller asks for a plan by
 * name instead of repeating Razorpay's request shape.
 */

let client: Razorpay | null = null;

function razorpay(): Razorpay {
  if (client) return client;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set, so billing is unavailable.");
  }
  client = new Razorpay({ key_id, key_secret });
  return client;
}

export interface RazorpayCustomer {
  id: string;
}

export async function createCustomer(email: string, name?: string): Promise<RazorpayCustomer> {
  const customer = await razorpay().customers.create({
    email,
    name: name || email,
    fail_existing: 0, // Returns the existing customer instead of erroring.
  });
  return { id: customer.id };
}

export interface RazorpaySubscription {
  id: string;
  status: string;
  short_url: string;
  current_end: number | null;
}

export async function createSubscription(opts: {
  customerId: string;
  planId: string;
  /**
   * Unix seconds. Omit for immediate billing. When set, the UPI mandate is
   * still authorized right away via Checkout.js -- only the first charge is
   * deferred to this moment, which is what a free trial actually is on
   * Razorpay: a real, live mandate from day one, not a promise to ask for
   * one later. See src/app/api/billing/checkout/route.ts for how this is
   * computed (now + 14 days) and gated to one trial per account, ever.
   */
  startAt?: number;
}): Promise<RazorpaySubscription> {
  /*
   * The Subscriptions Create API has no "method" field — which payment
   * method a customer sees is a Checkout.js concern, not a subscription-
   * creation one. The frontend restricts the widget to UPI (see
   * BillingCard), so "UPI Autopay" is what's offered, not what's requested
   * here.
   */
  // customer_id is a real, documented field on this endpoint that the SDK's
  // own types omit — cast narrowly rather than widening the whole call.
  const body = {
    plan_id: opts.planId,
    customer_id: opts.customerId,
    // Counts 12 cycles from start_at, not from creation -- with a trial this
    // still lands as 12 monthly charges beginning once the trial ends.
    total_count: 12,
    // The mandate is completed right here, inline, via Checkout.js (see
    // BillingCard) -- Razorpay's own notify-by-email flow is a parallel,
    // confusing path to the same short_url a customer never needs to see.
    customer_notify: 0,
    ...(opts.startAt ? { start_at: opts.startAt } : {}),
  } as unknown as Parameters<Razorpay["subscriptions"]["create"]>[0];

  const subscription = await razorpay().subscriptions.create(body);

  return {
    id: subscription.id,
    status: subscription.status,
    short_url: subscription.short_url,
    current_end: subscription.current_end ?? null,
  };
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await razorpay().subscriptions.cancel(subscriptionId, false);
}

/**
 * Verifies a webhook actually came from Razorpay, using the SDK's own
 * constant-time HMAC check rather than a hand-rolled one.
 *
 * Must be called with the *raw* request body — the signature is over the
 * exact bytes Razorpay sent, and re-serializing parsed JSON can change
 * whitespace and silently break verification.
 */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  return Razorpay.validateWebhookSignature(rawBody, signature, secret);
}

/** Dedupe key for a webhook delivery — Razorpay retries are byte-identical. */
export function hashWebhookBody(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}
