import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import { createPublicClient } from "@/lib/supabase/server";

/**
 * Data access for public site content.
 *
 * This layer does one thing: fetch rows. It holds no defaults, no formatting
 * and no view logic — that is the service's job. Every function returns `null`
 * (or an empty array) rather than throwing, because the marketing site must
 * render whether or not Supabase is reachable, and a landing page that 500s
 * when the CMS is down is worse than one showing the copy it shipped with.
 *
 * Reads are wrapped in React's `cache`, so a page pulling six sections issues
 * six queries rather than six per component that happens to ask.
 *
 * Only `status = 'published'` rows come back — not by filtering here, but
 * because the anon key is subject to row level security and the policy in the
 * content migration already restricts it. Filtering in both places would let
 * the two drift; letting the database decide means the rule has one home.
 */

type Client = SupabaseClient<Database>;

/** Runs `query` against the public client, or returns `fallback` if unavailable. */
async function read<T>(
  fallback: T,
  query: (client: Client) => PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T> {
  const client = createPublicClient();
  if (!client) return fallback;

  try {
    const { data, error } = await query(client);
    if (error || data === null) return fallback;
    return data;
  } catch {
    // Network failure, DNS, a project paused for inactivity. The site keeps
    // working on its compiled-in defaults.
    return fallback;
  }
}

export const getHero = cache((route: string) =>
  read<Tables<"hero_sections"> | null>(null, (c) =>
    c.from("hero_sections").select("*").eq("route", route).maybeSingle(),
  ),
);

export const getFeatures = cache((collection: string) =>
  read<Tables<"features">[]>([], (c) =>
    c.from("features").select("*").eq("collection", collection).order("position"),
  ),
);

export const getPricingPlans = cache(() =>
  read<Tables<"pricing_plans">[]>([], (c) =>
    c.from("pricing_plans").select("*").order("position"),
  ),
);

export const getFaqs = cache((landingOnly = false) =>
  read<Tables<"faqs">[]>([], (c) => {
    const query = c.from("faqs").select("*").order("position");
    return landingOnly ? query.eq("show_on_landing", true) : query;
  }),
);

export const getTestimonials = cache(() =>
  read<Tables<"testimonials">[]>([], (c) =>
    c.from("testimonials").select("*").order("position"),
  ),
);

export const getPartners = cache((category = "stack") =>
  read<Tables<"partners">[]>([], (c) =>
    c.from("partners").select("*").eq("category", category).order("position"),
  ),
);

export const getIntegrations = cache(() =>
  read<Tables<"integrations">[]>([], (c) =>
    c.from("integrations").select("*").order("position"),
  ),
);

export const getAnalyticsModules = cache(() =>
  read<Tables<"analytics_modules">[]>([], (c) =>
    c.from("analytics_modules").select("*").order("position"),
  ),
);

export const getNavigation = cache((location = "header") =>
  read<Tables<"navigation">[]>([], (c) =>
    c.from("navigation").select("*").eq("location", location).order("position"),
  ),
);

export const getFooterLinks = cache(() =>
  read<Tables<"footer_links">[]>([], (c) =>
    c.from("footer_links").select("*").order("position"),
  ),
);

export const getCompany = cache(() =>
  read<Tables<"company"> | null>(null, (c) => c.from("company").select("*").limit(1).maybeSingle()),
);

export const getLandingSettings = cache(() =>
  read<Tables<"landing_settings"> | null>(null, (c) =>
    c.from("landing_settings").select("*").eq("is_active", true).maybeSingle(),
  ),
);

/**
 * The announcement currently in its window.
 *
 * The window is filtered here rather than in a policy: "published" is an
 * editorial decision and belongs to RLS, whereas "within its dates" is a
 * property of the moment the page renders and cannot be expressed as a static
 * policy.
 */
export const getActiveAnnouncement = cache(async () => {
  const rows = await read<Tables<"announcements">[]>([], (c) =>
    c.from("announcements").select("*").order("position"),
  );
  const now = Date.now();
  return (
    rows.find((row) => {
      const startsOk = !row.starts_at || Date.parse(row.starts_at) <= now;
      const endsOk = !row.ends_at || Date.parse(row.ends_at) > now;
      return startsOk && endsOk;
    }) ?? null
  );
});

export const getSeoEntry = cache((route: string) =>
  read<Tables<"seo_entries"> | null>(null, (c) =>
    c.from("seo_entries").select("*").eq("route", route).maybeSingle(),
  ),
);

export const getSitemapEntries = cache(() =>
  read<Tables<"seo_entries">[]>([], (c) =>
    c.from("seo_entries").select("*").eq("include_in_sitemap", true).order("position"),
  ),
);

export const getSettings = cache(() =>
  read<Tables<"settings">[]>([], (c) => c.from("settings").select("*").eq("is_public", true)),
);
