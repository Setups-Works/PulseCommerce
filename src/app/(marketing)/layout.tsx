import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * The marketing shell.
 *
 * Header and footer live here rather than in each page, so a new page cannot
 * ship without them and the navigation cannot drift between routes. No colour
 * is set here: the site inherits the product's own theme tokens, which is what
 * makes the two halves look like one product in both light and dark.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
