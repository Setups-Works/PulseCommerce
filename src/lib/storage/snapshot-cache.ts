import type { StoreSnapshot } from "@/lib/woo/types";

/**
 * A read-through cache for the full store snapshot, on Upstash Redis.
 *
 * The reason this exists: `readSnapshot()` in src/lib/woo/mirror.ts reassembles
 * a whole store's orders/customers/products from Postgres on every cache miss
 * — tens of megabytes on a real store, per that file's own comment on what
 * `pg_stat_statements` showed. The in-process memo there helps within one
 * warm serverless instance, but a fresh instance (the common case on Vercel,
 * not the exception) gets none of that benefit and pays the full Postgres
 * read again -- which is exactly what drove a real Supabase egress-quota
 * restriction (service outage) this project hit.
 *
 * Upstash's free tier needs no card at all and is confirmed against their
 * own pricing page (256MB storage, 500K commands/month, 10GB bandwidth/month)
 * — comfortably enough for a JSON blob a few MB in size, written once per
 * store per 10-minute sync cycle and read on every dashboard/inbox/product
 * request. R2 was the first choice (also zero egress) but requires a
 * payment method to enable even on the free tier, which this project can't
 * use -- Upstash doesn't.
 *
 * Plain REST calls rather than the @upstash/redis SDK: Upstash's REST API is
 * two HTTP calls (GET/SET with a bearer token), and pulling in a client
 * library for that is more than this needs.
 *
 * This is a cache, not the source of truth -- Postgres still is. A miss here
 * (first sync of a new store, Redis unreachable, env vars unset) falls back
 * to the existing Postgres reassembly in mirror.ts exactly as before.
 */

const TTL_SECONDS = 15 * 60; // Generous relative to the 10-min sync cycle that refreshes it.

function credentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

function keyFor(storeId: string): string {
  return `snapshot:${storeId}`;
}

/** Reads the cached snapshot, or null on any miss/failure — never throws. */
export async function getCachedSnapshot(storeId: string): Promise<StoreSnapshot | null> {
  const creds = credentials();
  if (!creds) return null;

  try {
    const res = await fetch(`${creds.url}/get/${keyFor(storeId)}`, {
      headers: { Authorization: `Bearer ${creds.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result: string | null };
    if (!body.result) return null;
    return JSON.parse(body.result) as StoreSnapshot;
  } catch {
    // Network error, malformed JSON, whatever -- fall back to Postgres, same
    // as a cold cache always has.
    return null;
  }
}

/**
 * Invalidates the cache entry — called from mirror.ts's forgetSnapshot,
 * which several call sites use without a guaranteed follow-up read (a store
 * disconnect, a manual re-sync trigger). Without this, stale data could sit
 * here for up to TTL_SECONDS after the thing that made it stale. Best-effort
 * and fire-and-forget for the same reason as the rest of this file: a failed
 * delete just means the entry expires on its own schedule instead of
 * immediately, not a correctness break for anything that reads through this
 * cache.
 */
export async function deleteCachedSnapshot(storeId: string): Promise<void> {
  const creds = credentials();
  if (!creds) return;

  try {
    await fetch(`${creds.url}/del/${keyFor(storeId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.token}` },
    });
  } catch {
    // Best-effort, see above.
  }
}

/**
 * Writes the snapshot back, best-effort. Never throws -- a failed cache write
 * must not fail the sync or the request that triggered a Postgres reassembly;
 * the next reader just falls back to Postgres again, same as today.
 */
export async function putCachedSnapshot(storeId: string, snapshot: StoreSnapshot): Promise<void> {
  const creds = credentials();
  if (!creds) return;

  try {
    await fetch(`${creds.url}/set/${keyFor(storeId)}?EX=${TTL_SECONDS}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "text/plain" },
      body: JSON.stringify(snapshot),
    });
  } catch {
    // Best-effort, see the doc comment above.
  }
}
