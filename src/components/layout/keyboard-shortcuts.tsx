"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CommandPalette, NAV_SHORTCUTS } from "@/components/layout/command-palette";
import { useCommandPalette } from "@/components/layout/command-palette-context";
import { ALL_NAV_ITEMS } from "@/components/layout/nav-items";
import { useAnalytics } from "@/components/providers/analytics-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** How long the `g` prefix stays armed before it lapses. */
const CHORD_WINDOW_MS = 1200;

/** True when the keystroke belongs to whatever the user is typing into. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    // Radix marks open comboboxes and menus; typing there is navigation.
    target.closest('[role="combobox"], [role="listbox"], [role="menu"]') !== null
  );
}

/**
 * Global keyboard handling.
 *
 * Two idioms, both conventional: a command palette on the platform's own
 * shortcut, and vim-style `g` chords for jumping between pages. Anything typed
 * into a field is left alone, so the shortcuts never eat a search query.
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const { refresh } = useAnalytics();
  const { setTheme, resolvedTheme } = useTheme();

  const palette = useCommandPalette();
  const [helpOpen, setHelpOpen] = useState(false);

  const handler = useCallback(
    (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;

      // The palette must open even from inside a field.
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        palette.toggle();
        return;
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        refresh();
        return;
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        return;
      }

      if (meta || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        palette.setOpen(true);
        return;
      }

      if (event.key.toLowerCase() === "g") {
        // Arm the chord; the next key decides where to go.
        window.__pulseChordAt = Date.now();
        return;
      }

      const armedAt = window.__pulseChordAt ?? 0;
      if (Date.now() - armedAt > CHORD_WINDOW_MS) return;
      window.__pulseChordAt = 0;

      const href = Object.keys(NAV_SHORTCUTS).find(
        (path) => NAV_SHORTCUTS[path] === event.key.toLowerCase(),
      );
      if (href) {
        event.preventDefault();
        router.push(href);
      }
    },
    [palette, refresh, resolvedTheme, router, setTheme],
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);

  return (
    <>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}

function ShortcutHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const general: [string, string][] = [
    ["⌘K", "Open search and commands"],
    ["/", "Open search"],
    ["?", "Show this list"],
    ["⌘⇧R", "Re-sync from WooCommerce"],
    ["⌘⇧L", "Toggle light and dark"],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-xs">
            Press <Key>g</Key> then a letter to jump to a page. Shortcuts are ignored while you are typing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">General</p>
            <ul className="space-y-1.5">
              {general.map(([key, label]) => (
                <li key={key} className="flex items-center justify-between gap-3 text-sm">
                  <span>{label}</span>
                  <Key>{key}</Key>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Go to</p>
            <ul className="space-y-1.5">
              {ALL_NAV_ITEMS.filter((item) => NAV_SHORTCUTS[item.href]).map((item) => (
                <li key={item.href} className="flex items-center justify-between gap-3 text-sm">
                  <span>{item.label}</span>
                  <span className="flex items-center gap-1">
                    <Key>g</Key>
                    <Key>{NAV_SHORTCUTS[item.href]}</Key>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

declare global {
  interface Window {
    /** Timestamp of the last `g` press, for chord detection. */
    __pulseChordAt?: number;
  }
}
