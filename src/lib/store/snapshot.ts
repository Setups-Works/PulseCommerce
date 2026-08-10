import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { WooApiError, WooClient } from "@/lib/woo/client";
import { attachAttribution } from "@/lib/woo/attribution";
import { slimSnapshot } from "@/lib/woo/slim";
import { decodeEntities } from "@/lib/woo/entities";
import type { StoreSnapshot, WooCustomer, WooOrder, WooProduct } from "@/lib/woo/types";
import { readStoreConfig, type StoreConfig } from "./config";
import { isServerless } from "./kv";
import { clearSharedSnapshot, readSharedSnapshot, writeSharedSnapshot } from "./snapshot-cache";
import { NotConnectedError } from "./errors";

interface CacheEntry {
  snapshot: StoreSnapshot;
  expiresAt: number;
}

/** In-process cache: absorbs the burst of requests a single page load makes. */
const MEMORY_TTL_MS = 10 * 60 * 1000;
/** On-disk cache: survives dev-server restarts and cold serverless starts. */
const DISK_TTL_MS = Number(process.env.SNAPSHOT_CACHE_MINUTES ?? 60) * 60 * 1000;

/**
 * Snapshot cache directory.
 *
 * A snapshot can be tens of megabytes, which rules out a key-value store, so it
 * stays on disk. Serverless application directories are read-only, but /tmp is
 * writable and survives between invocations on a warm instance, which is
 * exactly the case worth optimising.
 */
const CACHE_DIR = isServerless()
  ? path.join("/tmp", "pulsecommerce-cache")
  : path.join(process.cwd(), ".data", "cache");

const cache = new Map<string, CacheEntry>();
/** Collapses concurrent first-loads into one upstream fetch. */
const inflight = new Map<string, Promise<StoreSnapshot>>();

/**
 * Bumped whenever the shape of a cached snapshot changes, so a deploy that
 * reads a new field can never be served an old snapshot that lacks it. The cost
 * is one cold pull after the deploy; silently missing data would be worse.
 *
 * 2 — billing phone retained, for WhatsApp sending.
 * 3 — one product image retained, for WhatsApp product messages.
 */
const SNAPSHOT_SCHEMA_VERSION = 3;

/**
 * Identifies the cached data, not the credential that fetched it.
 *
 * The consumer key deliberately plays no part here. WooCommerce issues a fresh
 * one every time the app is approved, so keying on it meant re-authorizing a
 * store you were already connected to orphaned every cached copy at once and
 * forced a full re-pull of the entire order history — long enough to outlive a
 * serverless request. The same store over the same window holds the same
 * orders whichever key read them.
 */
function cacheKey(config: StoreConfig): string {
  return createHash("sha256")
    .update(
      `v${SNAPSHOT_SCHEMA_VERSION}::${normalise(config.url)}::${config.historyMonths}::${config.maxPages}`,
    )
    .digest("hex")
    .slice(0, 16);
}

export interface LoadOptions {
  /** Skip both caches and re-pull from WooCommerce. */
  refresh?: boolean;
}

export async function loadSnapshot(opts: LoadOptions = {}): Promise<StoreSnapshot> {
  const config = await readStoreConfig();
  if (!config) throw new NotConnectedError();

  const key = cacheKey(config);

  if (!opts.refresh) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.snapshot;

    const pending = inflight.get(key);
    if (pending) return pending;

    const fromDisk = await readDiskCache(key);
    if (fromDisk) {
      cache.set(key, { snapshot: fromDisk, expiresAt: Date.now() + MEMORY_TTL_MS });
      return fromDisk;
    }

    // Shared across every instance, unlike memory and /tmp. This is what stops
    // each cold serverless instance re-pulling the whole order history.
    const fromShared = await readSharedSnapshot(key, DISK_TTL_MS);
    if (fromShared) {
      cache.set(key, { snapshot: fromShared, expiresAt: Date.now() + MEMORY_TTL_MS });
      void writeDiskCache(key, fromShared);
      return fromShared;
    }
  }

  const job = fetchLiveSnapshot(config)
    .then(async (snapshot) => {
      cache.set(key, { snapshot, expiresAt: Date.now() + MEMORY_TTL_MS });
      await Promise.all([writeDiskCache(key, snapshot), writeSharedSnapshot(key, snapshot)]);
      return snapshot;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, job);
  return job;
}

