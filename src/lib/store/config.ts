import { getStore } from "./kv";

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

/** Several stores may be connected; one is active at a time. */
interface StoreBook {
  version: 2;
  activeUrl: string;
  stores: StoreConfig[];
}

const CONFIG_KEY = "store-config";

export const DEFAULT_HISTORY_MONTHS = 24;
/** 100 orders per page — 300 pages covers a 30k-order history. */
export const DEFAULT_MAX_PAGES = 300;

/**
 * Credentials are only ever written by the WooCommerce authorization flow.
 *
 * There is deliberately no way to type a consumer key into this app, and no
 * env-var path either: a merchant pasting a secret into a form is the failure
 * mode the Woo auth endpoint exists to remove.
 */
async function readBook(): Promise<StoreBook | null> {
  try {
    const raw = await getStore().get(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoreBook | StoreConfig;

    // Migrate the original single-store shape in place on first read.
    if (!("version" in parsed)) {
      const single = parsed as StoreConfig;
      if (!single.url || !single.consumerKey || !single.consumerSecret) return null;
      return { version: 2, activeUrl: single.url, stores: [withDefaults(single)] };
    }

    const book = parsed as StoreBook;
    const stores = (book.stores ?? []).filter((s) => s.url && s.consumerKey && s.consumerSecret);
    if (stores.length === 0) return null;

    // An active pointer at a store that has been removed would strand the app.
    const activeUrl = stores.some((s) => s.url === book.activeUrl) ? book.activeUrl : stores[0].url;
    return { version: 2, activeUrl, stores: stores.map(withDefaults) };
  } catch {
    return null;
  }
}

function withDefaults(config: StoreConfig): StoreConfig {
  return {
    ...config,
    historyMonths: config.historyMonths || DEFAULT_HISTORY_MONTHS,
    maxPages: config.maxPages || DEFAULT_MAX_PAGES,
  };
}

async function writeBook(book: StoreBook): Promise<void> {
  await getStore().set(CONFIG_KEY, JSON.stringify(book));
}

/** The store every analytics request reads from. */
export async function readStoreConfig(): Promise<StoreConfig | null> {
  const book = await readBook();
  if (!book) return null;
  return book.stores.find((s) => s.url === book.activeUrl) ?? book.stores[0] ?? null;
}

/** Every connected store, active one first. */
export async function listStores(): Promise<{ active: string | null; stores: StoreConfig[] }> {
  const book = await readBook();
  if (!book) return { active: null, stores: [] };
  return { active: book.activeUrl, stores: book.stores };
}

/**
 * Adds a store, or replaces its credentials if it is already connected, and
 * makes it active. Re-authorizing an existing store should not create a
 * duplicate entry.
 */
export async function upsertStore(config: StoreConfig): Promise<void> {
  const book = (await readBook()) ?? { version: 2 as const, activeUrl: config.url, stores: [] };
  const next = withDefaults(config);
  const existing = book.stores.findIndex((s) => s.url === next.url);

  if (existing >= 0) {
    // Keep the window settings the merchant already chose for this store.
    next.historyMonths = book.stores[existing].historyMonths;
    next.maxPages = book.stores[existing].maxPages;
    book.stores[existing] = { ...next, updatedAt: new Date().toISOString() };
  } else {
    book.stores.push({ ...next, updatedAt: new Date().toISOString() });
  }

  book.activeUrl = next.url;
  await writeBook(book);
}

export async function setActiveStore(url: string): Promise<StoreConfig | null> {
  const book = await readBook();
  if (!book) return null;
  const target = book.stores.find((s) => s.url === url);
  if (!target) return null;
  book.activeUrl = url;
  await writeBook(book);
  return target;
}

/** Removes one store. Returns the config that is active afterwards, if any. */
export async function removeStore(url: string): Promise<StoreConfig | null> {
  const book = await readBook();
  if (!book) return null;

  const stores = book.stores.filter((s) => s.url !== url);
  if (stores.length === 0) {
    await getStore().delete(CONFIG_KEY);
    return null;
  }

  const activeUrl = stores.some((s) => s.url === book.activeUrl) ? book.activeUrl : stores[0].url;
  await writeBook({ version: 2, activeUrl, stores });
  return stores.find((s) => s.url === activeUrl) ?? null;
}

/** Removes every connected store. */
export async function clearStoreConfig(): Promise<void> {
  await getStore().delete(CONFIG_KEY);
}

/** Updates the data-window settings of the active store. */
export async function updateStoreWindow(patch: {
  historyMonths?: number;
  maxPages?: number;
}): Promise<StoreConfig | null> {
  const book = await readBook();
  if (!book) return null;

  const index = book.stores.findIndex((s) => s.url === book.activeUrl);
  if (index < 0) return null;

  book.stores[index] = {
    ...book.stores[index],
    historyMonths: patch.historyMonths ?? book.stores[index].historyMonths,
    maxPages: patch.maxPages ?? book.stores[index].maxPages,
  };
  await writeBook(book);
  return book.stores[index];
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
