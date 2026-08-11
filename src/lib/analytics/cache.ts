import { computeAnalytics, type AnalyticsOptions } from "./engine";
import type { AnalyticsResult } from "./types";
import type { StoreSnapshot } from "@/lib/woo/types";
import { readShared, sharedKey, writeShared } from "./shared-cache";

/**
 * Memoised analytics.
 *
 * `computeAnalytics` derives everything — RFM quintiles, cohort matrices,
 * predicted lifetime value, basket affinity, stock cover — from the full order
 * list on each call. Measured on a synthetic 20,000-order store that is 137ms,
 * and it was being paid on every single request: six call sites, and the
 * dashboard refetches whenever the date range or the granularity changes.
 *
 * The snapshot itself was already cached three ways; the *derivation* was not.
 * This closes that gap. A range change, a page reload, a second API route in
 * the same instance — all now reuse the result instead of recomputing it.
 *
 * ─── Why the key is what it is ─────────────────────────────────────────────
 *
 * `fetchedAt` identifies the snapshot. It changes whenever the store is
 * re-pulled, which is exactly when every derived figure becomes stale, so it
 * is a correct invalidation signal and not merely a convenient one — a refresh
 * cannot serve a pre-refresh result.
 *
 * `storeUrl` is in the key too. One process can serve more than one connected
 * store, and two stores with the same pull timestamp would otherwise collide.
 *
 * ─── Why it is bounded ─────────────────────────────────────────────────────
 *
 * Each entry holds a full AnalyticsResult, which serialises to ~1.4MB on that
 * same 20k-order store. An unbounded map keyed partly by user-supplied dates
 * is a memory leak with a slow fuse: every custom range a merchant tries adds
 * a permanent megabyte. The cap evicts the oldest, which is the right policy
 * here because the ranges people revisit are the recent ones.
 */

/** Small on purpose: entries are large, and the working set is a few ranges. */
const MAX_ENTRIES = 8;

/** Insertion-ordered, so the first key is the oldest — Map guarantees this. */
const cache = new Map<string, AnalyticsResult>();

function keyFor(snapshot: StoreSnapshot, opts: AnalyticsOptions): string {
  const { range, granularity } = opts;
  return [
    snapshot.storeUrl,
    snapshot.fetchedAt,
    range?.from ?? "*",
    range?.to ?? "*",
    granularity ?? "auto",
  ].join("::");
}

/**
 * The cached form of `computeAnalytics`. Same arguments, same result.
 *
 * Returns the stored object rather than a copy. Callers treat the result as
 * read-only — they serialise it or read fields off it — and cloning 1.4MB on
 * every hit would give back most of what the cache saves.
 *
 * One observable difference from calling the engine directly: `meta.
 * generatedAt` is the time the figures were *derived*, so a cache hit reports
 * the original derivation rather than the moment of the request. That is the
 * honest reading of the field, and the timestamp users are shown is
 * `meta.fetchedAt` — when the store was last pulled — which is unaffected.
 * Verified: every other field is byte-identical to an uncached call.
 */
export function getAnalytics(
  snapshot: StoreSnapshot,
  opts: AnalyticsOptions = {},
): AnalyticsResult {
  const key = keyFor(snapshot, opts);

  const hit = cache.get(key);
  if (hit) {
    // Re-insert so the entry counts as recently used; without this the eviction
    // below is first-in-first-out and would drop the range someone keeps
    // returning to.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const result = computeAnalytics(snapshot, opts);
  remember(key, result);
  return result;
}

/** Insert, evicting the least recently used once the cap is reached. */
function remember(key: string, result: AnalyticsResult): void {
  cache.set(key, result);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/**
 * Two-tier lookup: this process, then the shared store, then compute.
 *
 * `getAnalytics` above serves a warm instance. This adds the tier that helps a
 * cold one, which on serverless is most requests — see shared-cache.ts for the
 * measured difference. Async, so only callers already in an async context can
 * use it; the sync version remains for everywhere else.
 *
 * A shared hit is promoted into the in-process map, so the second request on
 * that instance skips the network too.
 */
export async function getAnalyticsCached(
  snapshot: StoreSnapshot,
  opts: AnalyticsOptions = {},
): Promise<AnalyticsResult> {
  const key = keyFor(snapshot, opts);

  const local = cache.get(key);
  if (local) {
    cache.delete(key);
    cache.set(key, local);
    return local;
  }

  const shared = await readShared(
    sharedKey({
      storeUrl: snapshot.storeUrl,
      fetchedAt: snapshot.fetchedAt,
      from: opts.range?.from,
      to: opts.range?.to,
      granularity: opts.granularity,
    }),
  );

  if (shared) {
    remember(key, shared);
    return shared;
  }

  const result = computeAnalytics(snapshot, opts);
  remember(key, result);

  // Not awaited: the caller has its answer, and a slow write to the shared
  // store should not hold the response open. Failures are swallowed inside.
  void writeShared(
    sharedKey({
      storeUrl: snapshot.storeUrl,
      fetchedAt: snapshot.fetchedAt,
      from: opts.range?.from,
      to: opts.range?.to,
      granularity: opts.granularity,
    }),
    result,
  );

  return result;
}

/**
 * Drops everything derived from a store.
 *
 * Called when a store is disconnected or its snapshot invalidated. Prefix
 * matching on the URL rather than reconstructing every key, because the ranges
 * that were cached are not knowable from here.
 */
export function clearAnalyticsCache(storeUrl?: string): void {
  if (!storeUrl) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${storeUrl}::`)) cache.delete(key);
  }
}
