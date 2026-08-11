import { db } from "@/lib/db/client";

/**
 * API keys, for using this app's API from somewhere else.
 *
 * The dashboard authenticates with a session cookie. That works for a browser
 * and not at all for a script: there is no login to automate, and the cookie
 * is tied to a redirect a person walks through by hand. A key is the thing you
 * can put in a config file.
 *
 * ─── What is stored ────────────────────────────────────────────────────────
 *
 * Only a SHA-256 digest of the key, never the key itself. A digest is enough
 * to answer "is this the key I issued?" and useless to anyone who reads the
 * table — which matters, because the same database holds the WooCommerce
 * consumer secret and every customer's contact details.
 *
 * The consequence is that a key is displayed exactly once, at creation. There
 * is no "show key" later because there is nothing to show.
 *
 * No salt, deliberately. A salt defends against precomputation over a small
 * search space, which is why passwords need one; these keys are 32 bytes from
 * a CSPRNG, so there is no space to precompute over.
 */

/** Distinguishes a key at a glance and makes a leaked one greppable. */
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
  name: string;
  display: string;
  scopes: Scope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface KeyRow {
  id: string;
  name: string;
  display: string;
  scopes: string[];
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
}

function toRecord(row: KeyRow): ApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    display: row.display,
    scopes: row.scopes as Scope[],
    createdAt: row.created_at.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
    revokedAt: row.revoked_at?.toISOString() ?? null,
  };
}

/* ── Hashing ────────────────────────────────────────────────────────────── */

/** Web Crypto, so this behaves identically in Proxy and in a route handler. */
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

export async function createApiKey(
  name: string,
  scopes: Scope[],
  userId?: string,
): Promise<CreatedKey> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  // base64url: URL-safe and header-safe, so the key survives being pasted into
  // a query string, an env file or an Authorization header unescaped.
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const body = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const key = `${PREFIX}${body}`;
  const effective = scopes.length ? scopes : (["read"] as Scope[]);

  const [row] = await db()<KeyRow[]>`
    insert into api_keys (user_id, name, hash, display, scopes)
    values (
      ${userId ?? null},
      ${name.trim().slice(0, 60) || "Untitled key"},
      ${await sha256(key)},
      ${`${PREFIX}${body.slice(0, 4)}…${body.slice(-4)}`},
      ${effective}
    )
    returning id, name, display, scopes, created_at, last_used_at, revoked_at
  `;

  return { record: toRecord(row), key };
}

/** Revoked rather than deleted, so an audit of past access stays possible. */
export async function revokeApiKey(id: string): Promise<boolean> {
  const rows = await db()`
    update api_keys set revoked_at = now()
    where id = ${id} and revoked_at is null
    returning id
  `;
  return rows.length > 0;
}

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  const rows = await db()<KeyRow[]>`
    select id, name, display, scopes, created_at, last_used_at, revoked_at
    from api_keys
    order by revoked_at nulls first, created_at desc
  `;
  return rows.map(toRecord);
}

/* ── Verification ───────────────────────────────────────────────────────── */

/**
 * Resolves a presented key to its record, or null.
 *
 * A digest is compared rather than the key, over a unique index, so this is a
 * single indexed lookup on a value an attacker cannot steer: two different
 * keys produce two unrelated digests, and there is no prefix to walk one
 * character at a time.
 *
 * This runs on every authenticated request. It is one indexed query against a
 * partial index covering only live keys — cheap enough not to need the
 * in-process cache the previous implementation required, which also removes
 * the window where a revoked key kept working on a warm instance.
 */
export async function verifyApiKey(presented: string): Promise<ApiKeyRecord | null> {
  if (!presented.startsWith(PREFIX)) return null;

  const hash = await sha256(presented);

  /*
   * Stamp last_used_at in the same statement that reads the key, at most
   * hourly. "When did this key last run?" is how you find the integration
   * nobody remembers owning before revoking it; writing on every request to
   * maintain a timestamp nobody reads at that resolution would double the cost
   * of authenticating.
   */
  const [row] = await db()<KeyRow[]>`
    update api_keys
       set last_used_at = case
             when last_used_at is null or last_used_at < now() - interval '1 hour'
             then now() else last_used_at
           end
     where hash = ${hash} and revoked_at is null
    returning id, name, display, scopes, created_at, last_used_at, revoked_at
  `;

  return row ? toRecord(row) : null;
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
