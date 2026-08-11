import { getStore } from "@/lib/store/kv";

/**
 * API keys, for using this app's API from somewhere else.
 *
 * The dashboard authenticates with a session cookie minted by the WooCommerce
 * authorization flow. That works for a browser and not at all for a script:
 * there is no login to automate, and the cookie is tied to a redirect the
 * merchant walks through by hand. A key is the thing you can put in a config
 * file.
 *
 * ─── What is stored ────────────────────────────────────────────────────────
 *
 * Only a SHA-256 digest of the key, never the key itself. A digest is enough
 * to answer "is this the key I issued?" and useless to anyone who reads the
 * table — which matters here, because the same store also holds the
 * WooCommerce consumer secret and a copy of the order history.
 *
 * The consequence is that a key is displayed exactly once, when it is created.
 * There is no "show key" later because there is nothing to show. Losing one
 * means issuing a new one, which is the correct trade.
 *
 * No salt, deliberately. A salt defends against precomputation over a small
 * search space, which is why passwords need one; these keys are 32 bytes from
 * a CSPRNG, so there is no space to precompute over.
 */

/** Where the key list lives in the shared store. */
const KEYS_KEY = "api-keys";

/** Distinguishes a key at a glance and makes leaked keys greppable. */
const PREFIX = "pc_live_";

/**
 * What a key is allowed to do.
 *
 * Two scopes rather than one per endpoint. The meaningful line is between
 * reading a merchant's figures and taking an action in the world — sending
 * WhatsApp messages to their customers, creating coupons that cost money. A
 * finer split would be more to configure without changing what anyone can
 * actually do wrong.
 */
export const SCOPES = ["read", "write"] as const;
export type Scope = (typeof SCOPES)[number];

export interface ApiKeyRecord {
  id: string;
  /** Merchant-supplied label, so a key can be recognised before revoking it. */
  name: string;
  /** SHA-256 of the key, hex. */
  hash: string;
  /** Leading characters of the key, for display. Not secret, not sufficient. */
  display: string;
  scopes: Scope[];
  createdAt: string;
  /** Coarse; see `touch()` for why it is not exact. */
  lastUsedAt?: string;
  revokedAt?: string;
}

interface KeyBook {
  version: 1;
  keys: ApiKeyRecord[];
}

const EMPTY: KeyBook = { version: 1, keys: [] };

/* ── Reading ──────────────────────────────────────────────────────────────
 *
 * Every authenticated request needs the key list, and the shared store can be
 * a Supabase project a long way from the function — measured at ~190ms per
 * round trip, which is not a cost worth paying on each call.
 *
 * So the list is cached in-process. The cost of that is revocation latency: a
 * revoked key keeps working on an already-warm instance for up to TTL. That is
 * the honest trade and it is why the TTL is seconds rather than minutes, and
 * why revoking clears the cache on the instance that performed it.
 */
const CACHE_TTL_MS = 30_000;
let cache: { book: KeyBook; at: number } | null = null;

async function readBook(force = false): Promise<KeyBook> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.book;

  try {
    const raw = await getStore().get(KEYS_KEY);
    const book = raw ? (JSON.parse(raw) as KeyBook) : EMPTY;
    // A malformed document must not lock everyone out or, worse, be treated as
    // an empty list that silently accepts nothing.
    if (!Array.isArray(book.keys)) throw new Error("malformed key book");
    cache = { book, at: Date.now() };
    return book;
  } catch {
    // Serving the last good copy beats failing closed on a transient blip.
    if (cache) return cache.book;
    return EMPTY;
  }
}

async function writeBook(book: KeyBook): Promise<void> {
  await getStore().set(KEYS_KEY, JSON.stringify(book));
  cache = { book, at: Date.now() };
}

/* ── Hashing ────────────────────────────────────────────────────────────── */

/** Web Crypto, so this file behaves the same in Proxy and in a route handler. */
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── Lifecycle ──────────────────────────────────────────────────────────── */

export interface CreatedKey {
  record: ApiKeyRecord;
  /** The only time the caller will ever see this. */
  key: string;
}

export async function createApiKey(name: string, scopes: Scope[]): Promise<CreatedKey> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  // base64url: URL-safe and header-safe, so the key survives being pasted into
  // a query string, an env file or an Authorization header unescaped.
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const body = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const key = `${PREFIX}${body}`;
  const record: ApiKeyRecord = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 60) || "Untitled key",
    hash: await sha256(key),
    display: `${PREFIX}${body.slice(0, 4)}…${body.slice(-4)}`,
    scopes: scopes.length ? scopes : ["read"],
    createdAt: new Date().toISOString(),
  };

  const book = await readBook(true);
  await writeBook({ ...book, keys: [...book.keys, record] });

  return { record, key };
}

/** Revoked rather than deleted, so an audit of past access stays possible. */
export async function revokeApiKey(id: string): Promise<boolean> {
  const book = await readBook(true);
  const target = book.keys.find((k) => k.id === id && !k.revokedAt);
  if (!target) return false;

  await writeBook({
    ...book,
    keys: book.keys.map((k) =>
      k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k,
    ),
  });
  return true;
}

/** Never includes `hash` — callers render this straight into a response. */
export async function listApiKeys(): Promise<Omit<ApiKeyRecord, "hash">[]> {
  const book = await readBook();
  return book.keys.map(({ hash: _hash, ...rest }) => rest);
}

/** True when at least one usable key exists. */
export async function hasActiveKeys(): Promise<boolean> {
  const book = await readBook();
  return book.keys.some((k) => !k.revokedAt);
}

/* ── Verification ───────────────────────────────────────────────────────── */

/**
 * Resolves a presented key to its record, or null.
 *
 * The digest is compared rather than the key, so this is already a
 * constant-length comparison over values an attacker cannot steer: two
 * different keys produce two unrelated digests, and there is no prefix to walk
 * one character at a time.
 */
export async function verifyApiKey(presented: string): Promise<ApiKeyRecord | null> {
  if (!presented.startsWith(PREFIX)) return null;

  const hash = await sha256(presented);
  const book = await readBook();
  const match = book.keys.find((k) => k.hash === hash);
  if (!match || match.revokedAt) return null;

  void touch(match.id);
  return match;
}

/**
 * Records that a key was used, at most once an hour.
 *
 * "When did this key last run?" is worth answering — it is how you find the
 * integration nobody remembers owning before revoking it. Writing on every
 * request would add a store write to every API call to maintain a timestamp
 * nobody reads at that resolution, so it is deliberately coarse.
 */
async function touch(id: string): Promise<void> {
  try {
    const book = await readBook();
    const record = book.keys.find((k) => k.id === id);
    if (!record) return;

    const last = record.lastUsedAt ? Date.parse(record.lastUsedAt) : 0;
    if (Date.now() - last < 60 * 60 * 1000) return;

    await writeBook({
      ...book,
      keys: book.keys.map((k) =>
        k.id === id ? { ...k, lastUsedAt: new Date().toISOString() } : k,
      ),
    });
  } catch {
    // Bookkeeping. Never fail a request the key was entitled to make.
  }
}

/** Pulls the key out of `Authorization: Bearer …` or `X-API-Key`. */
export function readPresentedKey(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth) {
    const [scheme, ...rest] = auth.trim().split(/\s+/);
    const value = rest.join("");
    if (scheme?.toLowerCase() === "bearer" && value) return value;
  }
  return headers.get("x-api-key")?.trim() || null;
}
