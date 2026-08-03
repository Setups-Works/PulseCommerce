import Link from "next/link";
import { Sparkles } from "lucide-react";

/** Shared across every marketing page, so the columns cannot drift apart. */
export function NeoFooter() {
  const columns: [string, [string, string][]][] = [
    ["Product", [["Features", "/features"], ["Integrations", "/integrations"], ["Pricing", "/pricing"], ["API reference", "/api-docs"]]],
    ["Platform", [["WooCommerce", "/integrations"], ["Shopify — soon", "/integrations#shopify"], ["Your own WhatsApp host", "/pricing"], ["WhatsApp Cloud API", "/pricing"]]],
    ["Start", [["Get started", "/login"], ["Open the app", "/dashboard"], ["FAQ", "/pricing#faq"]]],
  ];

  return (
    <footer className="border-t-[3px] border-black bg-black text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border-[3px] border-white bg-[#2f66e8]">
              <Sparkles className="size-5" />
            </span>
            <span className="text-xl font-extrabold tracking-tighter">PulseCommerce</span>
          </div>
          <p className="mt-4 max-w-xs text-base font-medium text-white/70">
            Analytics and WhatsApp for WooCommerce stores that would rather act on their numbers
            than read them.
          </p>
        </div>

        {columns.map(([title, links]) => (
          <div key={title}>
            <h4 className="text-base font-extrabold tracking-tight">{title}</h4>
            <ul className="mt-4 space-y-2.5 text-base font-medium text-white/70">
              {links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="decoration-2 underline-offset-4 hover:text-white hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t-[3px] border-white/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm font-bold text-white/70">
          <span>© 2026 PulseCommerce. Self-hosted, and yours.</span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#7bdc9b]" />
            Your data never leaves your deployment
          </span>
        </div>
      </div>
    </footer>
  );
}
