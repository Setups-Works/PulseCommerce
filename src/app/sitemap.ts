import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/marketing/schema";

/**
 * The sitemap.
 *
 * Public marketing routes only. The application behind /dashboard is
 * authenticated and its pages have nothing to offer a crawler; /connect and
 * /login are listed because they are the two entry points a search result
 * should be able to land on.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["/", 1, "weekly"],
    ["/features", 0.9, "monthly"],
    ["/features/campaigns", 0.8, "monthly"],
    ["/features/ai", 0.8, "monthly"],
    ["/whatsapp", 0.8, "monthly"],
    ["/integrations", 0.7, "monthly"],
    ["/pricing", 0.9, "monthly"],
    ["/api-docs", 0.5, "monthly"],
    ["/connect", 0.6, "yearly"],
    ["/login", 0.3, "yearly"],
  ];

  const lastModified = new Date();

  return routes.map(([path, priority, changeFrequency]) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
