"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A localStorage-backed value read through `useSyncExternalStore`.
 *
 * The obvious alternative — restore it in a mount effect — sets state during
 * mount and makes the first paint show the default before snapping to the saved
 * value. Modelling storage as the external store it actually is removes both
 * problems: React renders the server snapshot on the server, the real value on
 * the client, and handles the transition itself.
 */
export function createPersistedStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();

  // Snapshots must be referentially stable or useSyncExternalStore loops.
  let cache: { raw: string | null; value: T } = { raw: null, value: fallback };

  function read(): T {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return fallback;
    }
    if (raw === null) return fallback;
    if (raw === cache.raw) return cache.value;

    try {
      const parsed = JSON.parse(raw) as T;
      cache = { raw, value: parsed };
      return parsed;
    } catch {
      return fallback;
    }
  }

  function write(value: T): void {
    try {
      const raw = JSON.stringify(value);
      window.localStorage.setItem(key, raw);
      cache = { raw, value };
    } catch {
      // Private-mode or quota failures are not worth surfacing to the user.
    }
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    // Another tab changing the value should update this one too.
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return {
    subscribe,
    read,
    write,
    serverSnapshot: () => fallback,
  };
}

export function usePersisted<T>(store: ReturnType<typeof createPersistedStore<T>>) {
  const value = useSyncExternalStore(store.subscribe, store.read, store.serverSnapshot);
  const set = useCallback((next: T) => store.write(next), [store]);
  return [value, set] as const;
}
