import { NeoFooter } from "@/components/neo/footer";
import { NeoNav } from "@/components/neo/nav";

/**
 * The marketing shell.
 *
 * Header and footer live here rather than in each page, so a new page cannot
 * ship without them and the navigation cannot drift between routes.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fdfbf5] text-black">
      <NeoNav />
      {children}
      <NeoFooter />
    </div>
  );
}
