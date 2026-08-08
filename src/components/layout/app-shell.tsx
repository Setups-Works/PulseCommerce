"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Drawer } from "@heroui/react";
import { Activity, ExternalLink, Menu, PanelLeftClose } from "lucide-react";
import { NAV_GROUPS } from "@/components/layout/nav-items";
import { StoreSwitcher } from "@/components/layout/store-switcher";
import { cn } from "@/lib/utils";

/**
 * The product's sidebar and shell.
 *
 * Replaces shadcn's `sidebar`, which HeroUI has no equivalent for. Written
 * rather than ported because the shadcn one is a large stateful component
 * whose collapse behaviour, rail and mobile sheet are all built on its own
 * tokens and its own Tooltip — and that Tooltip needs an app-level provider
 * the console layout deliberately does not have.
 *
 * Same structure as the admin shell: a fixed sidebar above `lg`, a Drawer
 * below it, one listener and one source of navigation. NAV_GROUPS is shared
 * with the command palette, so a screen added there appears in both.
 *
 * Collapse state is kept in this component rather than a cookie. It is a
 * per-visit preference, not an account setting, and persisting it would mean
 * the server rendering a different width than the client expects on first
 * paint.
 */

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const close = React.useCallback(() => setDrawerOpen(false), []);

  const nav = (
    <nav className="flex flex-col gap-5 p-3" aria-label="Product sections">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed ? (
            <p className="px-2 pb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">
              {group.label}
            </p>
          ) : null}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-accent/12 font-medium text-accent"
                        : "text-foreground/75 hover:bg-surface-secondary hover:text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn("size-4 shrink-0", active ? "text-accent" : "text-muted")}
                    />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const header = (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-3">
      <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Activity className="size-4" strokeWidth={2.5} />
        </span>
        {!collapsed ? (
          <span className="truncate text-sm font-semibold tracking-tight">PulseCommerce</span>
        ) : null}
      </Link>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {header}
        <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>

        <div className="shrink-0 border-t border-border p-3">
          {!collapsed ? (
            <div className="mb-2">
              <StoreSwitcher />
            </div>
          ) : null}
          <div className="flex items-center gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onPress={() => setCollapsed((c) => !c)}
            >
              <PanelLeftClose className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
            </Button>
            {!collapsed ? (
              <Link
                href="/"
                target="_blank"
                className="ml-auto flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
              >
                Site
                <ExternalLink className="size-3" />
              </Link>
            ) : null}
          </div>
        </div>
      </aside>

      <Drawer isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content placement="left" className="w-64 bg-surface">
          <Drawer.Dialog className="flex h-full flex-col" aria-label="Navigation">
            {header}
            <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
            <div className="shrink-0 border-t border-border p-3">
              <StoreSwitcher />
            </div>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar onOpen={() => setDrawerOpen(true)} />
        {children}
      </div>
    </div>
  );
}

/**
 * The mobile-only bar carrying the drawer trigger.
 *
 * Just the trigger. The desktop topbar has the range picker and the export
 * controls; repeating them here would give a phone a row it has no room for,
 * and the store switcher already lives in the drawer.
 */
function MobileBar({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 lg:hidden">
      <Button isIconOnly size="sm" variant="ghost" aria-label="Open navigation" onPress={onOpen}>
        <Menu className="size-4" />
      </Button>
    </div>
  );
}
