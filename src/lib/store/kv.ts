import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Durable key-value storage for the issued WooCommerce key.
 *
 * Self-hosted deployments write a file next to the app, which is the simplest
 * thing that works. Serverless platforms have a read-only filesystem, so they
 * need a real store — any Upstash-compatible Redis (which includes Vercel KV)
 * is picked up automatically from the environment.
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

export function getStore(): KeyValueStore {
  if (cached) return cached;

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
  "This deployment has no durable storage, so an authorized store could not be saved. Serverless platforms have a read-only filesystem: add a Redis store and set KV_REST_API_URL and KV_REST_API_TOKEN (Vercel KV and Upstash both provide these), then redeploy.";
