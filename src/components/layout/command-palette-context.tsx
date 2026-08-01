"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface PaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const PaletteContext = createContext<PaletteState | null>(null);

/**
 * Shared open state for the command palette.
 *
 * The topbar's search field and the keyboard handler both need to open the
 * same palette. Routing the button through a synthetic keydown so the handler
 * would notice was indirect and, in practice, unreliable; an explicit shared
 * state says what it means.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const value = useMemo<PaletteState>(
    () => ({ open, setOpen, toggle: () => setOpen((v) => !v) }),
    [open],
  );

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function useCommandPalette(): PaletteState {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used inside <CommandPaletteProvider>.");
  return ctx;
}
