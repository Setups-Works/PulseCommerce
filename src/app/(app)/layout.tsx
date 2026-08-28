import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { FetchProgressBar } from "@/components/dashboard/fetch-progress";
import { CommandPaletteProvider } from "@/components/layout/command-palette-context";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import { SubscriptionBanner } from "@/components/layout/subscription-banner";
import { Topbar } from "@/components/layout/topbar";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AnalyticsProvider>
      <CommandPaletteProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <Topbar />
            <SubscriptionBanner />
            <main className="min-w-0 flex-1">{children}</main>
          </SidebarInset>
          <FetchProgressBar />
          <KeyboardShortcuts />
        </SidebarProvider>
      </CommandPaletteProvider>
    </AnalyticsProvider>
  );
}
