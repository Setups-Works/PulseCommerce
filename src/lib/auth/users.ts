import { getStore } from "@/lib/store/kv";

/**
 * Accounts, with an email address and a password.
 *
 * What this replaces: a single `APP_PASSWORD` in the environment, shared by
 * everyone who had it, changeable only by redeploying, and revealing nothing
 * about who did what. An account is a thing you can add, remove and name.
 *
 * ─── Who is allowed to sign up ─────────────────────────────────────────────
 *
 * The first account claims the deployment. After that, registration is closed
 * and only a signed-in user can add another.
 *
 * This is not a marketplace: every account sees the same connected store, its
 * order history and its customers. Open registration would mean anyone who
 * found the URL could read all of it, which is the failure this whole change
 * exists to fix. Adding a colleague is a deliberate act by someone already
 * inside.
 *
 * ─── Passwords ─────────────────────────────────────────────────────────────
 *
 * PBKDF2-HMAC-SHA256, 210,000 iterations, 16 random bytes of salt per user —
 * the OWASP figure for this construction. Web Crypto rather than bcrypt or
 * argon2 so the same code runs in Proxy and in a route handler, and so the app
 * gains no native dependency it would otherwise have to build per platform.
 *
 * `iterations` is stored per record rather than read from a constant, so the
 * cost can be raised later without invalidating every existing password: old
 * records verify at the cost they were written with and are rewritten on next
 * sign-in.
 */

const USERS_KEY = "users";
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export interface UserRecord {
  id: string;
  /** Stored lowercase; compared lowercase. */
  email: string;
  name?: string;
  hash: string;
  salt: string;
  iterations: number;
  createdAt: string;
  lastLoginAt?: string;
  /** The first account. Cannot be removed, so the instance keeps an owner. */
  owner: boolean;
}

/** Everything safe to hand to a client. */
export type PublicUser = Pick<UserRecord, "id" | "email" | "name" | "createdAt" | "lastLoginAt" | "owner">;

interface UserBook {
  version: 1;
  users: UserRecord[];
}

const EMPTY: UserBook = { version: 1, users: [] };

/* ── Storage ──────────────────────────────────────────────────────────────
 *
 * Cached like the key book, and for the same reason: the shared store can be a
 * long way from the function, and Proxy reads this on protected requests.
 * Sign-in and any change write through, so the instance that made a change
 * never serves a stale view of it.
 */
const CACHE_TTL_MS = 30_000;
let cache: { book: UserBook; at: number } | null = null;

async function readBook(force = false): Promise<UserBook> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.book;

  try {
    const raw = await getStore().get(USERS_KEY);
    const book = raw ? (JSON.parse(raw) as UserBook) : EMPTY;
    if (!Array.isArray(book.users)) throw new Error("malformed user book");
    cache = { book, at: Date.now() };
    return book;
  } catch {
    if (cache) return cache.book;
    /*
     * Returning an empty book on a store failure would report "no accounts
     * yet", and the sign-up page treats that as an unclaimed deployment — a
     * transient outage would offer the store to whoever reloaded during it.
     * Callers that must not make that mistake use `readBookStrict`.
     */
    return EMPTY;
  }
}

/** Like `readBook`, but a storage failure is an error rather than "empty". */
async function readBookStrict(): Promise<UserBook> {
  const raw = await getStore().get(USERS_KEY);
  if (!raw) return EMPTY;
  const book = JSON.parse(raw) as UserBook;
  if (!Array.isArray(book.users)) throw new Error("The account store is unreadable.");
  return book;
}

async function writeBook(book: UserBook): Promise<void> {
  await getStore().set(USERS_KEY, JSON.stringify(book));
  cache = { book, at: Date.now() };
}

/* ── Hashing ────────────────────────────────────────────────────────────── */

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    KEY_BITS,
  );
  return toHex(new Uint8Array(bits));
}

/** Constant-time compare over two hex digests of equal length. */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ── Queries ────────────────────────────────────────────────────────────── */

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** How many accounts exist. Zero means the deployment is unclaimed. */
export async function userCount(): Promise<number> {
  return (await readBook()).users.length;
}

/**
 * Whether anyone has claimed this deployment yet.
 *
 * Strict read: a storage failure must not be reported as "unclaimed", because
 * the sign-up page would then let a passer-by claim a store during an outage.
 */
export async function needsFirstAccount(): Promise<boolean> {
  return (await readBookStrict()).users.length === 0;
}

