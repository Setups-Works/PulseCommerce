import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Verification for WooCommerce's own webhook signing.
 *
 * Parallel to src/lib/billing/razorpay.ts's verifyWebhookSignature, but the
 * secret here is per-store rather than a single global env var: WooCommerce
 * signs every delivery as base64(HMAC-SHA256(raw body, the secret we handed
 * it at registration)), and we hand each store a different one so one
 * store's secret leaking never lets someone forge a delivery for another.
 */
export function verifyWooWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();

  let presented: Buffer;
  try {
    presented = Buffer.from(signatureHeader, "base64");
  } catch {
    return false;
  }

  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

/** A fresh per-store secret, generated when order confirmations are enabled and handed to WooCommerce at registration. */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}
