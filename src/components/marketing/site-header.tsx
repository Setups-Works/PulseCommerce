"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  ChartColumnBig,
  Clock,
  Code2,
  Inbox,
  Megaphone,
  Menu,
  MessageCircle,
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
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { cn } from "@/lib/utils";

/**
 * The marketing header.
 *
 * Two navigations, not one responsive navigation. A mega menu is a pointer
 * idiom — it opens on hover, spans more width than a phone has, and relies on
 * a cursor travelling between trigger and panel. Squeezing it onto a touch
 * screen produces something that is bad at both, so small screens get a drawer
 * that is designed as a drawer.
 *
 * Both are driven by the same MENU constant, so a link added for one appears in
 * the other and the two cannot drift apart.
 *
 * Alignment, which is most of the work here:
 *
 *   - The panel is a four-column grid whose first three columns are equal
 *     fractions and whose fourth is a fixed width. Equal fractions mean the
 *     three link columns share a left edge and a gutter regardless of how long
 *     the longest label in each is.
 *   - Every row uses the same 28px icon box and the same two-line text block,
 *     so labels across all three columns sit on a shared baseline grid rather
 *     than drifting by a few pixels per column.
 *   - Column headers are one row of their own above the lists, so the first
 *     link in each column starts at the same y.
 *   - The panel is positioned against the header's `relative` container and
 *     centred in it — it is wider than the trigger it hangs from, and anchoring
 *     it to the trigger's left edge pushed it off the right of the viewport.
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
        label: "Cohorts & retention",
        href: "/features#revenue",
        description: "Every acquisition month, followed forward",
        icon: ChartColumnBig,
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
        label: "AI commerce agent",
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
      {
        label: "Audience builder",
        href: "/features/campaigns#audience",
        description: "A filter, not a list you maintain",
        icon: Bot,
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
      {
        label: "API reference",
        href: "/api-docs",
        description: "OpenAPI schema, browsable",
        icon: Code2,
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
  const [scrolled, setScrolled] = useState(false);

  /*
   * Transparent over the hero, glass once the page moves under it.
   *
   * A header that is glass from the first pixel puts a seam across the top of
   * a hero that has its own background; one that never changes disappears into
   * the content below. `passive` because the handler never calls
   * preventDefault, and reading a boolean off a threshold keeps this to one
   * state change per crossing rather than one per scroll event.
   */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A drawer that survives navigation would cover the page it just opened, so
  // every link inside it closes on the way out. Done on the link rather than in
  // an effect watching the pathname: an in-page anchor (#auto-reply) does not
  // change the pathname, so an effect would leave the drawer sitting open over
  // the section it just scrolled to.
  const close = () => setOpen(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-b bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
          : "border-b border-transparent bg-transparent",
      )}
    >
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
                <div className="w-[56rem] max-w-[calc(100vw-3rem)] p-3">
                  <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_16rem] gap-x-4 gap-y-0">
                    {MENU.map((column) => (
                      <div key={column.label} className="flex flex-col">
                        {/* Its own row above the list, so the first link in
                            every column starts at the same y. */}
                        <p className="px-2 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                          {column.label}
                        </p>
                        <ul className="flex flex-col gap-0.5">
                          {column.items.map((item) => (
                            <li key={item.label}>
                              <NavigationMenuLink asChild>
                                <Link
                                  href={item.href}
                                  className="flex flex-row items-start gap-2.5 rounded-lg p-2"
                                >
                                  <span className="mt-px flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/50">
                                    <item.icon className="size-3.5 text-primary" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm leading-5 font-medium">
                                      {item.label}
                                    </span>
                                    <span className="block text-xs leading-4 text-muted-foreground">
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
                        a menu with a point of view. Spans the header row too,
                        so its top edge lines up with the column labels rather
                        than with the first link. */}
                    <div className="row-span-1 flex flex-col rounded-xl border bg-muted/40 p-4">
                      <Badge variant="secondary" className="w-fit gap-1.5">
                        <Sparkles className="size-3" />
                        New
                      </Badge>
                      <p className="mt-3 text-sm font-medium">Flows and the agent are live</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        Ask which customers are slipping away, and have the win-back drafted for you
                        to approve.
                      </p>
                      <Button size="sm" asChild className="mt-auto w-full">
                        <Link href="/features/ai">
                          See the agent
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Footer rail. Same horizontal padding as the link rows
                      above it, so its text lines up with the first column. */}
                  <div className="flex items-center justify-between gap-4 px-2">
                    <Link
                      href="/features"
                      className="group flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
                    >
                      All thirteen modules
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>

                    <span className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <BrandMark icon={BRANDS.woocommerce} className="size-3.5" />
                        WooCommerce
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BrandMark icon={BRANDS.whatsapp} className="size-3.5" />
                        WhatsApp
                      </span>
                    </span>
                  </div>
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
                    <BrandMark icon={BRANDS.woocommerce} className="size-4" />
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
