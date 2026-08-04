"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * The marketing header, built from the product's own components.
 *
 * Deliberately the same button, dropdown and sheet the application uses, so
 * the site and the software read as one product rather than two. The only
 * marketing-specific decision here is scale: app chrome is dense by design and
 * a landing page needs more air, so sizes are lifted rather than redefined.
 */

const PRODUCT: { label: string; items: [string, string, string][] }[] = [
  {
    label: "Analyse",
    items: [
      ["Customer intelligence", "/features#customers", "RFM, lifetime value, churn risk"],
      ["Revenue & acquisition", "/features#revenue", "Every KPI against the prior period"],
      ["Products & stock", "/features#products", "ABC classes, days of cover"],
    ],
  },
  {
    label: "Act",
    items: [
      ["Campaigns", "/features/campaigns", "Audience, personalisation, coupons"],
      ["AI assistant", "/features/ai", "Proposes; you approve"],
      ["WhatsApp", "/whatsapp", "How it arrives on their phone"],
      ["Auto-reply menu", "/whatsapp#auto-reply", "Answers at 3am, fetches a person"],
      ["Shared inbox", "/whatsapp#inbox", "Every reply, with their history"],
    ],
  },
];

const LINKS: [string, string][] = [
  ["Features", "/features"],
  ["Campaigns", "/features/campaigns"],
  ["AI", "/features/ai"],
  ["WhatsApp", "/whatsapp"],
  ["Integrations", "/integrations"],
  ["Pricing", "/pricing"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  // A drawer that survives navigation would cover the page it just opened, so
  // every link inside it closes on the way out. Done on the link rather than in
  // an effect watching the pathname: an in-page anchor (#auto-reply) does not
  // change the pathname, so an effect would leave the drawer sitting open over
  // the section it just scrolled to.
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4.5" strokeWidth={2.5} />
          </span>
          <span className="text-base font-semibold tracking-tight">PulseCommerce</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="lg" className="gap-1 text-sm">
                Product
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              {PRODUCT.map((group, i) => (
                <div key={group.label}>
                  {i > 0 ? <Separator className="my-1" /> : null}
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{group.label}</DropdownMenuLabel>
                  {group.items.map(([label, href, description]) => (
                    <DropdownMenuItem key={label} asChild>
                      <Link href={href} className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">{description}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {LINKS.map(([label, href]) => (
            <Button key={label} variant="ghost" size="lg" asChild className="text-sm font-normal">
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="lg" asChild className="hidden text-sm sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="lg" asChild className="text-sm">
            <Link href="/connect">Get started</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-lg" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-4.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-1 px-4 pb-6">
                {LINKS.map(([label, href]) => (
                  <Button key={label} variant="ghost" size="lg" asChild className="justify-start text-sm">
                    <Link href={href} onClick={close}>
                      {label}
                    </Link>
                  </Button>
                ))}

                {PRODUCT.map((group) => (
                  <div key={group.label} className="mt-4">
                    <p className="px-2.5 text-xs font-medium text-muted-foreground">{group.label}</p>
                    <div className="mt-1 flex flex-col">
                      {group.items.map(([label, href, description]) => (
                        <Link
                          key={label}
                          href={href}
                          onClick={close}
                          className="rounded-md px-2.5 py-2 transition-colors hover:bg-muted"
                        >
                          <span className="block text-sm font-medium">{label}</span>
                          <span className="block text-xs text-muted-foreground">{description}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                <Separator className="my-4" />
                <Button size="lg" asChild>
                  <Link href="/connect" onClick={close}>
                    Get started free
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="mt-2">
                  <Link href="/login" onClick={close}>
                    Log in
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
