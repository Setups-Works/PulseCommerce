/**
 * Pricing, in one place.
 *
 * The landing page and /pricing both show tiers. Holding the figures here
 * means a price cannot be right on one page and stale on the other — which is
 * the specific failure that makes a visitor stop trusting the rest of the
 * numbers on the site. These are the real, billed prices — see
 * src/lib/billing/usage.ts for how the message cap is enforced and
 * supabase/migrations/20260828140000_billing.sql for the plan values these
 * must stay in sync with (RAZORPAY_PLAN_ID_GO / RAZORPAY_PLAN_ID_PLUS).
 *
 * Every tier includes every module — analytics, flows, the assistant, all of
 * it. The only thing that differs between them is how many WhatsApp messages
 * a month can go out, because that is the one thing that costs real money to
 * carry (a gateway your customers' replies flow through) rather than compute
 * this app already has to do regardless of who's asking.
 */

export interface Plan {
  id: "go" | "plus";
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
    id: "go",
    name: "Go",
    price: "₹3,999",
    cadence: "per month",
    blurb: "For a store sending campaigns and flows at a steady pace.",
    highlight: false,
    cta: "Start free",
    href: "/signup",
    limits: [
      "10,000 WhatsApp messages per month",
      "Every feature included — analytics, campaigns, flows, the assistant",
      "UPI Autopay billing, cancel anytime",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "₹5,999",
    cadence: "per month",
    blurb: "For a store that doesn't want to think about a message count.",
    highlight: true,
    cta: "Start free",
    href: "/signup",
    limits: [
      "Unlimited WhatsApp messages",
      "Every feature included — analytics, campaigns, flows, the assistant",
      "UPI Autopay billing, cancel anytime",
    ],
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
