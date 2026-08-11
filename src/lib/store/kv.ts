import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Durable key-value storage for the issued WooCommerce key and the cached
 * order snapshot.
 *
 * Three backends, picked from the environment in this order:
 *
 *   Supabase   — a `kv_store` table, reached with the service-role key. The
 *                default for a hosted deployment: it is the same project the
 *                rest of the stack already uses, and Postgres holds a
 *                multi-megabyte snapshot without the per-value size limits a
 *                Redis plan tends to impose.
 *   Redis      — any Upstash-compatible endpoint, including Vercel KV.
 *   Filesystem — a directory next to the app. The simplest thing that works,
 *                and what a self-hosted install gets with no configuration.
 *
 * The distinction that matters is `durable`. Serverless platforms have a
 * read-only filesystem and start every instance empty, so without a shared
 * backend each cold start re-pulls the entire order history — slow for the
 * merchant, and enough sustained traffic that a store's security layer starts
 * refusing us.
 */
export interface KeyValueStore {
  readonly name: string;
  readonly durable: boolean;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

class FileStore implements KeyValueStore {
  readonly name = "filesystem";
  readonly durable = true;

  constructor(private readonly dir: string) {}

  private file(key: string): string {
    // Keys are internal constants, but keep traversal impossible regardless.
    return path.join(this.dir, `${key.replace(/[^a-z0-9_-]/gi, "_")}.json`);
  }

  async get(key: string): Promise<string | null> {
    try {
      return await fs.readFile(this.file(key), "utf8");
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const target = this.file(key);
    // Write-then-rename so a crash cannot leave a truncated file.
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, value, { mode: 0o600 });
    await fs.rename(tmp, target);
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.file(key), { force: true });
  }
}

/** Upstash REST protocol — also what Vercel KV speaks. No SDK needed. */
/**
 * Postgres, through Supabase's REST API.
 *
 * Deliberately `fetch` against PostgREST rather than @supabase/supabase-js:
 * this is three verbs on one table, the SDK would be a dependency and a client
 * lifecycle for no gain, and the snapshot chunks are large enough that
 * avoiding an extra serialisation layer is worth something.
 *
 * The service-role key is required and never leaves the server. `kv_store` has
 * RLS on with no policies, so an anon key reads nothing — see the migration.
 */
class SupabaseStore implements KeyValueStore {
  readonly name = "supabase";
  readonly durable = true;

  constructor(
    private readonly url: string,
    private readonly serviceKey: string,
  ) {}

  private get endpoint(): string {
    return `${this.url.replace(/\/+$/, "")}/rest/v1/kv_store`;
  }

  private get headers(): Record<string, string> {
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      "Content-Type": "application/json",
    };
  }

  async get(key: string): Promise<string | null> {
    const res = await fetch(
      `${this.endpoint}?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: this.headers, cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Supabase get failed with HTTP ${res.status}.`);

    const rows = (await res.json()) as { value?: string }[];
    return rows[0]?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    // Upsert on the primary key. `resolution=merge-duplicates` is what turns
    // PostgREST's insert into an ON CONFLICT UPDATE, so re-writing a key
    // replaces it rather than raising a duplicate-key error.
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { ...this.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ key, value }]),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase set failed with HTTP ${res.status}.`);
  }

  async delete(key: string): Promise<void> {
    const res = await fetch(`${this.endpoint}?key=eq.${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: { ...this.headers, Prefer: "return=minimal" },
      cache: "no-store",
    });
    // A delete of something already gone is not a failure.
    if (!res.ok && res.status !== 404) {
      throw new Error(`Supabase delete failed with HTTP ${res.status}.`);
    }
  }
}

