"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DOCS_NAV } from "@/components/marketing/docs/docs-nav";
import { cn } from "@/lib/utils";

/**
 * The docs shell: a sticky sidebar on desktop, a drawer on mobile.
 *
 * Lives under `(marketing)` so it inherits `SiteHeader`/`SiteFooter` from
 * that layout — a docs reader is still on the marketing site, just on a page
 * with its own second-level navigation, the same relationship `/api-docs`
 * would have if it weren't a full-bleed Scalar page.
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <div className="lg:hidden">
        <MobileNav pathname={pathname} />
      </div>

      <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <SidebarNav pathname={pathname} />
          </div>
        </aside>

        <div className="min-w-0 max-w-3xl">{children}</div>
      </div>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-0.5">
      <p className="px-2.5 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Documentation
      </p>
      {DOCS_NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-2.5 py-2 text-sm transition-colors",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const current = DOCS_NAV.find((item) => item.href === pathname);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="lg" className="mb-6 w-full justify-between text-sm">
          {current?.label ?? "Documentation"}
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full p-0 sm:max-w-xs">
        <SheetHeader className="border-b px-4 py-3.5">
          <SheetTitle className="text-base">Documentation</SheetTitle>
        </SheetHeader>
        <div className="p-2">
          {DOCS_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm",
                  active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
