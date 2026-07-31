import { promises as fs } from "node:fs";
import path from "node:path";

export interface StoreConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  /** How far back to pull orders. Cohorts and CLV need real history. */
  historyMonths: number;
  /** Safety valve so a huge store can't hang the first request. */
  maxPages: number;
  updatedAt?: string;
}

const CONFIG_DIR = path.join(process.cwd(), ".data");
const CONFIG_FILE = path.join(CONFIG_DIR, "store-config.json");

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
export async function readStoreConfig(): Promise<StoreConfig | null> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreConfig;
    if (!parsed.url || !parsed.consumerKey || !parsed.consumerSecret) return null;
    return {
      ...parsed,
      historyMonths: parsed.historyMonths || DEFAULT_HISTORY_MONTHS,
      maxPages: parsed.maxPages || DEFAULT_MAX_PAGES,
    };
  } catch {
    return null;
  }
}

export async function writeStoreConfig(config: StoreConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(
    CONFIG_FILE,
    JSON.stringify({ ...config, updatedAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 },
  );
}

export async function clearStoreConfig(): Promise<void> {
  await fs.rm(CONFIG_FILE, { force: true });
}

/** Updates the data-window settings without touching the credentials. */
export async function updateStoreWindow(patch: {
  historyMonths?: number;
  maxPages?: number;
}): Promise<StoreConfig | null> {
  const current = await readStoreConfig();
  if (!current) return null;
  const next: StoreConfig = {
    ...current,
    historyMonths: patch.historyMonths ?? current.historyMonths,
    maxPages: patch.maxPages ?? current.maxPages,
  };
  await writeStoreConfig(next);
  return next;
}

/** Never send the secret to the browser — the settings page shows this instead. */
export function redactConfig(config: StoreConfig | null) {
  if (!config) return null;
  return {
    url: config.url,
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