async function readDiskCache(key: string): Promise<StoreSnapshot | null> {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${key}.json`), "utf8");
    const parsed = JSON.parse(raw) as StoreSnapshot;
    const age = Date.now() - new Date(parsed.fetchedAt).getTime();
    if (age < DISK_TTL_MS && Array.isArray(parsed.orders)) return parsed;
  } catch {
    // Missing or unreadable cache is the normal cold-start path.
  }
  return null;
}

async function writeDiskCache(key: string, snapshot: StoreSnapshot): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const file = path.join(CACHE_DIR, `${key}.json`);
    // Write-then-rename so a crash mid-write can't leave a truncated cache.
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(snapshot), { mode: 0o600 });
    await fs.rename(tmp, file);
  } catch (err) {
    // A read-only or full filesystem costs speed, never correctness: the
    // memory cache still serves, and the next cold start simply re-fetches.
    console.warn("[snapshot] could not persist cache:", err instanceof Error ? err.message : err);
  }
}

async function fetchLiveSnapshot(config: StoreConfig): Promise<StoreSnapshot> {
  const client = new WooClient(config);
  const warnings: string[] = [];
  const started = Date.now();

  const after = new Date();
  after.setMonth(after.getMonth() - (config.historyMonths || 24));

  // Sequenced deliberately: customers and products are small and quick, while
  // the order pull runs six connections wide. Running them together saturated
  // a real store badly enough that the customers request timed out.
  const [customers, products] = await Promise.all([
    client
      .getCustomers({ orderby: "registered_date", order: "asc", role: "all" }, config.maxPages)
      .catch((err) => {
        warnings.push(
          `Customer records unavailable (${describe(err)}). Customer analytics fall back to order billing data.`,
        );
        return [] as WooCustomer[];
      }),
    client.getProducts({ orderby: "date", order: "desc", status: "any" }, config.maxPages).catch((err) => {
      warnings.push(`Product catalogue unavailable (${describe(err)}). Product analytics use order line items only.`);
      return [] as WooProduct[];
    }),
  ]);

  let storeName = new URL(normalise(config.url)).hostname;
  let currency = "USD";
  try {
    const meta = await client.testConnection();
    storeName = meta.storeName || storeName;
    currency = meta.currency || currency;
  } catch {
    warnings.push("Store settings could not be read; using the currency inferred from orders.");
  }

  // Orders are load-bearing — if they fail there is nothing to analyse, so this
  // rejection is allowed to propagate.
  const orders = await client.getOrders(
    { after: after.toISOString(), orderby: "date", order: "asc", status: "any" },
    config.maxPages,
  );
  if (orders[0]?.currency) currency = orders[0].currency;

  if (orders.length === 0) {
    warnings.push(
      `No orders found in the last ${config.historyMonths} months. Widen the history window in Settings if the store is older.`,
    );
  }

  // A truncated pull silently skews every metric, so say so loudly.
  const pagesPulled = Math.ceil(orders.length / 100);
  if (pagesPulled >= config.maxPages) {
    warnings.push(
      `Order history was capped at ${config.maxPages} pages (${orders.length.toLocaleString()} orders). Raise the page limit in Settings to analyse the full history.`,
    );
  }

  console.info(
    `[snapshot] ${orders.length} orders, ${customers.length} customers, ${products.length} products in ${(
      (Date.now() - started) / 1000
    ).toFixed(1)}s`,
  );

  return slimSnapshot(decodeSnapshot({
    storeUrl: normalise(config.url),
    storeName,
    currency,
    fetchedAt: new Date().toISOString(),
    orders: orders as WooOrder[],
    customers,
    products: products as WooProduct[],
    warnings,
  }));
}

/**
 * WooCommerce serves names HTML-encoded. Decoding once here means charts,
 * tables, PDFs and CSVs never have to think about it.
 */
function decodeSnapshot(snapshot: StoreSnapshot): StoreSnapshot {
  snapshot.storeName = decodeEntities(snapshot.storeName);

  // Normalise attribution and drop the rest of the order meta before caching.
  attachAttribution(snapshot.orders);

  for (const product of snapshot.products) {
    product.name = decodeEntities(product.name);
    for (const c of product.categories ?? []) c.name = decodeEntities(c.name);
    for (const t of product.tags ?? []) t.name = decodeEntities(t.name);
  }

  for (const order of snapshot.orders) {
    for (const li of order.line_items) li.name = decodeEntities(li.name);
    for (const addr of [order.billing, order.shipping]) {
      if (!addr) continue;
      if (addr.first_name) addr.first_name = decodeEntities(addr.first_name);
      if (addr.last_name) addr.last_name = decodeEntities(addr.last_name);
      if (addr.company) addr.company = decodeEntities(addr.company);
      if (addr.city) addr.city = decodeEntities(addr.city);
    }
  }

  for (const customer of snapshot.customers) {
    customer.first_name = decodeEntities(customer.first_name);
    customer.last_name = decodeEntities(customer.last_name);
    if (customer.billing?.company) customer.billing.company = decodeEntities(customer.billing.company);
  }

  return snapshot;
}

function normalise(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function describe(err: unknown): string {
  if (err instanceof WooApiError) return err.message;
  return err instanceof Error ? err.message : String(err);
}

/**
 * Drops every cached copy of the given stores' snapshots.
 *
 * The shared cache has to be cleared by a key computed from the config. Reading
 * the keys back out of the in-process map only worked on an instance that had
 * already served that store, which on serverless is rarely the one handling the
 * disconnect — so the promise that disconnecting deletes every cached order was
 * not being kept.
 */
export async function invalidateSnapshotCache(configs: StoreConfig[]): Promise<void> {
  await Promise.all(
    configs.map(async (config) => {
      const key = cacheKey(config);
      cache.delete(key);
      inflight.delete(key);
      await Promise.all([
        fs.rm(path.join(CACHE_DIR, `${key}.json`), { force: true }).catch(() => {}),
        clearSharedSnapshot(key),
      ]);
    }),
  );
}
