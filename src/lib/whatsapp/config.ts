import { getStore } from "@/lib/store/kv";

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

const CONFIG_KEY = "whatsapp-config";

export const DEFAULT_SEND_DELAY_MS = 4000;
/** OpenWA's own floor. Anything lower is rejected upstream. */
export const MIN_SEND_DELAY_MS = 1000;
/** Recipients per submitted batch — OpenWA rejects more than this. */
export const MAX_BATCH_SIZE = 100;

export async function readWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  try {
    const raw = await getStore().get(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WhatsAppConfig;
    if (!parsed.baseUrl || !parsed.apiKey || !parsed.sessionId) return null;
    return {
      ...parsed,
      defaultDialCode: (parsed.defaultDialCode ?? "").replace(/\D/g, ""),
      delayBetweenMessagesMs: Math.max(
        MIN_SEND_DELAY_MS,
        parsed.delayBetweenMessagesMs || DEFAULT_SEND_DELAY_MS,
      ),
    };
  } catch {
    return null;
  }
}

export async function writeWhatsAppConfig(config: WhatsAppConfig): Promise<void> {
  await getStore().set(
    CONFIG_KEY,
    JSON.stringify({ ...config, updatedAt: new Date().toISOString() }),
  );
}

export async function clearWhatsAppConfig(): Promise<void> {
  await getStore().delete(CONFIG_KEY);
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
