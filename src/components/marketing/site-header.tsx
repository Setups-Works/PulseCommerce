"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  Clock,
  Inbox,
  Megaphone,
  MessageCircle,
  Menu,
  Plug,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * The marketing header, built from the product's own components.
 *
 * Two navigations, not one responsive navigation. A mega menu is a pointer
 * idiom — it opens on hover, spans more width than a phone has, and relies on
 * a cursor travelling between trigger and panel. Squeezing it onto a touch
 * screen produces something that is bad at both, so small screens get a drawer
 * that is designed as a drawer.
 *
 * Both are driven by the same MENU constant, so a link added for one appears in
 * the other and the two cannot drift apart.
 */

type MenuItem = {
  label: string;
  href: string;
  description: string;
  icon: typeof Users;
};

const MENU: { label: string; blurb: string; items: MenuItem[] }[] = [
  {
    label: "Analyse",
    blurb: "Understand who is buying, and who has stopped.",
    items: [
      {
        label: "Customer intelligence",
        href: "/features#customers",
        description: "RFM segments, lifetime value, churn risk",
        icon: Users,
      },
      {
        label: "Revenue & acquisition",
        href: "/features#revenue",
        description: "Every KPI against the prior period",
        icon: BarChart3,
      },
      {
        label: "Products & stock",
        href: "/features#products",
        description: "ABC classes, days of cover, affinity",
        icon: Boxes,
      },
    ],
  },
  {
    label: "Act",
    blurb: "Reach them without leaving the screen.",
    items: [
      {
        label: "Campaigns",
        href: "/features/campaigns",
        description: "Audience, personalisation, coupons",
        icon: Megaphone,
      },
      {
        label: "AI assistant",
        href: "/features/ai",
        description: "Proposes; you approve",
        icon: Sparkles,
      },
      {
        label: "Automated flows",
        href: "/features#flows",
        description: "Sequences that stop when they buy",
        icon: Workflow,
      },
    ],
  },
  {
    label: "WhatsApp",
    blurb: "The half your customer actually sees.",
    items: [
      {
        label: "How it arrives",
        href: "/whatsapp",
        description: "Ten templates, personalised per person",
        icon: MessageCircle,
      },
      {
        label: "Auto-reply menu",
        href: "/whatsapp#auto-reply",
        description: "Answers at 3am, fetches a person",
        icon: Clock,
      },
      {
        label: "Shared inbox",
        href: "/whatsapp#inbox",
        description: "Every reply, with their history",
        icon: Inbox,
      },
    ],
  },
];

const LINKS: [string, string][] = [
  ["Features", "/features"],
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
      {/* `relative` anchors the mega menu: the panel is wider than the trigger
          it hangs from, so it is positioned against this container and centred
          in it rather than against the trigger's left edge, which pushed it off
          the right of the viewport. */}
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4.5" strokeWidth={2.5} />
          </span>
          <span className="text-base font-semibold tracking-tight">PulseCommerce</span>
        </Link>

        {/* ---- Desktop: the mega menu ------------------------------------- */}
        <NavigationMenu className="hidden lg:flex" viewport={false}>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Product</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-232 max-w-[calc(100vw-3rem)] p-2">
                  <div className="grid grid-cols-[repeat(3,1fr)_15rem] gap-2">
                    {MENU.map((column) => (
                      <div key={column.label}>
                        <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                          {column.label}
                        </p>
                        <ul>
                          {column.items.map((item) => (
                            <li key={item.label}>
                              <NavigationMenuLink asChild>
                                <Link href={item.href} className="flex-row items-start gap-2.5">
                                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/50">
                                    <item.icon className="size-3.5 text-primary" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-medium">{item.label}</span>
                                    <span className="block text-xs leading-snug text-muted-foreground">
                                      {item.description}
                                    </span>
                                  </span>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    {/* The featured pane. A mega menu with four equal columns
                        is a sitemap; one column that sells something makes it
                        a menu with a point of view. */}
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <Badge variant="secondary" className="gap-1.5">
                        <Sparkles className="size-3" />
                        New
                      </Badge>
                      <p className="mt-3 text-sm font-medium">Flows and the assistant are live</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        Ask which customers are slipping away, and have the win-back drafted for you
                        to approve.
                      </p>
                      <Button size="sm" asChild className="mt-4 w-full">
                        <Link href="/features/ai">
                          See the assistant
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <Link
                    href="/features"
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="font-medium">All thirteen modules</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      Every figure from your own orders
                      <ArrowRight className="size-3" />
                    </span>
                  </Link>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {LINKS.map(([label, href]) => (
              <NavigationMenuItem key={label}>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href={href}>{label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="lg" asChild className="hidden text-sm sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="lg" asChild className="text-sm">
            <Link href="/connect">Get started</Link>
          </Button>

          {/* ---- Mobile: a drawer, designed as one --------------------------- */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-lg" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-4.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
              <SheetHeader className="shrink-0 border-b px-4 py-3.5">
                <SheetTitle className="flex items-center gap-2.5 text-base">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Activity className="size-4" strokeWidth={2.5} />
                  </span>
                  PulseCommerce
                </SheetTitle>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                <MobileSection>
                  {LINKS.map(([label, href]) => (
                    <MobileRow key={label} href={href} onClick={close}>
                      {label}
                    </MobileRow>
                  ))}
                </MobileSection>

                {MENU.map((column) => (
                  <div key={column.label} className="mt-6">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {column.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{column.blurb}</p>
                    <MobileSection className="mt-2.5">
                      {column.items.map((item) => (
                        <MobileRow key={item.label} href={item.href} onClick={close} icon={item.icon}>
                          <span className="block font-medium">{item.label}</span>
                          <span className="block text-xs leading-snug text-muted-foreground">
                            {item.description}
                          </span>
                        </MobileRow>
                      ))}
                    </MobileSection>
                  </div>
                ))}

                <Link
                  href="/integrations"
                  onClick={close}
                  className="mt-6 flex items-center gap-2.5 rounded-lg border bg-muted/40 p-3 transition-colors hover:bg-muted"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                    <Plug className="size-4 text-primary" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">Connects to WooCommerce</span>
                    <span className="block text-xs text-muted-foreground">
                      Read-only, approved in your own admin
                    </span>
                  </span>
                </Link>
              </div>

              {/* Pinned, so the two things a visitor came to do are always in
                  reach without scrolling back up a long menu. */}
              <div className="shrink-0 border-t bg-background px-4 py-3.5">
                <Button size="lg" asChild className="h-10 w-full text-sm">
                  <Link href="/connect" onClick={close}>
                    Get started free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="mt-2 h-10 w-full text-sm">
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

/** A grouped list, so rows read as one block rather than floating separately. */
function MobileSection({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("divide-y overflow-hidden rounded-lg border", className)}>{children}</div>;
}

function MobileRow({
  href,
  onClick,
  icon: Icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon?: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      // A 48px minimum target: anything smaller is a miss on a thumb.
      className="flex min-h-12 items-center gap-3 px-3 py-2.5 text-sm transition-colors active:bg-muted hover:bg-muted"
    >
      {Icon ? (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/50">
          <Icon className="size-3.5 text-primary" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">{children}</span>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