class RedisStore implements KeyValueStore {
  readonly name = "redis";
  readonly durable = true;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async command(...args: string[]): Promise<unknown> {
    const res = await fetch(`${this.url.replace(/\/+$/, "")}/${args.map(encodeURIComponent).join("/")}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Redis ${args[0]} failed with HTTP ${res.status}.`);
    }
    const body = (await res.json()) as { result?: unknown };
    return body.result;
  }

  async get(key: string): Promise<string | null> {
    const result = await this.command("get", key);
    return typeof result === "string" ? result : null;
  }

  async set(key: string, value: string): Promise<void> {
    // POST so the value never lands in a URL or a proxy access log.
    const res = await fetch(`${this.url.replace(/\/+$/, "")}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: value,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Redis set failed with HTTP ${res.status}.`);
  }

  async delete(key: string): Promise<void> {
    await this.command("del", key);
  }
}

/** In-memory last resort. Survives nothing; used only to keep the app up. */
class MemoryStore implements KeyValueStore {
  readonly name = "memory";
  readonly durable = false;
  private readonly map = new Map<string, string>();

  async get(key: string) {
    return this.map.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.map.set(key, value);
  }
  async delete(key: string) {
    this.map.delete(key);
  }
}

let cached: KeyValueStore | null = null;

function redisCredentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/** True on platforms whose application directory is read-only. */
export function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
}

/**
 * Supabase, when both the URL and a service-role key are present.
 *
 * The anon key is deliberately not accepted: `kv_store` denies it by policy,
 * so a deployment configured with only the anon key would fail on every read
 * rather than quietly falling through to a less durable backend.
 */
function supabaseCredentials(): { url: string; serviceKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) return null;

  /*
   * Refuse the anon key.
   *
   * The two keys are visually near-identical — same length, same prefix, next
   * to each other in the dashboard — and pasting the wrong one is an easy
   * mistake that has already been made once on this project. The failure it
   * causes is disproportionately confusing: `kv_store` has RLS enabled with no
   * policies, so the anon key is refused on every single read and write. The
   * app would select this backend, then 401 on the first request for the store
   * config, and the visible symptom is "the store is not connected".
   *
   * A legacy Supabase key is an unsigned-readable JWT carrying its own role, so
   * the mistake is detectable here, before anything depends on it. Newer
   * publishable/secret keys are opaque strings rather than JWTs; those cannot
   * be inspected, so they are accepted as given and left to fail at the
   * request if wrong.
   */
  const role = jwtRole(serviceKey);
  if (role === "anon") {
    console.error(
      "[store] SUPABASE_SERVICE_ROLE_KEY holds the anon key, not the service-role key. " +
        "kv_store denies the anon key by policy, so Supabase storage is being skipped. " +
        "Copy the service_role key from Project Settings → API.",
    );
    return null;
  }

  return { url, serviceKey };
}

/** The `role` claim of a Supabase JWT, or null if it is not one. */
function jwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const claims = JSON.parse(json) as { role?: unknown };
    return typeof claims.role === "string" ? claims.role : null;
  } catch {
    // Not a JWT — a newer opaque key. Nothing to check.
    return null;
  }
}

export function getStore(): KeyValueStore {
  if (cached) return cached;

  const supabase = supabaseCredentials();
  if (supabase) {
    cached = new SupabaseStore(supabase.url, supabase.serviceKey);
    return cached;
  }

  const redis = redisCredentials();
  if (redis) {
    cached = new RedisStore(redis.url, redis.token);
    return cached;
  }

  if (isServerless()) {
    // No durable store configured and no writable app directory. Keep serving
    // rather than crashing; callers surface the missing-storage condition.
    cached = new MemoryStore();
    return cached;
  }

  cached = new FileStore(path.join(process.cwd(), ".data"));
  return cached;
}

/**
 * Whether this deployment can actually persist a connection. Used to explain
 * the problem up front instead of failing mid-authorization.
 */
export function storageIsDurable(): boolean {
  return getStore().durable;
}

export const STORAGE_HELP =
  "This deployment has no durable storage, so an authorized store could not be saved. Serverless platforms have a read-only filesystem: point it at Supabase with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or at any Upstash-compatible Redis with KV_REST_API_URL and KV_REST_API_TOKEN, then redeploy.";
