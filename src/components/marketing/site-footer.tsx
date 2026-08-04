import Link from "next/link";
import { Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";

/** Shared across every marketing page, so the columns cannot drift apart. */
export function SiteFooter() {
  const columns: [string, [string, string][]][] = [
    [
      "Product",
      [
        ["Features", "/features"],
        ["Campaigns", "/features/campaigns"],
        ["AI assistant", "/features/ai"],
        ["WhatsApp", "/whatsapp"],
        ["Integrations", "/integrations"],
        ["Pricing", "/pricing"],
        ["API reference", "/api-docs"],
      ],
    ],
    [
      "Platform",
      [
        ["WooCommerce", "/integrations"],
        ["Shopify — soon", "/integrations#shopify"],
        ["Your own WhatsApp host", "/pricing#delivery"],
        ["WhatsApp Cloud API", "/pricing#delivery"],
      ],
    ],
    [
      "Start",
      [
        ["Get started", "/connect"],
        ["Log in", "/login"],
        ["Open the app", "/dashboard"],
        ["FAQ", "/pricing#faq"],
      ],
    ],
  ];

  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-4.5" strokeWidth={2.5} />
            </span>
            <span className="text-base font-semibold tracking-tight">PulseCommerce</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Analytics and WhatsApp for WooCommerce stores that would rather act on their numbers than
            read them.
          </p>
        </div>

        {columns.map(([title, links]) => (
          <div key={title}>
            <h4 className="text-sm font-semibold">{title}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="transition-colors hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Separator />

      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <span>© 2026 PulseCommerce. Self-hosted, and yours.</span>
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Your data never leaves your deployment
        </span>
      </div>
    </footer>
  );
}
