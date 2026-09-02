/**
 * The public changelog.
 *
 * Every entry here corresponds to a real, shipped commit — nothing is
 * invented for the page. Entries are grouped by the date they actually
 * shipped and kept in the product's own voice (see README.md), not
 * translated into generic release-note filler.
 *
 * What's deliberately left out: pure internal refactors with no visible
 * effect, and the handful of early experiments this project tried and
 * dropped along the way (a generic multi-tenant admin panel on HeroUI, a
 * couple of alternate landing-page layouts, a promo video and social
 * assets) — a changelog describes the product as it exists, not everything
 * that was ever tried on the way there.
 */

export type ChangeKind = "new" | "improved" | "fixed";

export interface ChangeEntry {
  kind: ChangeKind;
  text: string;
}

export interface ChangelogRelease {
  /** ISO date, YYYY-MM-DD — the date these commits actually shipped. */
  date: string;
  /** A short label for the release, when one entry deserves a name. */
  title?: string;
  changes: ChangeEntry[];
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    date: "2026-09-01",
    title: "A 14-day free trial",
    changes: [
      {
        kind: "new",
        text: "Both plans now include a one-time 14-day free trial. The UPI Autopay mandate is set up immediately, exactly like a normal subscription — Razorpay just defers the first real charge two weeks, so nothing further is needed from you or from us when the trial ends.",
      },
      {
        kind: "fixed",
        text: "Settings → Billing could show a phantom \"9,998 of 10,000 messages remaining\" for an account with no active plan at all. It now correctly shows zero until a plan is actually active.",
      },
      {
        kind: "improved",
        text: "Analytics, customer profiles and invoice PDFs load faster on repeat visits, cached per signed-in account.",
      },
    ],
  },
  {
    date: "2026-08-31",
    changes: [
      {
        kind: "fixed",
        text: "Razorpay billing events and abandoned-checkout recovery are reachable again — both had been silently blocked before reaching their own handlers.",
      },
      {
        kind: "fixed",
        text: "Closing the payment window mid-checkout no longer leaves Settings stuck showing a plan that was never actually paid for.",
      },
    ],
  },
  {
    date: "2026-08-30",
    title: "WhatsApp order confirmations",
    changes: [
      {
        kind: "new",
        text: "A customer now gets a WhatsApp thank-you — order number, a photo of what they bought, and a note — within seconds of placing an order, sent the moment WooCommerce reports it, not on the next sync.",
      },
    ],
  },
  {
    date: "2026-08-28",
    title: "Billing, abandoned checkouts, and a reorganized Settings",
    changes: [
      {
        kind: "new",
        text: "Monthly subscription billing: Go (₹3,999/mo, 10,000 WhatsApp messages) and Plus (₹5,999/mo, unlimited), billed by UPI Autopay through Razorpay.",
      },
      {
        kind: "new",
        text: "Abandoned-checkout recovery — a WhatsApp reminder for a checkout left pending, on-hold or failed, sent once a real order and never for a store's pre-existing backlog.",
      },
      {
        kind: "new",
        text: "A password reset flow, reachable from both the login page and Settings.",
      },
      {
        kind: "improved",
        text: "Settings is now organized into a sidebar (Store, WhatsApp, Billing, Security, Developer, About) instead of one long page.",
      },
      {
        kind: "new",
        text: "A banner now appears on every page when an account has no active subscription, so a blocked WhatsApp send is never a silent mystery.",
      },
      {
        kind: "fixed",
        text: "The \"All time\" date range now actually means all time, instead of occasionally freezing on a stale window.",
      },
      {
        kind: "fixed",
        text: "The mobile sidebar no longer overlaps page content on small screens.",
      },
      {
        kind: "fixed",
        text: "A password-recovery link now lands on the reset-password screen instead of the home page.",
      },
      {
        kind: "fixed",
        text: "Two labels in the \"Product\" navigation menu were truncating mid-word.",
      },
    ],
  },
  {
    date: "2026-08-25",
    changes: [
      {
        kind: "fixed",
        text: "A WhatsApp gateway connection is stored per account again, not shared across every signed-in user.",
      },
    ],
  },
  {
    date: "2026-08-21",
    title: "A developer platform",
    changes: [
      {
        kind: "new",
        text: "A full REST API reference, an SDK, and a CLI (pulsecommerce-sdk / pulsecommerce-cli on npm), with browser-based login for the CLI.",
      },
    ],
  },
  {
    date: "2026-08-12",
    changes: [
      {
        kind: "fixed",
        text: "The store-connect flow completes reliably and signed-in state shows correctly right after.",
      },
      {
        kind: "fixed",
        text: "A store's first sync now finishes properly instead of appearing stuck partway through.",
      },
      {
        kind: "improved",
        text: "Database and scheduled jobs moved to a Mumbai region, for lower latency on Indian stores.",
      },
    ],
  },
  {
    date: "2026-08-11",
    title: "Multi-tenant, with a full WooCommerce mirror",
    changes: [
      {
        kind: "new",
        text: "PulseCommerce became a real multi-tenant product: any number of independent accounts, each with their own connected store, API keys, and WhatsApp connection.",
      },
      {
        kind: "new",
        text: "A local mirror of each store's orders, customers and products, kept in sync automatically — every metric now computes from that snapshot instead of calling WooCommerce live on every page load.",
      },
      {
        kind: "new",
        text: "The API reference moved to a proper interactive viewer (Scalar) instead of a static spec file.",
      },
    ],
  },
  {
    date: "2026-08-01",
    title: "Foundations",
    changes: [
      {
        kind: "new",
        text: "The original analytics engine: revenue, orders, RFM customer segmentation, predicted lifetime value, cohort retention, product ABC analysis, and inventory reorder planning — computed from a WooCommerce store connected through its own app-authorization flow.",
      },
      {
        kind: "new",
        text: "WhatsApp campaigns, sent through a self-hosted gateway you run yourself — audience builder, dry-run preview, coupon attachment, and product-aware message templates.",
      },
      {
        kind: "new",
        text: "A shared WhatsApp inbox, with every conversation matched to the customer behind it.",
      },
      {
        kind: "new",
        text: "Multi-step automated flows, advanced on a daily schedule.",
      },
      {
        kind: "new",
        text: "An AI assistant that reads the store and proposes actions — it never sends or changes anything without a human approving it first.",
      },
      {
        kind: "new",
        text: "Report exports to Excel, PDF and CSV, plus a command palette and full keyboard navigation.",
      },
    ],
  },
];
