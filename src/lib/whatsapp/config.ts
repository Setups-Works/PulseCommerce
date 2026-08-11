import { db } from "@/lib/db/client";

/**
 * Connection to a self-hosted OpenWA gateway.
 *
 * Stored the same way as the WooCommerce credentials: in durable storage, never
 * in an environment variable and never in a browser bundle. The API key is an
 * operator-role credential that can send messages to real customers, so it is
 * treated as a secret throughout and only ever leaves here redacted.
 */
export interface WhatsAppConfig {
  /** Base URL of the gateway, e.g. https://wa.example.com — no trailing slash. */
  baseUrl: string;
  apiKey: string;
  /** Session UUID from POST /api/sessions. */
  sessionId: string;
  /** Friendly session name, captured when the connection was verified. */
  sessionName?: string;
  /** Number the session is linked to, captured at verification. */
  phone?: string;
  /** Assumed when a customer's number carries no country code, e.g. "91". */
  defaultDialCode: string;
  /**
   * Pause between individual sends, handed to OpenWA per batch. Its own floor
   * is 1000ms; the default here is deliberately slower than that, because the
   * cost of going too fast is a restricted WhatsApp number.
   */
  delayBetweenMessagesMs: number;
  updatedAt?: string;
}

/*
 * One row, in `whatsapp_config`. The table has a boolean primary key with a
 * `check (id)` constraint, so a second row is impossible at the database level
 * rather than by every write path remembering to say "where id = 1".
 *
 * `session_id` doubles as the slot for a session adopted from the gateway when
 * the environment names none, which is why an env-configured gateway still
 * reads and writes here.
 */

export const DEFAULT_SEND_DELAY_MS = 4000;
/** OpenWA's own floor. Anything lower is rejected upstream. */
export const MIN_SEND_DELAY_MS = 1000;
/** Recipients per submitted batch — OpenWA rejects more than this. */
export const MAX_BATCH_SIZE = 100;

/**
 * Environment-provided gateway, which takes precedence over anything saved
 * through the UI.
 *
 * Unlike the WooCommerce credentials — where the whole point of the app
 * authorization flow is that a merchant never handles a secret — the gateway
 * key has no such flow: it is issued in your own OpenWA dashboard and pasted
 * somewhere either way. Putting it in the environment makes the connection
 * survive a redeploy, a cleared store, and a mis-click on Disconnect.
 */
function environmentConfig(): Omit<WhatsAppConfig, "sessionId"> | null {
  const baseUrl = process.env.WHATSAPP_API_URL?.trim();
  const apiKey = process.env.WHATSAPP_API_KEY?.trim();
  if (!baseUrl || !apiKey) return null;

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    defaultDialCode: (process.env.WHATSAPP_DIAL_CODE ?? "").replace(/\D/g, ""),
    delayBetweenMessagesMs: Math.max(
      MIN_SEND_DELAY_MS,
      Number(process.env.WHATSAPP_SEND_DELAY_MS) || DEFAULT_SEND_DELAY_MS,
    ),
  };
}

/** True when the gateway comes from the environment rather than the UI. */
export function configuredByEnvironment(): boolean {
  return environmentConfig() !== null;
}

export async function readWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  const fromEnv = environmentConfig();

  if (fromEnv) {
    // The session id is the one part that may not be known up front, so it can
    // be omitted and adopted from the gateway once, then remembered.
    const sessionId =
      process.env.WHATSAPP_SESSION_ID?.trim() ||
      (await readAdoptedSession()) ||
      "";
    return { ...fromEnv, sessionId };
  }

  try {
    const [row] = await db()<ConfigRow[]>`
      select base_url, api_key, session_id, dial_code, send_delay_ms, updated_at
      from whatsapp_config where id
    `;
    if (!row?.base_url || !row.api_key || !row.session_id) return null;
    return {
      baseUrl: row.base_url,
      apiKey: row.api_key,
      sessionId: row.session_id,
      defaultDialCode: (row.dial_code ?? "").replace(/\D/g, ""),
      delayBetweenMessagesMs: Math.max(
        MIN_SEND_DELAY_MS,
        row.send_delay_ms || DEFAULT_SEND_DELAY_MS,
      ),
      updatedAt: row.updated_at?.toISOString(),
    };
  } catch {
    return null;
  }
}

interface ConfigRow {
  base_url: string | null;
  api_key: string | null;
  session_id: string | null;
  dial_code: string | null;
  send_delay_ms: number | null;
  updated_at: Date | null;
}

/** The session adopted from the gateway, when the environment named none. */
async function readAdoptedSession(): Promise<string | null> {
  try {
    const [row] = await db()<{ session_id: string | null }[]>`
      select session_id from whatsapp_config where id
    `;
    return row?.session_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Remembers a session adopted from the gateway when the env named none.
 *
 * Touches only `session_id`: an env-configured gateway supplies the URL and
 * key from the environment, and writing nulls over them here would break the
 * next read.
 */
export async function rememberAdoptedSession(sessionId: string): Promise<void> {
  await db()`
    insert into whatsapp_config (id, session_id) values (true, ${sessionId})
    on conflict (id) do update set session_id = excluded.session_id
  `;
}

export async function writeWhatsAppConfig(config: WhatsAppConfig): Promise<void> {
  await db()`
    insert into whatsapp_config (id, base_url, api_key, session_id, dial_code, send_delay_ms)
    values (
      true, ${config.baseUrl}, ${config.apiKey}, ${config.sessionId},
      ${config.defaultDialCode}, ${config.delayBetweenMessagesMs}
    )
    on conflict (id) do update set
      base_url      = excluded.base_url,
      api_key       = excluded.api_key,
      session_id    = excluded.session_id,
      dial_code     = excluded.dial_code,
      send_delay_ms = excluded.send_delay_ms
  `;
}

export async function clearWhatsAppConfig(): Promise<void> {
  await db()`delete from whatsapp_config`;
}

/** Normalises a user-entered gateway URL, or throws with a usable message. */
export function normaliseBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("A gateway URL is required.");

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`"${raw}" is not a valid URL.`);
  }

  // The API key travels in a header on every request. Over plain HTTP it is
  // readable by anything on the path, so this is refused rather than warned
  // about — except on localhost, where there is no network to listen on.
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !isLocal) {
    throw new Error(
      "The gateway must be reachable over HTTPS. The API key is sent as a header on every request, so plain HTTP would expose it in transit.",
    );
  }

  return url.origin;
}

/** Never send the key to the browser — the settings page shows this instead. */
export function redactWhatsAppConfig(config: WhatsAppConfig | null) {
  if (!config) return null;
  return {
    baseUrl: config.baseUrl,
    sessionId: config.sessionId,
    sessionName: config.sessionName ?? null,
    phone: config.phone ?? null,
    apiKey: maskKey(config.apiKey),
    defaultDialCode: config.defaultDialCode,
    delayBetweenMessagesMs: config.delayBetweenMessagesMs,
    updatedAt: config.updatedAt ?? null,
  };
}

function maskKey(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}${"•".repeat(12)}${value.slice(-4)}`;
}
