import type { Capability } from "@/lib/auth/rbac";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faChartLine,
  faCircleNodes,
  faClockRotateLeft,
  faFileLines,
  faGaugeHigh,
  faImages,
  faKey,
  faLayerGroup,
  faMagnifyingGlassChart,
  faMoneyBill1Wave,
  faNewspaper,
  faQuoteLeft,
  faRectangleAd,
  faSitemap,
  faSliders,
  faStar,
  faTableColumns,
  faUsers,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";

/**
 * The admin panel's navigation, as data.
 *
 * One list drives the sidebar, the command palette and the breadcrumb trail,
 * so a screen added in one place cannot go missing from the others.
 *
 * Every entry carries the capability required to see it. The sidebar filters
 * on it, and the page itself calls `requireCapability` with the same value —
 * hiding a link is a courtesy, not a security boundary, and the two checks
 * reading the same constant is what keeps them agreeing.
 */

export interface AdminNavItem {
  href: string;
  label: string;
  description: string;
  icon: IconDefinition;
  capability: Capability;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        description: "Content health, recent activity and traffic",
        icon: faGaugeHigh,
        capability: "admin.access",
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        description: "Traffic, conversion and page performance",
        icon: faChartLine,
        capability: "admin.access",
      },
    ],
  },
  {
    label: "Landing page",
    items: [
      {
        href: "/admin/landing",
        label: "Page builder",
        description: "Section order, visibility and calls to action",
        icon: faLayerGroup,
        capability: "content.read",
      },
      {
        href: "/admin/landing/hero",
        label: "Hero",
        description: "Headline, sub-headline and buttons, per route",
        icon: faWindowMaximize,
        capability: "content.read",
      },
      {
        href: "/admin/landing/features",
        label: "Features",
        description: "The thirteen modules and the enterprise grid",
        icon: faTableColumns,
        capability: "content.read",
      },
      {
        href: "/admin/landing/pricing",
        label: "Pricing",
        description: "Tiers, amounts, limits and the recommended plan",
        icon: faMoneyBill1Wave,
        capability: "content.read",
      },
      {
        href: "/admin/landing/testimonials",
        label: "Testimonials",
        description: "Quotes, attribution and verification",
        icon: faQuoteLeft,
        capability: "content.read",
      },
      {
        href: "/admin/landing/faqs",
        label: "FAQ",
        description: "Questions, answers and where each appears",
        icon: faStar,
        capability: "content.read",
      },
      {
        href: "/admin/landing/partners",
        label: "Partners",
        description: "The works-with logo band",
        icon: faCircleNodes,
        capability: "content.read",
      },
      {
        href: "/admin/landing/announcement",
        label: "Announcement",
        description: "The banner above the hero, and its window",
        icon: faRectangleAd,
        capability: "content.read",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        href: "/admin/navigation",
        label: "Navigation",
        description: "Header mega menu and footer columns",
        icon: faSitemap,
        capability: "content.read",
      },
      {
        href: "/admin/pages",
        label: "Pages & docs",
        description: "Standalone pages and documentation",
        icon: faFileLines,
        capability: "content.read",
      },
      {
        href: "/admin/blog",
        label: "Blog",
        description: "Posts, tags and publication dates",
        icon: faNewspaper,
        capability: "content.read",
      },
      {
        href: "/admin/media",
        label: "Media library",
        description: "Images, video and documents in Supabase Storage",
        icon: faImages,
        capability: "content.read",
      },
      {
        href: "/admin/seo",
        label: "SEO",
        description: "Titles, canonicals, social cards and the sitemap",
        icon: faMagnifyingGlassChart,
        capability: "content.read",
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        href: "/admin/users",
        label: "Users & roles",
        description: "Staff accounts, customers and permissions",
        icon: faUsers,
        capability: "users.read",
      },
      {
        href: "/admin/api-keys",
        label: "API keys",
        description: "Issue, scope and revoke integration keys",
        icon: faKey,
        capability: "apikeys.manage",
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        description: "Who changed what, and when",
        icon: faClockRotateLeft,
        capability: "audit.read",
      },
      {
        href: "/admin/settings",
        label: "Settings",
        description: "Company profile and platform configuration",
        icon: faSliders,
        capability: "admin.access",
      },
    ],
  },
];

export const ALL_ADMIN_ITEMS = ADMIN_NAV.flatMap((group) => group.items);

/**
 * The nav entry for a pathname, preferring the longest match.
 *
 * `/admin/landing/hero` must resolve to the Hero entry rather than to
 * `/admin/landing`, and `/admin` must not claim every page beneath it.
 */
export function findNavItem(pathname: string): AdminNavItem | null {
  return (
    ALL_ADMIN_ITEMS.filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ).sort((a, b) => b.href.length - a.href.length)[0] ?? null
  );
}
