import * as React from "react";
import {
  siGoogleanalytics,
  siGooglesheets,
  siMeta,
  siRazorpay,
  siShopify,
  siStripe,
  siWhatsapp,
  siWoocommerce,
  siWordpress,
  type SimpleIcon,
} from "simple-icons";
import { cn } from "@/lib/utils";

/**
 * Third-party brand marks, from Simple Icons.
 *
 * Real logos rather than lucide approximations: a visitor scanning an
 * integrations row is looking for the specific mark of the thing they already
 * run, and a generic shopping-bag glyph does not answer that question.
 *
 * Pulled in as named imports from the package's ESM entry so the bundler can
 * drop the rest — the set is some three thousand icons, and a namespace import
 * would defeat tree-shaking and ship every one of them.
 *
 * Marks render monochrome by default and take their brand colour only on
 * hover. Nine saturated logos sitting in a row would be the loudest thing on a
 * page whose whole palette is one blue, and it would fight the chart colours
 * that actually carry meaning. `brandColor` is there for the cases where a
 * single mark is the subject rather than one of a set.
 */

export interface BrandMarkProps extends Omit<React.ComponentProps<"svg">, "children"> {
  icon: SimpleIcon;
  /** Paints the mark in its own brand colour rather than inheriting text colour. */
  brandColor?: boolean;
}

export function BrandMark({ icon, brandColor = false, className, ...props }: BrandMarkProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-6", className)}
      fill={brandColor ? `#${icon.hex}` : "currentColor"}
      {...props}
    >
      <title>{icon.title}</title>
      <path d={icon.path} />
    </svg>
  );
}

export const BRANDS = {
  woocommerce: siWoocommerce,
  wordpress: siWordpress,
  whatsapp: siWhatsapp,
  meta: siMeta,
  stripe: siStripe,
  razorpay: siRazorpay,
  googleAnalytics: siGoogleanalytics,
  googleSheets: siGooglesheets,
  shopify: siShopify,
} as const;
