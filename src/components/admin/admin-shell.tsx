"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Button, Chip, Drawer, Link as HeroLink, Skeleton } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faBars,
  faBolt,
  faMoon,
  faSun,
  faUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "next-themes";
import { ADMIN_NAV, findNavItem } from "@/components/admin/admin-nav";
import { createClient } from "@/lib/supabase/client";
import { can, ROLE_LABELS, type AppRole, type Capability } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";

/**
 * The admin chrome: sidebar, top bar, mobile drawer.
 *
 * A client component because it needs the current pathname to mark the active
 * item and a click handler to sign out. The pages it wraps stay server
 * components — the shell takes `children`, so nothing inside it is dragged
 * across the boundary.
 *
 * The role arrives as a prop rather than being fetched here. The layout has
 * already resolved it server-side to decide whether to render at all, and
 * fetching it a second time in the browser would show a flash of the wrong
 * navigation while it loaded.
 */

export interface AdminShellProps {
  role: AppRole;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  children: React.ReactNode;
}

export function AdminShell({ role, email, fullName, avatarUrl, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const active = findNavItem(pathname);

  // Close the drawer on navigation. An in-page anchor does not change the
  // pathname, so this is driven by the link's own click rather than an effect.
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  const signOut = React.useCallback(async () => {
    setSigningOut(true);
    await createClient().auth.signOut();
    // `refresh` first so the proxy re-evaluates with the cookie cleared, then
    // push — replacing the order here lands on a cached authenticated shell.
    router.refresh();
    router.push("/admin/login");
  }, [router]);

  const visibleGroups = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(role, item.capability as Capability)),
  })).filter((group) => group.items.length > 0);

  const nav = (
    <nav className="flex flex-col gap-6 p-3" aria-label="Admin sections">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = active?.href === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeDrawer}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent/12 font-medium text-accent"
                        : "text-foreground/75 hover:bg-surface-secondary hover:text-foreground",
                    )}
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      className={cn("w-4 shrink-0", isActive ? "text-accent" : "text-muted")}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ---- Sidebar, desktop ------------------------------------------- */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <BrandBar />
        <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
        <AccountCard
          role={role}
          email={email}
          fullName={fullName}
          avatarUrl={avatarUrl}
          onSignOut={signOut}
          signingOut={signingOut}
        />
      </aside>

      {/* ---- Sidebar, mobile --------------------------------------------- */}
      <Drawer isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content placement="left" className="w-72 bg-surface">
          <Drawer.Dialog className="flex h-full flex-col" aria-label="Navigation">
            <BrandBar />
            <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
            <AccountCard
              role={role}
              email={email}
              fullName={fullName}
              avatarUrl={avatarUrl}
              onSignOut={signOut}
              signingOut={signingOut}
            />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer>

      {/* ---- Main -------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-xl">
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className="lg:hidden"
            aria-label="Open navigation"
            onPress={() => setDrawerOpen(true)}
          >
            <FontAwesomeIcon icon={faBars} className="w-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{active?.label ?? "Admin"}</h1>
            {active?.description ? (
              <p className="truncate text-xs text-muted">{active.description}</p>
            ) : null}
          </div>

          <ThemeToggle />

          {/* HeroUI's Link, not a Button: v3's Button has no `as` escape
              hatch, and nesting an anchor inside one is invalid markup. */}
          <HeroLink href="/" target="_blank" className="hidden items-center gap-1.5 text-sm sm:inline-flex">
            <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3" />
            View site
          </HeroLink>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function BrandBar() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
      <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <FontAwesomeIcon icon={faBolt} className="w-3" />
      </span>
      <span className="text-sm font-semibold tracking-tight">PulseCommerce</span>
      <Chip size="sm" variant="secondary" className="ml-auto text-[10px]">
        Admin
      </Chip>
    </div>
  );
}

/**
 * The theme switch.
 *
 * Renders a skeleton until mounted. `next-themes` cannot know the resolved
 * theme during SSR, so drawing the sun or the moon before hydration is a
 * coin-flip that shows the wrong icon half the time and warns about a
 * mismatch.
 */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  /*
   * `useSyncExternalStore` rather than a mounted flag in an effect.
   *
   * Both answer "are we hydrated yet", but setState-in-an-effect triggers a
   * second render pass and the React Compiler rule that forbids it. This
   * subscribes to nothing and returns false on the server, true on the
   * client — one render, no cascade.
   */
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return <Skeleton className="size-8 rounded-lg" />;

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      isIconOnly
      variant="ghost"
      size="sm"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onPress={() => setTheme(isDark ? "light" : "dark")}
    >
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-4" />
    </Button>
  );
}

function AccountCard({
  role,
  email,
  fullName,
  avatarUrl,
  onSignOut,
  signingOut,
}: {
  role: AppRole;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  return (
    <div className="shrink-0 border-t border-border p-3">
      <div className="flex items-center gap-2.5">
        <Avatar size="sm" color="accent">
          {avatarUrl ? <Avatar.Image src={avatarUrl} alt="" /> : null}
          <Avatar.Fallback>{(fullName ?? email).slice(0, 1).toUpperCase()}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{fullName ?? email}</p>
          <p className="truncate text-[11px] text-muted">{ROLE_LABELS[role]}</p>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Sign out"
          isDisabled={signingOut}
          onPress={onSignOut}
        >
          <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-3.5" />
        </Button>
      </div>
    </div>
  );
}
