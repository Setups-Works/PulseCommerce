"use client";

import { Loader2, Monitor, Moon, RefreshCw, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCommandPalette } from "@/components/layout/command-palette-context";
import { QuickExport } from "@/components/dashboard/quick-export";
import { ALL_NAV_ITEMS } from "@/components/layout/nav-items";
import { RangePicker } from "@/components/layout/range-picker";
import { useAnalytics } from "@/components/providers/analytics-provider";
import { Button, ListBox, ListBoxItem, Menu, MenuItem, Popover, PopoverTrigger, Select, SelectPopover, SelectTrigger, SelectValue, Separator, Tooltip } from "@heroui/react";
import type { Granularity } from "@/lib/analytics/types";

export function Topbar() {
  const pathname = usePathname();
  const { loading, refresh, granularity, setGranularity } = useAnalytics();
  const current = ALL_NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md sm:px-4">
      <Separator orientation="vertical" className="mr-1 h-5" />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold tracking-tight">{current?.label ?? "Dashboard"}</h1>
        <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{current?.description}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <SearchTrigger />

        <Select
          selectedKey={granularity}
          onSelectionChange={(v) => setGranularity(String(v) as Granularity | "auto")}
        >
          <SelectTrigger className="hidden w-26 lg:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectPopover><ListBox>
            <ListBoxItem id="auto">Auto</ListBoxItem>
            <ListBoxItem id="day">Daily</ListBoxItem>
            <ListBoxItem id="week">Weekly</ListBoxItem>
            <ListBoxItem id="month">Monthly</ListBoxItem>
          </ListBox></SelectPopover>
        </Select>

        <RangePicker />

        <Tooltip>
          <Tooltip.Trigger>
            <Button
              variant="outline"
              isIconOnly size="sm"
              className="size-8"
              onClick={refresh}
              isDisabled={loading}
              aria-label="Refresh data from WooCommerce"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Re-pull orders from WooCommerce</Tooltip.Content>
        </Tooltip>

        <QuickExport />
        <ThemeToggle />
      </div>
    </header>
  );
}

/**
 * Opens the command palette. Rendered as a search field rather than an icon so
 * the shortcut is discoverable without having to be told about it.
 */
function SearchTrigger() {
  const palette = useCommandPalette();
  const [mac, setMac] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  return (
    <button
      type="button"
      onClick={() => palette.setOpen(true)}
      aria-label="Search customers, products and orders"
      className="flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent sm:w-56"
    >
      <Search className="size-3.5 shrink-0" />
      <span className="hidden flex-1 text-left sm:inline">Search…</span>
      <kbd className="ml-auto hidden items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] sm:inline-flex">
        {mac ? "⌘" : "Ctrl"}K
      </kbd>
    </button>
  );
}

function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <PopoverTrigger>
      <PopoverTrigger>
        <Button variant="outline" isIconOnly size="sm" className="size-8" aria-label="Change theme">
          {/*
           * Both icons render and CSS picks one. Reading the resolved theme in
           * JS would need a mounted flag to avoid a hydration mismatch, which
           * means the first paint always shows the wrong icon.
           */}
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>
      </PopoverTrigger>
      <Popover><Menu>
        <MenuItem onAction={() => setTheme("light")}>
          <Sun className="size-4" /> Light
        </MenuItem>
        <MenuItem onAction={() => setTheme("dark")}>
          <Moon className="size-4" /> Dark
        </MenuItem>
        <MenuItem onAction={() => setTheme("system")}>
          <Monitor className="size-4" /> System
        </MenuItem>
      </Menu></Popover>
    </PopoverTrigger>
  );
}
