import Link from "next/link";
import { Activity, ArrowRight, Mail } from "lucide-react";
import { siGithub, siX } from "simple-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";

/**
 * Shared across every marketing page, so the columns cannot drift apart.
 *
 * The newsletter field is a plain uncontrolled form posting nowhere yet — it
 * is deliberately not wired to a provider, because picking one is a decision
 * about where subscriber email addresses are stored and that is not a choice
 * to make silently inside a footer component. See the note on the form.
 */

const COLUMNS: [string, [string, string][]][] = [
  [
    "Product",
    [
      ["Features", "/features"],
      ["Campaigns", "/features/campaigns"],
      ["AI assistant", "/features/ai"],
      ["WhatsApp", "/whatsapp"],
      ["Integrations", "/integrations"],
      ["Pricing", "/pricing"],
      ["Developers", "/developers"],
      ["Docs", "/docs"],
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
      ["Webhooks", "/api-docs"],
    ],
  ],
  [
    "Start",
    [
      ["Get started", "/signup"],
      ["Log in", "/login"],
      ["FAQ", "/pricing#faq"],
    ],
  ],
];

/*
 * Brand marks come from simple-icons rather than lucide: lucide v1 dropped its
 * brand set, and a hand-drawn approximation of a logo is worse than none.
 * LinkedIn is absent because simple-icons no longer carries it.
 *
 * PLACEHOLDER DESTINATIONS. Point these at the real accounts before launch.
 */
const SOCIALS: { label: string; href: string; render: () => React.ReactNode }[] = [
  {
    label: "GitHub",
    href: "https://github.com",
    render: () => <BrandMark icon={siGithub} className="size-4" />,
  },
  {
    label: "X",
    href: "https://x.com",
    render: () => <BrandMark icon={siX} className="size-3.5" />,
  },
  {
    label: "Email us",
    href: "mailto:hello@pulsecommerce.io",
    render: () => <Mail className="size-4" />,
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-4.5" strokeWidth={2.5} />
            </span>
            <span className="text-base font-semibold tracking-tight">PulseCommerce</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            AI commerce intelligence for WooCommerce stores that would rather act on their numbers
            than read them.
          </p>

          {/*
           * Not yet wired to a provider. `action` is intentionally absent
           * rather than pointing at a placeholder endpoint — a form that
           * silently swallows an email address is worse than one that has not
           * shipped. Give it an action, and the field a name the provider
           * expects, when the list exists.
           */}
          <form className="mt-6 max-w-xs">
            <label htmlFor="footer-newsletter" className="text-xs font-medium">
              What we ship, monthly
            </label>
            <div className="mt-2 flex gap-2">
              <Input
                id="footer-newsletter"
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@yourstore.com"
                className="h-9 text-sm"
              />
              <Button type="submit" size="lg" className="h-9 shrink-0 px-3" aria-label="Subscribe">
                <ArrowRight className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Product notes only. No sequence, and one click to leave.
            </p>
          </form>

          <div className="mt-6 flex items-center gap-1">
            {SOCIALS.map(({ label, href, render }) => {
              const external = href.startsWith("http");
              return (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  {...(external ? { rel: "noreferrer noopener", target: "_blank" } : {})}
                  className="flex size-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {render()}
                </a>
              );
            })}
          </div>
        </div>

        {COLUMNS.map(([title, links]) => (
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

      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <span>© 2026 PulseCommerce. Self-hosted, and yours.</span>

        <span className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-good" />
            Your data never leaves your deployment
          </span>
          <span className="hidden items-center gap-2 sm:flex">
            <BrandMark icon={BRANDS.woocommerce} className="size-3.5" />
            Built for WooCommerce
          </span>
        </span>
      </div>
    </footer>
  );
}
