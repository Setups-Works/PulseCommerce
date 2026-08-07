import "server-only";

import * as repo from "@/repositories/content-repository";
import { FAQ as DEFAULT_FAQ, LANDING_FAQ as DEFAULT_LANDING_FAQ } from "@/lib/marketing/faq";
import { PLANS as DEFAULT_PLANS, type Plan } from "@/lib/marketing/plans";

/**
 * The content the marketing pages render.
 *
 * Sits between the repository and the components and does exactly two things:
 *
 *   1. Falls back. Every getter returns the compiled-in default when the CMS
 *      has nothing to say — because Supabase is not configured, because the
 *      table is empty, or because the request failed. The landing page then
 *      renders identically to how it did before any of this existed, which is
 *      the whole requirement: dynamic content, unchanged appearance.
 *
 *   2. Maps to view models. Components take the shapes they already took, so
 *      making a section dynamic is a change to where its data comes from and
 *      not to how it renders.
 *
 * The defaults are not duplicated copy. They are the same arrays the pages
 * used before, still living in lib/marketing/, and the seed migration inserted
 * those same strings into the database. One source, two homes, deliberately —
 * the file is what a fresh clone gets, the row is what an editor changes.
 */

/* ---------------------------------------------------------------------------
   Hero
   ------------------------------------------------------------------------ */

export interface HeroContent {
  eyebrow: string | null;
  headline: string;
  headlineAccent: string | null;
  headlineAfter: string | null;
  subheadline: string | null;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string } | null;
  trustPoints: string[];
}

/**
 * Defaults keyed by route, mirroring the seed migration.
 *
 * Kept here rather than inside each page component so that a page which has no
 * row yet, and a page whose row was deleted, both render the same thing.
 */
const HERO_DEFAULTS: Record<string, HeroContent> = {
  "/": {
    eyebrow: "Flows and the AI assistant are live",
    headline: "Know who buys.",
    headlineAccent: "Win them back",
    headlineAfter: "on WhatsApp.",
    subheadline:
      "WooCommerce tells you what sold. PulseCommerce tells you who bought it, which of them is slipping away, and what to say to bring them back — from one screen.",
    primaryCta: { label: "Connect your store", href: "/connect" },
    secondaryCta: { label: "See WhatsApp in action", href: "/whatsapp" },
    trustPoints: ["Read-only access", "No per-message fee", "Self-hosted", "Your data stays yours"],
  },
};

export async function getHero(route: string): Promise<HeroContent | null> {
  const row = await repo.getHero(route);
  const fallback = HERO_DEFAULTS[route] ?? null;
  if (!row) return fallback;

  return {
    eyebrow: row.eyebrow,
    headline: row.headline,
    headlineAccent: row.headline_accent,
    headlineAfter: row.headline_after,
    subheadline: row.subheadline,
    primaryCta: {
      label: row.primary_cta_label ?? fallback?.primaryCta.label ?? "Connect your store",
      href: row.primary_cta_href ?? fallback?.primaryCta.href ?? "/connect",
    },
    secondaryCta:
      row.secondary_cta_label && row.secondary_cta_href
        ? { label: row.secondary_cta_label, href: row.secondary_cta_href }
        : null,
    trustPoints: row.trust_points ?? [],
  };
}

/* ---------------------------------------------------------------------------
   Pricing
   ------------------------------------------------------------------------ */

/**
 * Formats an amount the way the page shows it.
 *
 * The database stores a number and a currency rather than "₹3,999" so the
 * value can be compared and localised; the string is rebuilt here. Plans with
 * no amount (free, self-hosted) carry a `price_label` instead.
 */
function formatPrice(amount: number | null, currency: string, label: string | null): string {
  if (amount === null) return label ?? "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function getPricingPlans(): Promise<Plan[]> {
  const rows = await repo.getPricingPlans();
  if (rows.length === 0) return DEFAULT_PLANS;

  return rows.map((row) => ({
    name: row.name,
    price: formatPrice(row.amount === null ? null : Number(row.amount), row.currency, row.price_label),
    cadence: row.cadence,
    blurb: row.blurb ?? "",
    highlight: row.is_highlighted,
    cta: row.cta_label,
    href: row.cta_href,
    limits: row.limits ?? [],
  }));
}

/* ---------------------------------------------------------------------------
   FAQ
   ------------------------------------------------------------------------ */

export interface FaqEntry {
  question: string;
  answer: string;
}

export async function getFaqs(landingOnly = false): Promise<FaqEntry[]> {
  const rows = await repo.getFaqs(landingOnly);
  if (rows.length === 0) return landingOnly ? DEFAULT_LANDING_FAQ : DEFAULT_FAQ;
  return rows.map(({ question, answer }) => ({ question, answer }));
}

/* ---------------------------------------------------------------------------
   Testimonials
   ------------------------------------------------------------------------ */

export interface Testimonial {
  quote: string;
  role: string;
  context: string;
  isVerified: boolean;
}

/**
 * Returns an empty list when nothing is published.
 *
 * Deliberately no fabricated fallback: the seed inserts the placeholder quotes
 * as *drafts*, so an unconfigured or empty deployment shows no testimonials at
 * all rather than presenting invented ones as real. The section handles the
 * empty case by not rendering.
 */
export async function getTestimonials(): Promise<Testimonial[]> {
  const rows = await repo.getTestimonials();
  return rows.map((row) => ({
    quote: row.quote,
    role: row.author_role,
    context: row.author_context ?? "",
    isVerified: row.is_verified,
  }));
}

/* ---------------------------------------------------------------------------
   Partners, navigation, footer, company
   ------------------------------------------------------------------------ */

