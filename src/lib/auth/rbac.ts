import type { Database } from "@/types/database";

/**
 * Roles, and what each one may do.
 *
 * The ladder mirrors the `app_role` enum in the foundation migration, and the
 * order is the hierarchy in both places. Keeping the numbers here rather than
 * re-deriving them from the enum is deliberate: TypeScript cannot see Postgres
 * enum ordering, so the rank has to be stated once and the two kept in step by
 * the comment below.
 *
 * ⚠ If you add a role, add it to `supabase/migrations/*_foundation.sql` in the
 * same commit and give it a rank here. A role present in one and not the other
 * fails open in whichever layer does not know about it.
 */

export type AppRole = Database["public"]["Enums"]["app_role"];

const RANK: Record<AppRole, number> = {
  customer: 0,
  viewer: 1,
  support: 2,
  editor: 3,
  admin: 4,
};

/** The lowest role that may open the admin panel at all. */
export const MIN_STAFF_ROLE: AppRole = "viewer";

export function rankOf(role: AppRole): number {
  return RANK[role] ?? 0;
}

export function hasMinRole(role: AppRole | null | undefined, minimum: AppRole): boolean {
  if (!role) return false;
  return rankOf(role) >= rankOf(minimum);
}

/**
 * Staff can see the admin panel. A `customer` is a paying user of the product
 * and is explicitly not staff — the boundary the whole role model exists for.
 */
export function isStaff(role: AppRole | null | undefined): boolean {
  return hasMinRole(role, MIN_STAFF_ROLE);
}

export const ROLE_LABELS: Record<AppRole, string> = {
  customer: "Customer",
  viewer: "Viewer",
  support: "Support",
  editor: "Editor",
  admin: "Admin",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  customer: "Uses the product. No access to the admin panel.",
  viewer: "Read-only access to the admin panel.",
  support: "Reads the admin panel and looks up customer accounts.",
  editor: "Edits site content, media and SEO.",
  admin: "Everything, including users, roles, settings and API keys.",
};

/**
 * Capabilities, named rather than checked inline.
 *
 * A screen asks `can(role, "content.write")` instead of
 * `hasMinRole(role, "editor")`. When the rule for editing content changes, it
 * changes here rather than in every component that happened to encode it.
 */
export const CAPABILITIES = {
  "admin.access": "viewer",
  "content.read": "viewer",
  "content.write": "editor",
  "content.publish": "editor",
  "media.upload": "editor",
  "media.delete": "editor",
  "seo.write": "editor",
  "customers.read": "support",
  "users.read": "admin",
  "users.write": "admin",
  "settings.write": "admin",
  "apikeys.manage": "admin",
  "audit.read": "admin",
} as const satisfies Record<string, AppRole>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: AppRole | null | undefined, capability: Capability): boolean {
  return hasMinRole(role, CAPABILITIES[capability]);
}
