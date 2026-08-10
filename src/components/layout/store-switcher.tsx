"use client";

import { Check, ChevronsUpDown, CircleDot, Loader2, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAnalytics } from "@/components/providers/analytics-provider";
import { Menu, MenuItem, Popover, PopoverTrigger, Separator } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ConnectedStore {
  url: string;
  name: string | null;
  updatedAt: string | null;
  active: boolean;
}

/** Shared loader so the sidebar and Settings never disagree about the list. */
export function useConnectedStores() {
  const [stores, setStores] = useState<ConnectedStore[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      setStores(json.stores ?? []);
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return { stores, loading, reload };
}

/**
 * Switches which connected WooCommerce store the dashboard is reading.
 *
 * Each store keeps its own credentials, data window and snapshot cache, so
 * switching is just a pointer change: the next request reads a different
 * cache rather than re-pulling anything.
 */
export function StoreSwitcher() {
  const { data, refresh } = useAnalytics();
  const { stores, loading, reload } = useConnectedStores();
  const [switching, setSwitching] = useState<string | null>(null);

  const active = stores.find((s) => s.active);

  const switchTo = async (url: string) => {
    if (url === active?.url) return;
    setSwitching(url);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeUrl: url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not switch store.");

      await reload();
      refresh();
      toast.success("Switched store", { description: json.config?.name ?? url });
    } catch (error) {
      toast.error("Could not switch store", {
        description: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-1.5 px-1.5 py-1">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <Link href="/settings" className="px-1.5 py-1 text-[11px] text-primary hover:underline">
        Connect a store →
      </Link>
    );
  }

  const label = active?.name ?? data?.meta.storeName ?? active?.url ?? "Store";

  // With one store there is nothing to switch to, so show it plainly.
  if (stores.length === 1) {
    return (
      <div className="space-y-1 px-1.5 py-1">
        <div className="flex items-center gap-1.5">
          <CircleDot className="size-3 text-[var(--good)]" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium" title={label}>
            {label}
          </span>
        </div>
        {data ? (
          <p className="text-[10px] text-muted-foreground">synced {formatRelative(data.meta.fetchedAt)}</p>
        ) : null}
        <Link href="/settings" className="block text-[11px] text-muted-foreground hover:text-foreground">
          Add another store
        </Link>
      </div>
    );
  }

  return (
    <PopoverTrigger>
      <PopoverTrigger>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
        >
          <CircleDot className="size-3 shrink-0 text-[var(--good)]" />
          <span className="grid min-w-0 flex-1">
            <span className="truncate text-xs font-medium" title={label}>
              {label}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              {stores.length} stores connected
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <Popover><Menu>
        <div className="text-xs font-normal text-muted-foreground">
          Switch WooCommerce store
        </div>
        <Separator />

        {stores.map((store) => (
          <MenuItem
            key={store.url}
            onAction={() => void switchTo(store.url)}
            className="gap-2"
          >
            <Store className="size-4 shrink-0 text-muted-foreground" />
            <span className="grid min-w-0 flex-1">
              <span className="truncate text-xs font-medium">{store.name ?? hostOf(store.url)}</span>
              <span className="truncate text-[10px] text-muted-foreground">{hostOf(store.url)}</span>
            </span>
            {switching === store.url ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : store.active ? (
              <Check className="size-4 shrink-0" strokeWidth={3} />
            ) : null}
          </MenuItem>
        ))}

        <Separator />
        <MenuItem>
          <Link href="/settings" className={cn("gap-2")}>
            <Plus className="size-4" />
            Connect another store
          </Link>
        </MenuItem>
      </Menu></Popover>
    </PopoverTrigger>
  );
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
