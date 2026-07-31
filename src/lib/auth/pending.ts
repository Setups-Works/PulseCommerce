import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Short-lived state for an in-flight WooCommerce authorization.
 *
 * The flow is split across two requests that Woo makes independently: a
 * server-to-server POST carrying the credentials, and a browser redirect back
 * to us. The `state` token is what ties them together and stops an attacker
 * POSTing arbitrary credentials into someone else's session.
 */

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "pending-auth.json");
const TTL_MS = 15 * 60 * 1000;

export interface PendingAuth {
  state: string;
  storeUrl: string;
  createdAt: number;
  /** Set by the callback once Woo delivers credentials. */
  completed?: {
    consumerKey: string;
    consumerSecret: string;
    keyPermissions: string;
  };
}

type Store = Record<string, PendingAuth>;

async function read(): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Store;
  } catch {
    return {};
  }
}

async function write(store: Store): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(store), { mode: 0o600 });
}

function prune(store: Store): Store {
  const now = Date.now();
  const out: Store = {};
  for (const [k, v] of Object.entries(store)) {
    if (now - v.createdAt < TTL_MS) out[k] = v;
  }
  return out;
}

export async function createPending(storeUrl: string): Promise<PendingAuth> {
  const store = prune(await read());
  const pending: PendingAuth = {
    state: randomBytes(24).toString("hex"),
    storeUrl,
    createdAt: Date.now(),
  };
  store[pending.state] = pending;
  await write(store);
  return pending;
}

export async function getPending(state: string): Promise<PendingAuth | null> {
  const store = prune(await read());
  return store[state] ?? null;
}

export async function completePending(
  state: string,
  credentials: NonNullable<PendingAuth["completed"]>,
): Promise<PendingAuth | null> {
  const store = prune(await read());
  const pending = store[state];
  if (!pending) return null;
  pending.completed = credentials;
  store[state] = pending;
  await write(store);
  return pending;
}

export async function consumePending(state: string): Promise<PendingAuth | null> {
  const store = prune(await read());
  const pending = store[state];
  if (!pending) return null;
  delete store[state];
  await write(store);
  return pending;
}
