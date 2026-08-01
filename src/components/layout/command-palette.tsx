"use client";

import {
  Boxes,
  Moon,
  Package,
  ReceiptText,
  RefreshCw,
  Sun,
  UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ALL_NAV_ITEMS } from "@/components/layout/nav-items";
import {
  RANGE_PRESETS,
  useAnalytics,
} from "@/components/providers/analytics-provider";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { formatCurrency } from "@/lib/format";

/** Cap per group: the store has tens of thousands of records. */
const MAX_RESULTS = 6;

/**
 * Search and navigation in one surface.
 *
 * Filtering is done here rather than by cmdk's built-in matcher, because that
 * would mean mounting an item per customer — tens of thousands of them — just
 * to hide most. Instead the query narrows the data first and only the matches
 * are rendered.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data, refresh, setPreset } = useAnalytics();
  const { setTheme, resolvedTheme } = useTheme();
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!data || needle.length < 2) {
      return { customers: [], products: [], orders: [] };
    }

    const customers = data.customers.records
      .filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.email.toLowerCase().includes(needle) ||
          c.company.toLowerCase().includes(needle),
      )
      .slice(0, MAX_RESULTS);

    const products = data.products.products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.sku.toLowerCase().includes(needle),
      )
      .slice(0, MAX_RESULTS);

    const orders = data.orders
      .filter(
        (o) =>
          o.number.toLowerCase().includes(needle) ||
          o.customerName.toLowerCase().includes(needle) ||
          o.customerEmail.toLowerCase().includes(needle),
      )
      .slice(0, MAX_RESULTS);

    return { customers, products, orders };
  }, [data, needle]);

  const run = (action: () => void) => {
    onOpenChange(false);
    setQuery("");
    action();
  };

  const currency = data?.meta.currency ?? "USD";
  const hasResults =
    results.customers.length > 0 ||
    results.products.length > 0 ||
    results.orders.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
      title="Search and commands"
      description="Search customers, products and orders, or jump to a page."
      className="max-w-2xl"
    >
      {/*
        This CommandDialog does not provide a cmdk root of its own, so the
        input and list must be wrapped here or cmdk's store is undefined.
        Filtering is ours (see above), so cmdk's matcher stays off.
      */}
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search customers, products, orders, or jump to a page…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[60vh]">
          {needle.length >= 2 && !hasResults ? (
            <CommandEmpty>
              No customers, products or orders match “{query}”.
            </CommandEmpty>
          ) : null}

          {results.customers.length > 0 ? (
            <CommandGroup heading="Customers">
              {results.customers.map((c) => (
                <CommandItem
                  key={c.key}
                  value={`customer-${c.key}`}
                  onSelect={() =>
                    run(() =>
                      router.push(`/customers/${encodeURIComponent(c.key)}`),
                    )
                  }
                >
                  <UserRound />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{c.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {c.email || "guest checkout"} · {c.segment}
                    </span>
                  </span>
                  <CommandShortcut>
                    {formatCurrency(c.netRevenue, currency)}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {results.products.length > 0 ? (
            <CommandGroup heading="Products">
              {results.products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`product-${p.id}`}
                  onSelect={() => run(() => router.push("/products"))}
                >
                  <Package />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{p.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {p.sku || "no SKU"} · {p.category}
                    </span>
                  </span>
                  <CommandShortcut>
                    {formatCurrency(p.revenue, currency)}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {results.orders.length > 0 ? (
            <CommandGroup heading="Orders">
              {results.orders.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`order-${o.id}`}
                  onSelect={() => run(() => router.push("/orders"))}
                >
                  <ReceiptText />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">#{o.number}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {o.customerName}
                    </span>
                  </span>
                  <CommandShortcut>
                    {formatCurrency(o.total, currency)}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {hasResults ? <CommandSeparator /> : null}

          <CommandGroup heading="Go to">
            {ALL_NAV_ITEMS.filter(
              (item) =>
                needle.length < 2 || item.label.toLowerCase().includes(needle),
            ).map((item) => (
              <CommandItem
                key={item.href}
                value={`nav-${item.href}`}
                onSelect={() => run(() => router.push(item.href))}
              >
                <item.icon />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span>{item.label}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                {NAV_SHORTCUTS[item.href] ? (
                  <CommandShortcut>
                    g {NAV_SHORTCUTS[item.href]}
                  </CommandShortcut>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Date range">
            {RANGE_PRESETS.map((preset) => (
              <CommandItem
                key={preset.id}
                value={`range-${preset.id}`}
                onSelect={() => run(() => setPreset(preset.id))}
              >
                <Boxes />
                {preset.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem value="action-refresh" onSelect={() => run(refresh)}>
              <RefreshCw />
              Re-sync from WooCommerce
              <CommandShortcut>⌘⇧R</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="action-theme"
              onSelect={() =>
                run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
              }
            >
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
              Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
              <CommandShortcut>⌘⇧L</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

/** Second key of the `g` chord, per page. */
export const NAV_SHORTCUTS: Record<string, string> = {
  "/dashboard": "d",
  "/forecast": "f",
  "/customers": "c",
  "/acquisition": "a",
  "/cohorts": "h",
  "/products": "p",
  "/inventory": "i",
  "/orders": "o",
  "/campaigns": "m",
  "/reports": "r",
  "/settings": "s",
};
