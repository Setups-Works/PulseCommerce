import { db } from "@/lib/db/client";

export interface StoreConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  /** How far back to pull orders. Cohorts and CLV need real history. */
  historyMonths: number;
  /** Safety valve so a huge store can't hang the first request. */
  maxPages: number;
  /** Display name, captured when the connection was verified. */
  name?: string;
  updatedAt?: string;
}

export const DEFAULT_HISTORY_MONTHS = 24;
/** 100 orders per page — 300 pages covers a 30k-order history. */
export const DEFAULT_MAX_PAGES = 300;

/**
 * The connected WooCommerce store, or stores.
 *
 * Credentials are only ever written by the WooCommerce authorization flow.
 * There is deliberately no way to type a consumer key into this app, and no
 * env-var path either: a merchant pasting a secret into a form is the failure
 * mode the Woo auth endpoint exists to remove.
 *
 * ─── Why one row per store ─────────────────────────────────────────────────
 *
 * This used to be a single JSON document holding every store and a pointer to
 * the active one. Switching stores meant rewriting the document, which meant
 * two overlapping requests could leave the pointer aimed at a store that the
 * other request had just removed. "Exactly one store is active" is a database
 * constraint now — a partial unique index on `is_active` — so it holds no
 * matter what order writes arrive in, rather than depending on every write
 * path remembering to maintain it.
 */

interface ConfigRow {
  store_url: string;
  name: string | null;
  consumer_key: string;
  consumer_secret: string;
  history_months: number;
  max_pages: number;
  is_active: boolean;
  updated_at: Date;
}

function toConfig(row: ConfigRow): StoreConfig {
  return {
    url: row.store_url,
    name: row.name ?? undefined,
    consumerKey: row.consumer_key,
    consumerSecret: row.consumer_secret,
    historyMonths: row.history_months || DEFAULT_HISTORY_MONTHS,
    maxPages: row.max_pages || DEFAULT_MAX_PAGES,
    updatedAt: row.updated_at.toISOString(),
  };
}

/** The store every analytics request reads from. */
export async function readStoreConfig(): Promise<StoreConfig | null> {
  try {
    // Falls back to any store when none is flagged active, so a half-finished
    // write cannot present the app as disconnected when a store exists.
    const [row] = await db()<ConfigRow[]>`
      select store_url, name, consumer_key, consumer_secret,
             history_months, max_pages, is_active, updated_at
      from store_config
      order by is_active desc, updated_at desc
      limit 1
    `;
    return row ? toConfig(row) : null;
  } catch {
    // The dashboard treats null as "not connected", which is the right thing
    // to show when the database cannot be reached.
    return null;
  }
}

/** Every connected store, active one first. */
export async function listStores(): Promise<{ active: string | null; stores: StoreConfig[] }> {
  try {
    const rows = await db()<ConfigRow[]>`
      select store_url, name, consumer_key, consumer_secret,
             history_months, max_pages, is_active, updated_at
      from store_config
      order by is_active desc, updated_at desc
    `;
    if (rows.length === 0) return { active: null, stores: [] };
    const active = rows.find((r) => r.is_active) ?? rows[0];
    return { active: active.store_url, stores: rows.map(toConfig) };
  } catch {
    return { active: null, stores: [] };
  }
}

/**
 * Adds a store, or replaces its credentials if already connected, and makes it
 * active. Re-authorizing an existing store must not create a duplicate.
 *
 * One transaction, because clearing the previous active flag and setting the
 * new one are only correct together: the partial unique index would reject the
 * second write if the first had not landed.
 */
export async function upsertStore(config: StoreConfig): Promise<void> {
  await db().begin(async (tx) => {
    await tx`update store_config set is_active = false where is_active`;
    await tx`
      insert into store_config (
        store_url, name, consumer_key, consumer_secret,
        history_months, max_pages, is_active
      ) values (
        ${config.url},
        ${config.name ?? null},
        ${config.consumerKey},
        ${config.consumerSecret},
        ${config.historyMonths || DEFAULT_HISTORY_MONTHS},
        ${config.maxPages || DEFAULT_MAX_PAGES},
        true
      )
      on conflict (store_url) do update set
        name            = excluded.name,
        consumer_key    = excluded.consumer_key,
        consumer_secret = excluded.consumer_secret,
        is_active       = true,
        -- Keep the window the merchant already chose for this store; a
        -- re-authorization is about credentials, not about their settings.
        history_months  = store_config.history_months,
        max_pages       = store_config.max_pages
    `;
  });
}

export async function setActiveStore(url: string): Promise<StoreConfig | null> {
  return db().begin(async (tx) => {
    const existing = await tx`select 1 from store_config where store_url = ${url}`;
    if (existing.length === 0) return null;

    await tx`update store_config set is_active = false where is_active`;
    const [row] = await tx<ConfigRow[]>`
      update store_config set is_active = true where store_url = ${url}
      returning store_url, name, consumer_key, consumer_secret,
                history_months, max_pages, is_active, updated_at
    `;
    return row ? toConfig(row) : null;
  });
}

/** Removes one store. Returns the config that is active afterwards, if any. */
export async function removeStore(url: string): Promise<StoreConfig | null> {
  return db().begin(async (tx) => {
    await tx`delete from store_config where store_url = ${url}`;

    const [next] = await tx<ConfigRow[]>`
      select store_url, name, consumer_key, consumer_secret,
             history_months, max_pages, is_active, updated_at
      from store_config order by is_active desc, updated_at desc limit 1
    `;
    if (!next) return null;

    // Removing the active store leaves nothing active; promote whatever is
    // left rather than stranding the app with stores it will not read.
    if (!next.is_active) {
      await tx`update store_config set is_active = true where store_url = ${next.store_url}`;
    }
    return toConfig({ ...next, is_active: true });
  });
}

/** Removes every connected store. */
export async function clearStoreConfig(): Promise<void> {
  await db()`delete from store_config`;
}

/** Updates the data-window settings of the active store. */
export async function updateStoreWindow(patch: {
  historyMonths?: number;
  maxPages?: number;
}): Promise<StoreConfig | null> {
  const [row] = await db()<ConfigRow[]>`
    update store_config set
      history_months = coalesce(${patch.historyMonths ?? null}, history_months),
      max_pages      = coalesce(${patch.maxPages ?? null}, max_pages)
    where store_url = (
      select store_url from store_config order by is_active desc, updated_at desc limit 1
    )
    returning store_url, name, consumer_key, consumer_secret,
              history_months, max_pages, is_active, updated_at
  `;
  return row ? toConfig(row) : null;
}

/** Never send the secret to the browser — the settings page shows this instead. */
export function redactConfig(config: StoreConfig | null) {
  if (!config) return null;
  return {
    url: config.url,
    name: config.name ?? null,
    consumerKey: maskSecret(config.consumerKey),
    historyMonths: config.historyMonths,
    maxPages: config.maxPages,
    updatedAt: config.updatedAt ?? null,
  };
}

function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 5)}${"•".repeat(12)}${value.slice(-4)}`;
}
