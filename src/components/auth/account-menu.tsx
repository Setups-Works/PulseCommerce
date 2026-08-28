"use client";

import { LogIn, LogOut, Settings2, User2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabaseBrowser } from "@/lib/supabase/client";

interface SessionState {
  signedIn: boolean;
  user: { email: string; name: string | null } | null;
}

/**
 * Who you are signed in as, and the way out.
 *
 * Every page renders for everyone now — the API is what requires
 * authentication, not the route — so a signed-out visitor sees the dashboard
 * shell with empty panels. Without something in the chrome saying so, that
 * reads as a broken app rather than as "sign in to see your figures". This is
 * that something, and it doubles as the sign-out control.
 */
export function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<SessionState | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      setState(await res.json());
    } catch {
      // Offline or mid-deploy. Showing nothing beats showing "signed out",
      // which would invite a pointless sign-in attempt.
      setState(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    /*
     * Supabase refreshes tokens and can sign someone out in another tab. The
     * subscription keeps this in step with that rather than with whenever the
     * component last happened to mount.
     */
    const { data } = supabaseBrowser().auth.onAuthStateChange(() => {
      void load();
      router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [load, router]);

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    // Refresh rather than push: server components hold the old session in
    // their rendered output, and only a refresh re-runs them.
    router.refresh();
    router.push("/");
  };

  if (!state) return null;

  if (!state.signedIn) {
    return (
      <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
        {/* Comes back here afterwards, so signing in does not cost you your place. */}
        <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
          <LogIn className="size-3.5" />
          Sign in
        </Link>
      </Button>
    );
  }

  const label = state.user?.name || state.user?.email || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-1.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
            <User2 className="size-3" />
          </span>
          <span className="truncate text-xs">{label}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {state.user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="gap-2">
            <Settings2 className="size-3.5" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="gap-2">
          <LogOut className="size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
