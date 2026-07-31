"use client";

import { Activity, CircleDot, ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAnalytics } from "@/components/providers/analytics-provider";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { NAV_GROUPS } from "./nav-items";

export function AppSidebar() {
  const pathname = usePathname();
  const { data, initialising } = useAnalytics();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-1.5 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4.5" strokeWidth={2.5} />
          </span>
          <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">PulseCommerce</span>
            <span className="truncate text-[11px] text-muted-foreground">WooCommerce analytics</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t group-data-[collapsible=icon]:hidden">
        {initialising ? (
          <div className="space-y-2 px-1.5 py-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : data ? (
          <div className="space-y-1.5 px-1.5 py-1">
            <div className="flex items-center gap-1.5">
              <CircleDot className="size-3 text-[var(--good)]" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium" title={data.meta.storeName}>
                {data.meta.storeName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="text-[10px]">
                Connected
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                synced {formatRelative(data.meta.fetchedAt)}
              </span>
            </div>
            <a
              href={data.meta.storeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Open store <ExternalLink className="size-3" />
            </a>
          </div>
        ) : (
          <Link href="/settings" className="px-1.5 py-1 text-[11px] text-primary hover:underline">
            Connect a store →
          </Link>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
