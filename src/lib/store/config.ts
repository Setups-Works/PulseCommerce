import { getStore } from "./kv";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  DEFAULT_HISTORY_MONTHS,
  DEFAULT_MAX_PAGES,
  withStoreDefaults,
  type StoreConfig,
} from "./types";

export type { StoreConfig };
export { DEFAULT_HISTORY_MONTHS, DEFAULT_MAX_PAGES };

/**
 * Where a store connection lives, and who it belongs to.
 *
 * ─── Two modes, one API ────────────────────────────────────────────────────
 *
 * SaaS mode — Supabase configured. Connections live in `public.stores`, scoped
 * to the caller's organization and enforced by row level security. Each tenant
 * has their own active store, and the functions below resolve *the caller's*
 * rather than the deployment's.
 *
 * Self-hosted mode — no Supabase. Connections live in one key/value entry, as
 * they always have. One deployment, one merchant, no accounts. This is what
 * makes `git clone && npm run dev` still work, and it is a supported way to
 * run the product rather than a degraded fallback.
 *
 * ⚠ The key/value path is single-tenant by construction. It is reached only
 * when there is no Supabase project, and therefore no accounts, so there are
 * no tenants to confuse. Do not "improve" it by using it as a cache in SaaS
 * mode — that would reintroduce exactly the cross-tenant leak this split
 * exists to remove.
 *
 * Every function keeps the signature it had before multi-tenancy, so the eight
 * call sites did not have to change. `readStoreConfig()` still takes no
 * argument; it now answers "the caller's active store" instead of "the
 * deployment's".
 */

/** Several stores may be connected; one is active at a time. */
interface StoreBook {
  version: 2;
  activeUrl: string;
  stores: StoreConfig[];
}

const CONFIG_KEY = "store-config";

/** True when connections are per-tenant rather than per-deployment. */
function multiTenant(): boolean {
  return isSupabaseConfigured();
}

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
      return { version: 2, activeUrl: single.url, stores: [withStoreDefaults(single)] };
    }

    const book = parsed as StoreBook;
    const stores = (book.stores ?? []).filter((s) => s.url && s.consumerKey && s.consumerSecret);
    if (stores.length === 0) return null;

    // An active pointer at a store that has been removed would strand the app.
    const activeUrl = stores.some((s) => s.url === book.activeUrl) ? book.activeUrl : stores[0].url;
    return { version: 2, activeUrl, stores: stores.map(withStoreDefaults) };
  } catch {
    return null;
  }
}

async function writeBook(book: StoreBook): Promise<void> {
  await getStore().set(CONFIG_KEY, JSON.stringify(book));
}

/** The store the *caller's* analytics requests read from. */
export async function readStoreConfig(): Promise<StoreConfig | null> {
  if (multiTenant()) {
    const { readActiveStore } = await import("@/repositories/store-repository");
    return readActiveStore();
  }
  const book = await readBook();
  if (!book) return null;
  return book.stores.find((s) => s.url === book.activeUrl) ?? book.stores[0] ?? null;
}

/** Every store connected by the caller's organization. */
export async function listStores(): Promise<{ active: string | null; stores: StoreConfig[] }> {
  if (multiTenant()) {
    const { listTenantStores, readActiveStore } = await import("@/repositories/store-repository");
    const [stores, active] = await Promise.all([listTenantStores(), readActiveStore()]);
    return { active: active?.url ?? null, stores };
  }
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
  if (multiTenant()) {
    const { upsertTenantStore } = await import("@/repositories/store-repository");
    if (await upsertTenantStore(withStoreDefaults(config))) return;
    // Falling through would write the credential to a deployment-global key
    // that another tenant can read. Failing loudly is the safer outcome.
    throw new Error("Could not save the store connection for this account.");
  }

  const book = (await readBook()) ?? { version: 2 as const, activeUrl: config.url, stores: [] };
  const next = withStoreDefaults(config);
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
  if (multiTenant()) {
    const { setActiveTenantStore, readActiveStore } = await import(
      "@/repositories/store-repository"
    );
    if (!(await setActiveTenantStore(url))) return null;
    return readActiveStore();
  }

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
  if (multiTenant()) {
    const { removeTenantStore, readActiveStore } = await import(
      "@/repositories/store-repository"
    );
    if (!(await removeTenantStore(url))) return null;
    return readActiveStore();
  }

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

/** Removes every store connected by the caller's organization. */
export async function clearStoreConfig(): Promise<void> {
  if (multiTenant()) {
    const { listTenantStores, removeTenantStore } = await import(
      "@/repositories/store-repository"
    );
    for (const store of await listTenantStores()) await removeTenantStore(store.url);
    return;
  }
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
