import { db } from "@/lib/db/client";

/**
 * A tenant's connected WooCommerce stores.
 *
 * Every function here takes a `userId`. That is not incidental: the server
 * connects to Postgres as the table owner and therefore bypasses row level
 * security, so the policies that keep tenants apart do not protect this path.
 * Requiring the owner as an argument means a query cannot be written without
 * deciding whose data it is for — the mistake it prevents is the one that
 * leaks another merchant's revenue.
 *
 * Credentials are only ever written by the WooCommerce authorization flow.
 * There is deliberately no way to type a consumer key into this app, and no
 * env-var path either: a merchant pasting a secret into a form is the failure
 * mode that flow exists to remove.
 */

export interface StoreConfig {
  /** Surrogate id. Two tenants may connect the same shop, so a URL is not one. */
  id: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  /** How far back to pull orders. Cohorts and CLV need real history. */
  historyMonths: number;
  /** Safety valve so a huge store can't hang the first sync. */
  maxPages: number;
  name?: string;
  updatedAt?: string;
  lastSyncAt?: string | null;
  orderCount?: number;
}

export const DEFAULT_HISTORY_MONTHS = 24;
/** 100 orders per page — 300 pages covers a 30k-order history. */
export const DEFAULT_MAX_PAGES = 300;

interface StoreRow {
  id: string;
  url: string;
  name: string | null;
  consumer_key: string;
  consumer_secret: string;
  history_months: number;
  max_pages: number;
  is_active: boolean;
  last_sync_at: Date | null;
  order_count: number;
  updated_at: Date;
}

function toConfig(row: StoreRow): StoreConfig {
  return {
    id: row.id,
    url: row.url,
    name: row.name ?? undefined,
    consumerKey: row.consumer_key,
    consumerSecret: row.consumer_secret,
    historyMonths: row.history_months || DEFAULT_HISTORY_MONTHS,
    maxPages: row.max_pages || DEFAULT_MAX_PAGES,
    updatedAt: row.updated_at.toISOString(),
    lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    orderCount: row.order_count,
  };
}

/** The store this tenant's analytics read from. */
export async function readStoreConfig(userId: string): Promise<StoreConfig | null> {
  try {
    // Falls back to any store when none is flagged active, so a half-finished
    // write cannot present a connected tenant as disconnected.
    const [row] = await db()<StoreRow[]>`
      select id, url, name, consumer_key, consumer_secret, history_months,
             max_pages, is_active, last_sync_at, order_count, updated_at
      from stores
      where user_id = ${userId}
      order by is_active desc, updated_at desc
      limit 1
    `;
    return row ? toConfig(row) : null;
  } catch {
    return null;
  }
}

/** Every store this tenant has connected, active one first. */
export async function listStores(
  userId: string,
): Promise<{ active: string | null; stores: StoreConfig[] }> {
  try {
    const rows = await db()<StoreRow[]>`
      select id, url, name, consumer_key, consumer_secret, history_months,
             max_pages, is_active, last_sync_at, order_count, updated_at
      from stores
      where user_id = ${userId}
      order by is_active desc, updated_at desc
    `;
    if (rows.length === 0) return { active: null, stores: [] };
    const active = rows.find((r) => r.is_active) ?? rows[0];
    return { active: active.id, stores: rows.map(toConfig) };
  } catch {
    return { active: null, stores: [] };
  }
}

/**
 * Adds a store, or replaces its credentials if this tenant already connected
 * it, and makes it active.
 *
 * One transaction: clearing the previous active flag and setting the new one
 * are only correct together, because the partial unique index on `is_active`
 * would reject the insert if the clear had not landed.
 */
