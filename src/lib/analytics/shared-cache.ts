import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { databaseConfigured, db } from "@/lib/db/client";
import type { AnalyticsResult } from "./types";

/**
 * The analytics result, cached where every instance can see it.
 *
 * The in-process memo in cache.ts makes a *warm* instance fast. This makes a
 * cold one fast, which on serverless is most of them.
 *
 * Without it, a cold request pays the whole chain — read the orders, derive
 * RFM quintiles, cohorts, predicted lifetime value and basket affinity from
 * scratch. With it, the same request reads one row and gunzips it. The derived
 * result compresses far better than the orders it came from, which is what
 * makes this worth doing.
 *
 * ─── Correctness ───────────────────────────────────────────────────────────
 *
 * The key includes the snapshot's `fetchedAt`, so a re-pull produces a
 * different key and cannot be served a pre-refresh result. There is no TTL for
 * the same reason: entries do not expire, they become unreachable.
 *
 * ─── Why bytea rather than base64 text ─────────────────────────────────────
 *
 * The payload is gzipped, so it is bytes. Storing bytes as bytea rather than
 * base64-encoded text avoids the third of the size that base64 adds, and drops
 * an encode on every write and a decode on every read.
 */

const PREFIX = "analytics";

/**
 * Keys are hashed rather than concatenated.
 *
 * A raw key would carry the store URL and the merchant's chosen dates into
 * every log line and error message that mentions it. A digest is also a fixed,
 * short length, which matters because it is a primary key.
 */
export function sharedKey(parts: {
  storeUrl: string;
  fetchedAt: string;
  from?: string;
  to?: string;
  granularity?: string;
}): string {
  const digest = createHash("sha256")
    .update(
      [
        parts.storeUrl,
        parts.fetchedAt,
        parts.from ?? "*",
        parts.to ?? "*",
        parts.granularity ?? "auto",
      ].join("::"),
    )
    .digest("hex")
    .slice(0, 24);
  return `${PREFIX}-${digest}`;
}

export async function readShared(key: string): Promise<AnalyticsResult | null> {
  if (!databaseConfigured()) return null;

  try {
    const [row] = await db()<{ payload: Uint8Array }[]>`
      select payload from analytics_cache where key = ${key}
    `;
    if (!row) return null;
    return JSON.parse(gunzipSync(Buffer.from(row.payload)).toString()) as AnalyticsResult;
  } catch {
    /*
     * A corrupt or half-written entry must not take the request down — the
     * caller can always recompute. Returning null is a cache miss, which is
     * exactly the right behaviour for something unreadable.
     */
    return null;
  }
}

export async function writeShared(key: string, result: AnalyticsResult): Promise<void> {
  if (!databaseConfigured()) return;

  try {
    const packed = gzipSync(Buffer.from(JSON.stringify(result)));
    await db()`
      insert into analytics_cache (key, payload) values (${key}, ${packed})
      on conflict (key) do update set payload = excluded.payload, created_at = now()
    `;
  } catch {
    // Writing the cache is an optimisation. Failing it should never fail the
    // request that produced a perfectly good result.
  }
}

/**
 * Drops entries that can no longer be reached.
 *
 * Entries go stale by becoming unreachable rather than by expiring, so nothing
 * ever deletes them and the table would grow without bound — one row per
 * distinct date range per refresh, forever. This is housekeeping, not
 * correctness: anything it removes was already unreachable, and anything it
 * misses is merely wasted space.
 */
export async function sweepShared(olderThanDays = 7): Promise<number> {
  if (!databaseConfigured()) return 0;
  try {
    const rows = await db()`
      delete from analytics_cache
      where created_at < now() - make_interval(days => ${olderThanDays})
      returning key
    `;
    return rows.length;
  } catch {
    return 0;
  }
}
