import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStore, requireWrite } from "@/lib/auth/tenant";
import { WooApiError, WooClient } from "@/lib/woo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Coupons that exist in WooCommerce, for attaching a code to a message.
 *
 * Read straight from the store rather than the snapshot: a coupon created five
 * minutes ago should be usable now, and there are few enough of them that the
 * request is cheap. Coupons are deliberately not created here — the issued key
 * carries read scope, which is the guarantee this app is built on.
 */
export async function GET(request: Request) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;
  const { store } = resolved.value;
  const config = { url: store.url, consumerKey: store.consumerKey, consumerSecret: store.consumerSecret };

  try {
    const coupons = await new WooClient(config).getCoupons();
    const now = Date.now();

    return NextResponse.json({
      coupons: coupons
        .map((coupon) => {
          const expired = coupon.date_expires
            ? new Date(coupon.date_expires).getTime() < now
            : false;
          const exhausted =
            coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit;

          return {
            id: coupon.id,
            code: coupon.code,
            discountType: coupon.discount_type,
            amount: coupon.amount,
            expires: coupon.date_expires,
            usageLimit: coupon.usage_limit,
            usageCount: coupon.usage_count,
            minimumAmount: coupon.minimum_amount,
            // Sending a code that cannot be redeemed is worse than sending none,
            // so the state travels with it rather than being discovered at checkout.
            usable: !expired && !exhausted,
            reason: expired ? "expired" : exhausted ? "usage limit reached" : null,
          };
        })
        // Usable ones first; a spent coupon is still worth showing so its absence
        // from the list is never mistaken for the coupon not existing.
        .sort((a, b) => Number(b.usable) - Number(a.usable) || a.code.localeCompare(b.code)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read coupons." },
      { status: 502 },
    );
  }
}


const createSchema = z.object({
  /** Left blank to generate one, which is the usual case for a campaign. */
  code: z.string().max(40).optional(),
  discountType: z.enum(["percent", "fixed_cart", "fixed_product"]).default("percent"),
  amount: z.coerce.number().positive().max(100000),
  /** Days from now. Campaign codes want an end date, or they linger forever. */
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
  /** Total redemptions allowed across everyone. */
  usageLimit: z.coerce.number().int().min(1).max(100000).optional(),
  /** Redemptions allowed per customer. One is the sane campaign default. */
  usageLimitPerUser: z.coerce.number().int().min(1).max(100).default(1),
  /** Restricts the code to the product the campaign is about. */
  productIds: z.array(z.number().int()).optional(),
});

/**
 * Creates a coupon in WooCommerce.
 *
 * This is the only endpoint in the application that writes to the store, and
 * the only reason the authorization asks for read_write at all. A percentage
 * over 100 is refused before it reaches WooCommerce, because a coupon worth
 * more than the order is a mistake nobody wants to discover from a customer.
 */
export async function POST(request: Request) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;

  // Creating a coupon costs the merchant money, so it needs write scope.
  const denied = requireWrite(resolved.value.tenant);
  if (denied) return denied;

  const { store } = resolved.value;
  const config = { url: store.url, consumerKey: store.consumerKey, consumerSecret: store.consumerSecret };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 422 },
    );
  }

  const input = parsed.data;
  if (input.discountType === "percent" && input.amount > 100) {
    return NextResponse.json(
      { error: "A percentage discount cannot exceed 100%." },
      { status: 422 },
    );
  }

  const expires = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString().slice(0, 10)
    : null;

  try {
    const coupon = await new WooClient(config).createCoupon({
      code: (input.code?.trim() || generateCode()).toUpperCase(),
      discount_type: input.discountType,
      amount: String(input.amount),
      date_expires: expires,
      usage_limit: input.usageLimit ?? null,
      usage_limit_per_user: input.usageLimitPerUser,
      individual_use: true,
      ...(input.productIds?.length ? { product_ids: input.productIds } : {}),
      description: "Created by PulseCommerce for a WhatsApp campaign",
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    if (error instanceof WooApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The coupon could not be created." },
      { status: 500 },
    );
  }
}

/**
 * A short, unambiguous code.
 *
 * No O/0 or I/1: these get read off a phone screen and typed at a checkout,
 * and a code nobody can transcribe is a discount nobody redeems.
 */
function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
