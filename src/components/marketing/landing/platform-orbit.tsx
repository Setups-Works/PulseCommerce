import * as React from "react";
import { Activity } from "lucide-react";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { cn } from "@/lib/utils";

/**
 * The platforms, in two rings around the product.
 *
 * Inner ring: what it reads from and writes to today. Outer ring, slower and
 * counter-rotating: payment and analytics context, plus Shopify, which is not
 * built yet.
 *
 * Counter-rotation is not decoration. Two rings turning the same way read as
 * one solid disc; opposite directions keep them legible as two distinct sets,
 * which is the distinction being made.
 *
 * Shared by the landing page and /integrations. Both make the same claim with
 * the same logos, and two copies of a ring of moving brand marks is one copy
 * too many — the lists below are the single source for both.
 *
 * The orbit is always `aria-hidden`; `PlatformList` is the accessible and
 * indexable copy, and every caller renders it.
 */

export const INNER_PLATFORMS = [
  { icon: BRANDS.woocommerce, label: "WooCommerce" },
  { icon: BRANDS.whatsapp, label: "WhatsApp" },
  { icon: BRANDS.wordpress, label: "WordPress" },
  { icon: BRANDS.meta, label: "Meta" },
];

export const OUTER_PLATFORMS = [
  { icon: BRANDS.stripe, label: "Stripe" },
  { icon: BRANDS.razorpay, label: "Razorpay" },
  { icon: BRANDS.googleAnalytics, label: "Google Analytics" },
  { icon: BRANDS.googleSheets, label: "Google Sheets" },
  { icon: BRANDS.shopify, label: "Shopify" },
];

export const ALL_PLATFORMS = [...INNER_PLATFORMS, ...OUTER_PLATFORMS];

function OrbitIcon({ children, size = "size-11" }: { children: React.ReactNode; size?: string }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-foreground/10",
        "shadow-[0_2px_10px_-3px_rgb(0_0_0/0.2)]",
        size,
      )}
    >
      {children}
    </span>
  );
}

export function PlatformOrbit({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative mx-auto flex aspect-square w-full max-w-md items-center justify-center",
        className,
      )}
    >
      <div className="absolute size-20 rounded-2xl bg-primary/10 blur-2xl" />
      <span className="relative z-10 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_28px_-8px_color-mix(in_oklch,var(--primary)_70%,transparent)]">
        <Activity className="size-8" strokeWidth={2.25} />
      </span>

      <OrbitingCircles radius={95} duration={26} iconSize={44} path>
        {INNER_PLATFORMS.map(({ icon, label }) => (
          <OrbitIcon key={label}>
            <BrandMark icon={icon} className="size-5" />
          </OrbitIcon>
        ))}
      </OrbitingCircles>

      <OrbitingCircles radius={156} duration={38} iconSize={38} reverse path>
        {OUTER_PLATFORMS.map(({ icon, label }) => (
          <OrbitIcon key={label} size="size-9.5">
            <BrandMark icon={icon} className="size-4.5" />
          </OrbitIcon>
        ))}
      </OrbitingCircles>
    </div>
  );
}

/** The orbit's contents as a plain list — what a screen reader and a crawler get. */
export function PlatformList({ className }: { className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3", className)}>
      {ALL_PLATFORMS.map(({ icon, label }) => (
        <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
          <BrandMark icon={icon} className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </li>
      ))}
    </ul>
  );
}
