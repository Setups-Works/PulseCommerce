/**
 * The shape of a store connection.
 *
 * Split out of config.ts so the Postgres repository and the key/value fallback
 * can both refer to it without importing each other — config.ts imports the
 * repository, so the repository cannot import config.ts back.
 */
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
  /**
   * The owning organization, in SaaS mode. Undefined when self-hosted, where
   * there is only one tenant.
   *
   * Load-bearing for cache isolation, not just bookkeeping: the snapshot cache
   * key is derived from it, so two tenants who connect the same shop get two
   * caches. Without it they would share one, and revoking access at the store
   * would not stop the other tenant reading the copy already pulled.
   */
  tenantId?: string;
}

export const DEFAULT_HISTORY_MONTHS = 24;
/** 100 orders per page — 300 pages covers a 30k-order history. */
export const DEFAULT_MAX_PAGES = 300;

export function withStoreDefaults(config: StoreConfig): StoreConfig {
  return {
    ...config,
    historyMonths: config.historyMonths || DEFAULT_HISTORY_MONTHS,
    maxPages: config.maxPages || DEFAULT_MAX_PAGES,
  };
}
