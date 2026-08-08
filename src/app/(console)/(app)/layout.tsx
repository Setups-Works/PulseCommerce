import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { FetchProgressBar } from "@/components/dashboard/fetch-progress";
import { CommandPaletteProvider } from "@/components/layout/command-palette-context";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import { Topbar } from "@/components/layout/topbar";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";

/**
 * The product shell.
 *
 * AppShell replaces shadcn's SidebarProvider/Sidebar/SidebarInset. HeroUI has
 * no sidebar component, and the shadcn one carries its own Tooltip, which
 * needs an app-level provider the console layout deliberately does not have —
 * HeroUI's tooltips are scoped per instance instead.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AnalyticsProvider>
      <CommandPaletteProvider>
        <AppShell>
          <Topbar />
          <main className="min-w-0 flex-1">{children}</main>
        </AppShell>
        <FetchProgressBar />
        <KeyboardShortcuts />
      </CommandPaletteProvider>
    </AnalyticsProvider>
  );
}
