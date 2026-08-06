import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/marketing/schema";

/**
 * robots.txt.
 *
 * Everything under the application shell is disallowed. Those routes are
 * behind a session and would only ever serve a crawler a redirect, but saying
 * so explicitly keeps them out of the crawl budget — and out of the index if
 * an auth check ever regresses.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/customers",
        "/products",
        "/inventory",
        "/orders",
        "/campaigns",
        "/flows",
        "/inbox",
        "/menu",
        "/reports",
        "/settings",
        "/assistant",
        "/acquisition",
        "/cohorts",
        "/forecast",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
