/**
 * Pricing, in one place.
 *
 * The landing page and /pricing both show tiers. Holding the figures here
 * means a price cannot be right on one page and stale on the other — which is
 * the specific failure that makes a visitor stop trusting the rest of the
 * numbers on the site.
 *
 * PLACEHOLDER FIGURES. The amounts below are structure, not a commercial
 * decision — set them before this page is public.
 *
 * Tier names describe store size rather than feature sets, because every tier
 * includes every module. Gating analytics behind a higher tier would mean the
 * product tells a small store less about its customers than it knows, which is
 * the opposite of what it is for.
 */

export interface Plan {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  highlight: boolean;
  cta: string;
  href: string;
  limits: string[];
}

export const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "₹1,499",
    cadence: "per month",
    blurb: "One store, and the full product.",
    highlight: false,
    cta: "Start free",
    href: "/signup",
    limits: [
      "1 connected store",
      "Up to 2,000 orders of history",
      "12 months of history",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "₹3,999",
    cadence: "per month",
    blurb: "The tier most stores settle on.",
    highlight: true,
    cta: "Start free",
    href: "/signup",
    limits: [
      "3 connected stores",
      "Up to 50,000 orders of history",
      "36 months of history",
      "Priority support",
    ],
  },
  {
    name: "Self-hosted",
    price: "Free",
    cadence: "forever",
    blurb: "Run it on your own infrastructure.",
    highlight: false,
    cta: "Read the docs",
    href: "/api-docs",
    limits: ["Unlimited stores", "Unlimited history", "Your own database", "Community support"],
  },
];

/** Every module, in every tier. The list exists to prove there is no catch. */
export const INCLUDED = [
  "Revenue, orders and repeat rate",
  "RFM segmentation and value tiers",
  "Predicted lifetime value",
  "Cohort retention",
  "Acquisition channels",
  "Product performance and ABC classes",
  "Market-basket affinity",
  "Inventory cover and reorder points",
  "B2B account rollups",
  "WhatsApp campaigns",
  "Automated flows",
  "The assistant",
  "Report exports (PDF, Excel, CSV)",
];
