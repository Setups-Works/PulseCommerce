import { NextResponse } from "next/server";
import { readStoreConfig } from "@/lib/store/config";
import { WooClient } from "@/lib/woo/client";

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
export async function GET() {
  const config = await readStoreConfig();
  if (!config) {
    return NextResponse.json({ error: "No WooCommerce store is connected." }, { status: 409 });
  }

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