export async function upsertStore(
  userId: string,
  config: Omit<StoreConfig, "id">,
): Promise<StoreConfig> {
  return db().begin(async (tx) => {
    await tx`update stores set is_active = false where user_id = ${userId} and is_active`;

    const [row] = await tx<StoreRow[]>`
      insert into stores (
        user_id, url, name, consumer_key, consumer_secret,
        history_months, max_pages, is_active
      ) values (
        ${userId}, ${config.url}, ${config.name ?? null},
        ${config.consumerKey}, ${config.consumerSecret},
        ${config.historyMonths || DEFAULT_HISTORY_MONTHS},
        ${config.maxPages || DEFAULT_MAX_PAGES},
        true
      )
      on conflict (user_id, url) do update set
        name            = excluded.name,
        consumer_key    = excluded.consumer_key,
        consumer_secret = excluded.consumer_secret,
        is_active       = true,
        -- Keep the window the merchant already chose. A re-authorization is
        -- about credentials, not about their settings.
        history_months  = stores.history_months,
        max_pages       = stores.max_pages
      returning id, url, name, consumer_key, consumer_secret, history_months,
                max_pages, is_active, last_sync_at, order_count, updated_at
    `;
    return toConfig(row);
  });
}

export async function setActiveStore(userId: string, id: string): Promise<StoreConfig | null> {
  return db().begin(async (tx) => {
    const owned = await tx`select 1 from stores where id = ${id} and user_id = ${userId}`;
    if (owned.length === 0) return null;

    await tx`update stores set is_active = false where user_id = ${userId} and is_active`;
    const [row] = await tx<StoreRow[]>`
      update stores set is_active = true where id = ${id} and user_id = ${userId}
      returning id, url, name, consumer_key, consumer_secret, history_months,
                max_pages, is_active, last_sync_at, order_count, updated_at
    `;
    return row ? toConfig(row) : null;
  });
}

/**
 * Removes one store and everything mirrored under it.
 *
 * The orders, customers and products go with it through the foreign-key
 * cascade rather than by a delete written here — disconnecting a store must
 * not leave its order history behind.
 */
export async function removeStore(userId: string, id: string): Promise<StoreConfig | null> {
  return db().begin(async (tx) => {
    await tx`delete from stores where id = ${id} and user_id = ${userId}`;

    const [next] = await tx<StoreRow[]>`
      select id, url, name, consumer_key, consumer_secret, history_months,
             max_pages, is_active, last_sync_at, order_count, updated_at
      from stores where user_id = ${userId}
      order by is_active desc, updated_at desc limit 1
    `;
    if (!next) return null;

    // Removing the active store leaves nothing active; promote what remains
    // rather than stranding the tenant with stores nothing will read.
    if (!next.is_active) {
      await tx`update stores set is_active = true where id = ${next.id}`;
    }
    return toConfig({ ...next, is_active: true });
  });
}

/** Disconnects every store this tenant has. */
export async function clearStoreConfig(userId: string): Promise<void> {
  await db()`delete from stores where user_id = ${userId}`;
}

/** Updates the data-window settings of the tenant's active store. */
export async function updateStoreWindow(
  userId: string,
  patch: { historyMonths?: number; maxPages?: number },
): Promise<StoreConfig | null> {
  const [row] = await db()<StoreRow[]>`
    update stores set
      history_months = coalesce(${patch.historyMonths ?? null}, history_months),
      max_pages      = coalesce(${patch.maxPages ?? null}, max_pages)
    where id = (
      select id from stores where user_id = ${userId}
      order by is_active desc, updated_at desc limit 1
    )
    returning id, url, name, consumer_key, consumer_secret, history_months,
              max_pages, is_active, last_sync_at, order_count, updated_at
  `;
  return row ? toConfig(row) : null;
}

/** Never send the secret to the browser — the settings page shows this instead. */
export function redactConfig(config: StoreConfig | null) {
  if (!config) return null;
  return {
    id: config.id,
    url: config.url,
    name: config.name ?? null,
    consumerKey: maskSecret(config.consumerKey),
    historyMonths: config.historyMonths,
    maxPages: config.maxPages,
    updatedAt: config.updatedAt ?? null,
    lastSyncAt: config.lastSyncAt ?? null,
    orderCount: config.orderCount ?? 0,
  };
}

function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 5)}${"•".repeat(12)}${value.slice(-4)}`;
}
