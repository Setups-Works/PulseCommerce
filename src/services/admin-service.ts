import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Aggregates for the admin dashboard.
 *
 * Counts are fetched with `head: true` and an exact count, so Postgres returns
 * a number rather than the rows — a media library of ten thousand assets costs
 * the same here as one of ten.
 *
 * Every query runs as the signed-in user, so row level security still applies:
 * a `viewer` sees the same counts an `admin` does because the content policies
 * grant staff read on everything, but nothing here can be used to read past
 * what the caller is allowed to see.
 */

export interface ContentWarning {
  title: string;
  detail: string;
  badge: string;
  href: string;
}

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  when: string;
}

export interface ContentHealth {
  publishedSections: number;
  draftSections: number;
  mediaCount: number;
  pageCount: number;
  postCount: number;
  staffCount: number;
  customerCount: number;
  warnings: ContentWarning[];
  recentActivity: ActivityEntry[];
}

const EMPTY: ContentHealth = {
  publishedSections: 0,
  draftSections: 0,
  mediaCount: 0,
  pageCount: 0,
  postCount: 0,
  staffCount: 0,
  customerCount: 0,
  warnings: [],
  recentActivity: [],
};

/** Relative time, to the nearest sensible unit. */
function ago(iso: string): string {
  const seconds = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 1000));
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
  ];

  let value = seconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (const [step, nextUnit] of units) {
    if (value < step) break;
    value = value / step;
    unit = nextUnit;
  }

  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-Math.round(value), unit);
}

export async function getContentHealth(): Promise<ContentHealth> {
  const supabase = await createClient();

  try {
    const [
      publishedHero,
      draftHero,
      media,
      pages,
      posts,
      staff,
      customers,
      unverifiedTestimonials,
      draftTestimonials,
      logs,
    ] = await Promise.all([
      supabase.from("hero_sections").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("hero_sections").select("*", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("media").select("*", { count: "exact", head: true }),
      supabase.from("pages").select("*", { count: "exact", head: true }),
      supabase.from("blog_posts").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).neq("role", "customer"),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "customer"),
      supabase
        .from("testimonials")
        .select("*", { count: "exact", head: true })
        .eq("is_verified", false),
      supabase.from("testimonials").select("*", { count: "exact", head: true }).eq("status", "draft"),
      supabase
        .from("audit_logs")
        .select("id, action, entity, actor_email, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const warnings: ContentWarning[] = [];

    if ((unverifiedTestimonials.count ?? 0) > 0) {
      warnings.push({
        title: "Testimonials are unverified",
        detail: `${unverifiedTestimonials.count} quote(s) have not been confirmed as real and permitted to publish.`,
        badge: "Placeholder",
        href: "/admin/landing/testimonials",
      });
    }

    if ((draftTestimonials.count ?? 0) > 0) {
      warnings.push({
        title: "Testimonials section is empty on the site",
        detail: `${draftTestimonials.count} quote(s) are in draft, so the section does not render.`,
        badge: "Draft",
        href: "/admin/landing/testimonials",
      });
    }

    warnings.push({
      title: "Pricing amounts are placeholders",
      detail: "The tiers are structure, not a commercial decision. Set them before launch.",
      badge: "Placeholder",
      href: "/admin/landing/pricing",
    });

    return {
      publishedSections: publishedHero.count ?? 0,
      draftSections: draftHero.count ?? 0,
      mediaCount: media.count ?? 0,
      pageCount: pages.count ?? 0,
      postCount: posts.count ?? 0,
      staffCount: staff.count ?? 0,
      customerCount: customers.count ?? 0,
      warnings,
      recentActivity: (logs.data ?? []).map((row) => ({
        id: String(row.id),
        actor: row.actor_email ?? "Someone",
        action: row.action,
        entity: row.entity,
        when: ago(row.created_at),
      })),
    };
  } catch {
    // The dashboard is the first thing an operator sees. A failed count should
    // render zeroes, not a stack trace.
    return EMPTY;
  }
}