export interface PartnerMark {
  name: string;
  iconSlug: string | null;
}

const DEFAULT_PARTNERS: PartnerMark[] = [
  { name: "WooCommerce", iconSlug: "woocommerce" },
  { name: "WordPress", iconSlug: "wordpress" },
  { name: "WhatsApp", iconSlug: "whatsapp" },
  { name: "Meta", iconSlug: "meta" },
  { name: "Stripe", iconSlug: "stripe" },
  { name: "Razorpay", iconSlug: "razorpay" },
  { name: "Google Analytics", iconSlug: "googleanalytics" },
  { name: "Google Sheets", iconSlug: "googlesheets" },
];

export async function getPartners(): Promise<PartnerMark[]> {
  const rows = await repo.getPartners("stack");
  if (rows.length === 0) return DEFAULT_PARTNERS;
  return rows.map((row) => ({ name: row.name, iconSlug: row.icon_slug }));
}

export interface FooterColumn {
  label: string;
  links: { label: string; href: string; newTab: boolean }[];
}

const DEFAULT_FOOTER: FooterColumn[] = [
  {
    label: "Product",
    links: [
      { label: "Features", href: "/features", newTab: false },
      { label: "Campaigns", href: "/features/campaigns", newTab: false },
      { label: "AI assistant", href: "/features/ai", newTab: false },
      { label: "WhatsApp", href: "/whatsapp", newTab: false },
      { label: "Integrations", href: "/integrations", newTab: false },
      { label: "Pricing", href: "/pricing", newTab: false },
      { label: "API reference", href: "/api-docs", newTab: false },
    ],
  },
  {
    label: "Platform",
    links: [
      { label: "WooCommerce", href: "/integrations", newTab: false },
      { label: "Shopify — soon", href: "/integrations#shopify", newTab: false },
      { label: "Your own WhatsApp host", href: "/pricing#delivery", newTab: false },
      { label: "WhatsApp Cloud API", href: "/pricing#delivery", newTab: false },
      { label: "Webhooks", href: "/api-docs", newTab: false },
    ],
  },
  {
    label: "Start",
    links: [
      { label: "Get started", href: "/connect", newTab: false },
      { label: "Log in", href: "/login", newTab: false },
      { label: "Open the app", href: "/dashboard", newTab: false },
      { label: "FAQ", href: "/pricing#faq", newTab: false },
    ],
  },
];

/**
 * Footer links, grouped into columns.
 *
 * Rows arrive flat with a `column_label`; the grouping is rebuilt here in
 * first-seen order so the column sequence is controlled by `position` on the
 * first link of each column rather than by alphabetical accident.
 */
export async function getFooterColumns(): Promise<FooterColumn[]> {
  const rows = await repo.getFooterLinks();
  if (rows.length === 0) return DEFAULT_FOOTER;

  const columns = new Map<string, FooterColumn>();
  for (const row of rows) {
    let column = columns.get(row.column_label);
    if (!column) {
      column = { label: row.column_label, links: [] };
      columns.set(row.column_label, column);
    }
    column.links.push({ label: row.label, href: row.href, newTab: row.opens_in_new_tab });
  }
  return [...columns.values()];
}

export interface CompanyProfile {
  name: string;
  tagline: string;
  description: string;
  socialLinks: { label: string; href: string; icon: string }[];
  copyright: string;
}

const DEFAULT_COMPANY: CompanyProfile = {
  name: "PulseCommerce",
  tagline: "AI Commerce Intelligence Platform",
  description:
    "AI commerce intelligence for WooCommerce stores that would rather act on their numbers than read them.",
  socialLinks: [
    { label: "GitHub", href: "https://github.com", icon: "github" },
    { label: "X", href: "https://x.com", icon: "x" },
    { label: "Email us", href: "mailto:hello@pulsecommerce.io", icon: "mail" },
  ],
  copyright: "© 2026 PulseCommerce. Self-hosted, and yours.",
};

export async function getCompany(): Promise<CompanyProfile> {
  const row = await repo.getCompany();
  if (!row) return DEFAULT_COMPANY;

  const social = Array.isArray(row.social_links)
    ? (row.social_links as { label?: string; href?: string; icon?: string }[])
        .filter((entry) => entry.label && entry.href)
        .map((entry) => ({
          label: entry.label!,
          href: entry.href!,
          icon: entry.icon ?? "link",
        }))
    : DEFAULT_COMPANY.socialLinks;

  return {
    name: row.name,
    tagline: row.tagline ?? DEFAULT_COMPANY.tagline,
    description: row.description ?? DEFAULT_COMPANY.description,
    socialLinks: social.length > 0 ? social : DEFAULT_COMPANY.socialLinks,
    copyright: row.copyright_notice ?? DEFAULT_COMPANY.copyright,
  };
}

/* ---------------------------------------------------------------------------
   Announcement
   ------------------------------------------------------------------------ */

export interface Announcement {
  message: string;
  badgeLabel: string | null;
  href: string | null;
  linkLabel: string | null;
}

const DEFAULT_ANNOUNCEMENT: Announcement = {
  message: "Flows and the AI assistant are live",
  badgeLabel: "New",
  href: "/features/ai",
  linkLabel: "See the agent",
};

export async function getAnnouncement(): Promise<Announcement | null> {
  const row = await repo.getActiveAnnouncement();
  if (!row) return DEFAULT_ANNOUNCEMENT;
  return {
    message: row.message,
    badgeLabel: row.badge_label,
    href: row.href,
    linkLabel: row.link_label,
  };
}
