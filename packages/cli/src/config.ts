import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Local credentials, resolved with flags > env vars > the config file > (for
 * baseUrl only) a built-in default.
 *
 * Mirrors the precedence a well-behaved CLI is expected to have, and matters
 * here specifically because a key in a shell history or a CI secret should
 * always be able to override whatever is sitting on disk for interactive use.
 */

export interface Config {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * This CLI ships for one product, not as a generic client for an arbitrary
 * self-hosted instance — so unlike the SDK (which takes `baseUrl` as a
 * required constructor argument, on purpose, for exactly that generality),
 * it's fine for the CLI to know where its own deployment lives. Still fully
 * overridable via `--base-url`, `PULSE_BASE_URL`, or `config set` for anyone
 * running their own deployment instead.
 */
const DEFAULT_BASE_URL = "https://pulsecommerce-sw.vercel.app";

function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  return join(xdg && xdg.trim() ? xdg : join(homedir(), ".config"), "pulsecommerce");
}

function configPath(): string {
  return join(configDir(), "config.json");
}

export function readConfig(): Config {
  try {
    return JSON.parse(readFileSync(configPath(), "utf8"));
  } catch {
    return {};
  }
}

/** Merges rather than overwrites, so `config set --api-key` alone doesn't drop a saved baseUrl. */
export function writeConfig(patch: Config): Config {
  const next = { ...readConfig(), ...patch };
  mkdirSync(configDir(), { recursive: true, mode: 0o700 });
  writeFileSync(configPath(), JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
  return next;
}

export interface ResolvedCredentials {
  apiKey: string;
  baseUrl: string;
}

/** Same precedence as `resolveCredentials`, for the one command that runs before an API key exists: `pulse login`. */
export function resolveBaseUrl(opts: { baseUrl?: string }): string {
  const file = readConfig();
  const baseUrl = opts.baseUrl ?? process.env.PULSE_BASE_URL ?? file.baseUrl ?? DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

/** Same abbreviation the dashboard itself uses for a key — see ApiKeyRecord.display. */
export function maskKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export function resolveCredentials(opts: { apiKey?: string; baseUrl?: string }): ResolvedCredentials {
  const file = readConfig();
  const apiKey = opts.apiKey ?? process.env.PULSE_API_KEY ?? file.apiKey;
  const baseUrl = opts.baseUrl ?? process.env.PULSE_BASE_URL ?? file.baseUrl ?? DEFAULT_BASE_URL;

  if (!apiKey) {
    console.error("No API key configured.");
    console.error("Run `pulse login` to sign in through your browser, or `pulse config set --api-key pc_live_...`.");
    process.exit(1);
  }

  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, "") };
}

export { configPath };
