import { gunzipSync, gzipSync } from "node:zlib";
import type { StoreSnapshot } from "@/lib/woo/types";
import { getStore, storageIsDurable } from "./kv";

/**
 * Shared snapshot cache.
 *
 * The per-instance disk cache was the single worst bug in this app on
 * serverless: every cold lambda re-pulled the store's entire order history,
 * which was both slow and enough sustained traffic that the store's security
 * layer started refusing us. Putting the snapshot somewhere every instance can
 * see it means the pull happens once per TTL, not once per instance.
 *
 * A snapshot is far too large for a single key-value entry, so it is gzipped
 * and split across numbered chunks behind a manifest.
 */

const CHUNK_BYTES = 300_000;
const MANIFEST_PREFIX = "snapshot-manifest";
const CHUNK_PREFIX = "snapshot-chunk";

interface Manifest {
  fetchedAt: string;
  chunks: number;
  /** Guards against reading a half-written set after a partial failure. */
  bytes: number;
}

const manifestKey = (key: string) => `${MANIFEST_PREFIX}-${key}`;
const chunkKey = (key: string, i: number) => `${CHUNK_PREFIX}-${key}-${i}`;

export async function readSharedSnapshot(key: string, ttlMs: number): Promise<StoreSnapshot | null> {
  if (!storageIsDurable()) return null;
  const store = getStore();

  try {
    const raw = await store.get(manifestKey(key));
    if (!raw) return null;

    const manifest = JSON.parse(raw) as Manifest;
    if (Date.now() - new Date(manifest.fetchedAt).getTime() > ttlMs) return null;

    // Chunks are independent keys, so fetch them together rather than in series.
    const parts = await Promise.all(
      Array.from({ length: manifest.chunks }, (_, i) => store.get(chunkKey(key, i))),
    );
    if (parts.some((p) => p === null)) return null;

    const base64 = parts.join("");
    const buffer = Buffer.from(base64, "base64");
    if (buffer.byteLength !== manifest.bytes) return null;

    return JSON.parse(gunzipSync(buffer).toString("utf8")) as StoreSnapshot;
  } catch (error) {
    console.warn("[snapshot] shared cache read failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function writeSharedSnapshot(key: string, snapshot: StoreSnapshot): Promise<void> {
  if (!storageIsDurable()) return;
  const store = getStore();

  try {
    const compressed = gzipSync(Buffer.from(JSON.stringify(snapshot), "utf8"), { level: 6 });
    const base64 = compressed.toString("base64");
    const chunks: string[] = [];
    for (let i = 0; i < base64.length; i += CHUNK_BYTES) {
      chunks.push(base64.slice(i, i + CHUNK_BYTES));
    }

    // Chunks first, manifest last: a reader can never see a manifest that
    // points at chunks which are not there yet.
    await Promise.all(chunks.map((chunk, i) => store.set(chunkKey(key, i), chunk)));
    await store.set(
      manifestKey(key),
      JSON.stringify({
        fetchedAt: snapshot.fetchedAt,
        chunks: chunks.length,
        bytes: compressed.byteLength,
      } satisfies Manifest),
    );

    console.info(
      `[snapshot] shared cache: ${(compressed.byteLength / 1_048_576).toFixed(1)}MB gzipped across ${chunks.length} chunks`,
    );
  } catch (error) {
    // A cache write failure costs speed, never correctness.
    console.warn("[snapshot] shared cache write failed:", error instanceof Error ? error.message : error);
  }
}

export async function clearSharedSnapshot(key: string): Promise<void> {
  if (!storageIsDurable()) return;
  const store = getStore();
  try {
    const raw = await store.get(manifestKey(key));
    await store.delete(manifestKey(key));
    if (!raw) return;
    const manifest = JSON.parse(raw) as Manifest;
    await Promise.all(
      Array.from({ length: manifest.chunks }, (_, i) => store.delete(chunkKey(key, i))),
    );
  } catch {
    // Nothing to clean up, or storage is unavailable.
  }
}
