import type { TenantStore } from "@/lib/auth/tenant";
import { NoMirrorDataError, forgetSnapshot, readSnapshot } from "@/lib/woo/mirror";
import type { StoreSnapshot } from "@/lib/woo/types";

/**
 * The store's data, as the analytics engine expects it.
 *
 * This file used to be the whole caching apparatus: an in-process map, a
 * gzipped copy on local disk, a chunked copy in shared storage, an in-flight
 * request map to collapse duplicate loads, and behind all of it a live pull
 * from WooCommerce that took minutes and had to be kept off the critical path
 * by every one of those layers.
 *
 * None of it is needed now. The store is mirrored into Postgres by the sync
 * engine, so reading it is three indexed queries. What remains is a thin
 * translation between the mirror and the engine's `StoreSnapshot`, plus the
 * one short memo that stops a single dashboard load reading the same thing
 * three times.
 *
 * The layers were not wrong for what they had to do. They existed because the
 * source was slow; making the source fast removed the reason for them.
 */

export { NoMirrorDataError };

export class NotConnectedError extends Error {
  readonly code = "not_connected";
  constructor() {
    super("No WooCommerce store is connected yet.");
    this.name = "NotConnectedError";
  }
}

export interface LoadOptions {
  /**
   * Ignore the in-process memo.
   *
   * This no longer re-pulls from WooCommerce — that is what a sync is, and it
   * is far too slow to run inside a request. A refresh here means "do not
   * serve me the copy this instance made fifteen seconds ago".
   */
  refresh?: boolean;
}

export async function loadSnapshot(
  store: TenantStore,
  opts: LoadOptions = {},
): Promise<StoreSnapshot> {
  if (opts.refresh) forgetSnapshot(store.id);
  return readSnapshot(store);
}

/** Drops this instance's memo for a store. */
export function invalidateSnapshotCache(storeIds: string[]): void {
  for (const id of storeIds) forgetSnapshot(id);
}
