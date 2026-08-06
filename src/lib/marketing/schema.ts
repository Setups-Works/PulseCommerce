import { FAQ } from "@/lib/marketing/faq";
import { PLANS } from "@/lib/marketing/plans";

/**
 * JSON-LD for the marketing pages.
 *
 * Built from the same constants the pages render, not written out by hand.
 * Structured data that disagrees with the visible page is a ranking penalty
 * rather than a ranking gain, and hand-maintained JSON-LD disagrees with the
 * page the first time somebody edits one and not the other.
 *
 * SITE_URL has to be absolute for `@id`, `url` and canonical tags to resolve.
 * Vercel exposes the deployment host but not the scheme, hence the assembly
 * below; set NEXT_PUBLIC_SITE_URL in production so previews and the primary
 * domain do not both claim to be canonical.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "PulseCommerce";
export const SITE_TAGLINE = "AI Commerce Intelligence Platform for WooCommerce";
export const SITE_DESCRIPTION =
  "PulseCommerce turns your WooCommerce orders into revenue analytics, RFM segments, predicted lifetime value, churn risk, cohort retention and forecasts — then reaches those customers on WhatsApp from the same screen.";

function absolute(path: string) {
  return `${SITE_URL}${path}`;
}

const organization = {
  "@type": "Organization",
  "@id": absolute("/#organization"),
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  logo: {
    "@type": "ImageObject",
    url: absolute("/icon.svg"),
  },
};

const website = {
  "@type": "WebSite",
  "@id": absolute("/#website"),
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  publisher: { "@id": absolute("/#organization") },
  inLanguage: "en",
};

/**
 * Offers are emitted without a currency-agnostic price string: Google rejects
 * `price` unless it is a bare number, so the free tier is declared at 0 and the
 * paid tiers carry their numeric amount with an explicit currency.
 */
function offers() {
  return PLANS.map((plan) => {
    const amount = Number(plan.price.replace(/[^\d.]/g, ""));
    return {
      "@type": "Offer",
      name: plan.name,
      description: plan.blurb,
      price: Number.isFinite(amount) ? amount : 0,
      priceCurrency: "INR",
      url: absolute(plan.href),
      availability: "https://schema.org/InStock",
    };
  });
}

const softwareApplication = {
  "@type": "SoftwareApplication",
  "@id": absolute("/#software"),
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Business Intelligence",
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: { "@id": absolute("/#organization") },
  featureList: [
    "Revenue analytics",
    "Customer intelligence and RFM segmentation",
    "Customer lifetime value",
    "Churn prediction",
    "Cohort analysis",
    "Acquisition analytics",
    "Product analytics",
    "Inventory intelligence",
    "Revenue forecasting",
    "WhatsApp campaigns",
    "Automated flows",
    "AI commerce agent",
    "Report exports",
  ],
  offers: offers(),
};

const faqPage = {
  "@type": "FAQPage",
  "@id": absolute("/#faq"),
  mainEntity: FAQ.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

const breadcrumb = {
  "@type": "BreadcrumbList",
  "@id": absolute("/#breadcrumb"),
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Features", item: absolute("/features") },
    { "@type": "ListItem", position: 3, name: "Pricing", item: absolute("/pricing") },
  ],
};

/**
 * One `@graph` rather than several separate script tags: the nodes cross-
 * reference each other by `@id`, and a parser only resolves those references
 * within a single document.
 */
export function landingSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [organization, website, softwareApplication, faqPage, breadcrumb],
  };
}
