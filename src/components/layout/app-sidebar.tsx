"use client";

import { Activity, ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/auth/account-menu";
import { StoreSwitcher } from "@/components/layout/store-switcher";
import { useAnalytics } from "@/components/providers/analytics-provider";
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
import { NAV_GROUPS } from "./nav-items";

export function AppSidebar() {
  const pathname = usePathname();
  const { data } = useAnalytics();

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
        <AccountMenu />
        <StoreSwitcher />
        {data?.meta.storeUrl ? (
          <a
            href={data.meta.storeUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-1.5 pb-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Open store <ExternalLink className="size-3" />
          </a>
        ) : null}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
