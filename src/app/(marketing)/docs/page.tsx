import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MagicCard } from "@/components/ui/magic-card";
import { DOCS_NAV } from "@/components/marketing/docs/docs-nav";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Guides for the PulseCommerce API and CLI: connecting a store, authenticating with an API key, the full command reference, and how a campaign goes from a filter to a send.",
  alternates: { canonical: "/docs" },
};

export default function DocsIndexPage() {
  return (
    <div>
      <Badge variant="outline" className="gap-1.5">
        <span className="size-1.5 rounded-full bg-primary" />
        Documentation
      </Badge>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Guides for the API and the CLI
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        For the full route-by-route reference — every field, every response, every error — see{" "}
        <Link href="/api-docs" className="font-medium text-primary underline-offset-4 hover:underline">
          the API reference
        </Link>
        . These guides are the walkthrough: what order things happen in, and why.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {DOCS_NAV.map((item) => (
          <MagicCard
            key={item.href}
            className="rounded-xl ring-1 ring-foreground/10"
            gradientFrom="var(--primary)"
            gradientTo="var(--chart-3)"
            gradientColor="color-mix(in oklch, var(--primary) 9%, transparent)"
            gradientOpacity={1}
          >
            <Link href={item.href} className="block p-5">
              <h2 className="text-base font-medium">{item.label}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              <span className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
                Read
                <ArrowRight className="size-3.5" />
              </span>
            </Link>
          </MagicCard>
        ))}
      </div>
    </div>
  );
}