export async function listUsers(): Promise<PublicUser[]> {
  const book = await readBook();
  return book.users.map(({ id, email, name, createdAt, lastLoginAt, owner }) => ({
    id,
    email,
    name,
    createdAt,
    lastLoginAt,
    owner,
  }));
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const book = await readBook();
  const user = book.users.find((u) => u.id === id);
  if (!user) return null;
  const { id: uid, email, name, createdAt, lastLoginAt, owner } = user;
  return { id: uid, email, name, createdAt, lastLoginAt, owner };
}

/* ── Mutations ──────────────────────────────────────────────────────────── */

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with that email already exists.");
  }
}

export async function createUser(
  email: string,
  password: string,
  name?: string,
): Promise<PublicUser> {
  const book = await readBookStrict();
  const normalised = normaliseEmail(email);

  if (book.users.some((u) => u.email === normalised)) throw new DuplicateEmailError();

  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);

  const record: UserRecord = {
    id: crypto.randomUUID(),
    email: normalised,
    name: name?.trim().slice(0, 80) || undefined,
    hash: await derive(password, salt, ITERATIONS),
    salt: toHex(salt),
    iterations: ITERATIONS,
    createdAt: new Date().toISOString(),
    // Whoever gets there first owns the instance.
    owner: book.users.length === 0,
  };

  await writeBook({ ...book, version: 1, users: [...book.users, record] });

  const { id, email: e, name: n, createdAt, owner } = record;
  return { id, email: e, name: n, createdAt, owner };
}

/**
 * Checks an email and password, returning the account or null.
 *
 * Always does the full derivation, even when the email is unknown, so the
 * response time does not reveal which addresses have accounts.
 */
export async function verifyCredentials(email: string, password: string): Promise<PublicUser | null> {
  const book = await readBook();
  const normalised = normaliseEmail(email);
  const user = book.users.find((u) => u.email === normalised);

  if (!user) {
    // Burn equivalent work against a throwaway salt. Without this, "unknown
    // email" returns in microseconds and "wrong password" in ~200ms, which is
    // a reliable account-enumeration oracle.
    const decoy = new Uint8Array(SALT_BYTES);
    crypto.getRandomValues(decoy);
    await derive(password, decoy, ITERATIONS);
    return null;
  }

  const candidate = await derive(password, fromHex(user.salt), user.iterations);
  if (!safeEqualHex(candidate, user.hash)) return null;

  // Passing the password is what lets an old record be rehashed at the current
  // cost; this is the only point at which the plaintext is in hand.
  void recordLogin(user.id, password);

  const { id, email: e, name, createdAt, owner } = user;
  return { id, email: e, name, createdAt, owner };
}

/**
 * Stamps the sign-in and, if the record predates a raised cost, rehashes at
 * the current one — the only moment the plaintext password is available.
 */
async function recordLogin(id: string, password?: string): Promise<void> {
  try {
    const book = await readBook(true);
    const user = book.users.find((u) => u.id === id);
    if (!user) return;

    let updated: UserRecord = { ...user, lastLoginAt: new Date().toISOString() };

    if (password && user.iterations < ITERATIONS) {
      const salt = new Uint8Array(SALT_BYTES);
      crypto.getRandomValues(salt);
      updated = {
        ...updated,
        hash: await derive(password, salt, ITERATIONS),
        salt: toHex(salt),
        iterations: ITERATIONS,
      };
    }

    await writeBook({ ...book, users: book.users.map((u) => (u.id === id ? updated : u)) });
  } catch {
    // Bookkeeping. A failure here must not fail a valid sign-in.
  }
}

export async function changePassword(id: string, next: string): Promise<boolean> {
  const book = await readBookStrict();
  const user = book.users.find((u) => u.id === id);
  if (!user) return false;

  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);

  // Derive before writing, so hash and salt land together in one write. Any
  // ordering that commits a new salt separately from its hash leaves a window
  // where the record verifies against neither password.
  const hash = await derive(next, salt, ITERATIONS);

  await writeBook({
    ...book,
    users: book.users.map((u) =>
      u.id === id ? { ...u, hash, salt: toHex(salt), iterations: ITERATIONS } : u,
    ),
  });
  return true;
}

/** The owner cannot be removed, so the instance is never left unadministered. */
export async function removeUser(id: string): Promise<{ removed: boolean; reason?: string }> {
  const book = await readBookStrict();
  const user = book.users.find((u) => u.id === id);
  if (!user) return { removed: false, reason: "No such account." };
  if (user.owner) return { removed: false, reason: "The owner account cannot be removed." };

  await writeBook({ ...book, users: book.users.filter((u) => u.id !== id) });
  return { removed: true };
}
