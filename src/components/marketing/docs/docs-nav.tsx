/**
 * The single source of truth for the docs sidebar.
 *
 * Same reasoning as `MENU` in `site-header.tsx`: one constant driving both the
 * desktop sidebar and the mobile drawer means a guide added to one appears in
 * the other, and the two cannot drift apart.
 */
export interface DocsNavItem {
  label: string;
  href: string;
  description: string;
}

export const DOCS_NAV: DocsNavItem[] = [
  {
    label: "Getting started",
    href: "/docs/getting-started",
    description: "Connect a store, sync it, make your first call",
  },
  {
    label: "Authentication",
    href: "/docs/authentication",
    description: "API keys, scopes, and how a request is checked",
  },
  {
    label: "CLI reference",
    href: "/docs/cli",
    description: "Sign in with pulse login, and its full command set",
  },
  {
    label: "SDK",
    href: "/docs/sdk",
    description: "The typed client the CLI is built on",
  },
  {
    label: "Analytics & sync",
    href: "/docs/analytics-and-sync",
    description: "The mirror model, and every read endpoint",
  },
  {
    label: "Campaigns",
    href: "/docs/campaigns",
    description: "Preview, confirm, broadcast — and flows",
  },
];
