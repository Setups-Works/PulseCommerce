import type { PlanId } from "@/lib/billing/usage";

/**
 * Pricing, in one place.
 *
 * The landing page and /pricing both show tiers. Holding the figures here
 * means a price cannot be right on one page and stale on the other — which is
 * the specific failure that makes a visitor stop trusting the rest of the
 * numbers on the site. These are the real, billed prices — see
 * src/lib/billing/usage.ts for how the message cap and the WhatsApp gate
 * (planIncludesWhatsApp) are enforced, and
 * supabase/migrations/20260828140000_billing.sql /
 * supabase/migrations/20260907120000_lite_plan.sql for the plan values these
 * must stay in sync with (RAZORPAY_PLAN_ID_GO / _PLUS / _LITE).
 *
 * Go and Plus include every module — analytics, campaigns, flows, the
 * assistant, all of it — and differ only in how many WhatsApp messages a
 * month can go out, because that is the one thing that costs real money to
 * carry (a gateway your customers' replies flow through). Lite is a
 * different kind of tier, not a smaller Go: analytics only, no WhatsApp
 * surface at all — see ANALYTICS_MODULES / WHATSAPP_MODULES below for the
 * split, and src/proxy.ts's WHATSAPP_PAGES / WHATSAPP_API for how it's
 * actually enforced, not just advertised.
 */

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  highlight: boolean;
  cta: string;
  href: string;
  limits: string[];
  /** Whether this tier includes WhatsApp campaigns, flows and the inbox. */
  whatsapp: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "lite",
    name: "Lite",
    price: "₹1,999",
    cadence: "per month",
    blurb: "For a store that wants the analytics, not the messaging.",
    highlight: false,
    cta: "Start free",
    href: "/signup",
    whatsapp: false,
    limits: [
      "Every analytics module — RFM, cohorts, LTV, products, inventory",
      "Report exports (PDF, Excel, CSV)",
      "No WhatsApp campaigns, flows, inbox, order confirmations or assistant",
      "UPI Autopay billing, cancel anytime",
    ],
  },
  {
    id: "go",
    name: "Go",
    price: "₹3,999",
    cadence: "per month",
    blurb: "For a store sending campaigns and flows at a steady pace.",
    highlight: false,
    cta: "Start free",
    href: "/signup",
    whatsapp: true,
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
    whatsapp: true,
    limits: [
      "Unlimited WhatsApp messages",
      "Every feature included — analytics, campaigns, flows, the assistant",
      "UPI Autopay billing, cancel anytime",
    ],
  },
];

/** In every tier, Lite included. */
export const ANALYTICS_MODULES = [
  "Revenue, orders and repeat rate",
  "RFM segmentation and value tiers",
  "Predicted lifetime value",
  "Cohort retention",
  "Acquisition channels",
  "Product performance and ABC classes",
  "Market-basket affinity",
  "Inventory cover and reorder points",
  "B2B account rollups",
  "Report exports (PDF, Excel, CSV)",
];

/*
 * Go and Plus only. The assistant is here, not in ANALYTICS_MODULES, even
 * though it can answer plain analytics questions — its value is inseparable
 * from the WhatsApp actions it proposes, and src/proxy.ts gates the whole
 * page (and /api/ai/chat) rather than trying to split "answers questions"
 * from "drafts a send" at the route level.
 */
export const WHATSAPP_MODULES = [
  "WhatsApp campaigns",
  "Automated flows",
  "Order confirmations & abandoned-checkout reminders",
  "Shared inbox with customer history",
  "The assistant",
];

/** Every module, across every tier. Kept for the "no catch" framing where Go/Plus are shown alone. */
export const INCLUDED = [...ANALYTICS_MODULES, ...WHATSAPP_MODULES];
