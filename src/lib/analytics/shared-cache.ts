import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { getStore, storageIsDurable } from "@/lib/store/kv";
import type { AnalyticsResult } from "./types";

/**
 * The analytics result, cached where every instance can see it.
 *
 * The in-process memo in cache.ts makes a *warm* instance fast. This makes a
 * cold one fast, which on serverless is most of them.
 *
 * Without it, a cold request pays the whole chain — fetch ~1.3MB of gzipped
 * snapshot from the store, gunzip and parse it into a 20MB object (158ms), and
 * derive everything from scratch (137ms). With it, the same request reads one
 * ~79KB row and parses it. The derived result compresses far better than the
 * raw orders it came from, which is what makes this worth doing.
 *
 * ─── Correctness ───────────────────────────────────────────────────────────
 *
 * The key includes the snapshot's `fetchedAt`, so a re-pull produces a
 * different key and cannot be served a pre-refresh result. There is no TTL for
 * the same reason: entries do not expire, they become unreachable. Stale rows
 * are swept on write rather than left to accumulate.
 *
 * ─── When it does nothing ──────────────────────────────────────────────────
 *
 * A deployment with no durable store — a self-hosted install on a writable
 * disk, or one with nothing configured — skips this entirely. There, the
 * process is long-lived and the in-process memo already covers it; a second
 * cache would be cost without benefit.
 */

const PREFIX = "analytics";

/**
 * Keys are hashed rather than concatenated.
 *
 * A raw key would carry the store URL and the merchant's chosen dates into
 * every log line and error message that mentions it. A digest is also a fixed,
 * short length, which matters because the key is a primary key in Postgres.
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
  if (!storageIsDurable()) return null;

  try {
    const raw = await getStore().get(key);
    if (!raw) return null;
    return JSON.parse(gunzipSync(Buffer.from(raw, "base64")).toString()) as AnalyticsResult;
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
  if (!storageIsDurable()) return;

  try {
    const packed = gzipSync(Buffer.from(JSON.stringify(result))).toString("base64");
    await getStore().set(key, packed);
  } catch {
    // Writing the cache is an optimisation. Failing it should never fail the
    // request that produced a perfectly good result.
  }
}
