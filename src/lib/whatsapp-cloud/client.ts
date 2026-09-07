/**
 * Meta WhatsApp Cloud API — a minimal pilot client, PUL-16.
 *
 * Deliberately parallel to src/lib/whatsapp/client.ts (the self-hosted
 * gateway client), not a replacement for it yet — that migration is PUL-18,
 * gated on the billing decision (PUL-15) and the template workflow (PUL-17).
 * This exists to get one real, working send and one real template-list call
 * through the actual app, using Meta's free test business number, so App
 * Review has something genuine to screen-record rather than nothing.
 *
 * Auth here is a single temporary token from the App Dashboard's own API
 * Setup page (~24h validity) via env vars — not a per-merchant Embedded
 * Signup token. That's PUL-19; this pilot never touches per-tenant storage.
 */

const GRAPH_API_VERSION = "v21.0";

export class WhatsAppCloudApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = "WhatsAppCloudApiError";
  }
}

interface CloudCredentials {
  accessToken: string;
  phoneNumberId: string;
}

function credentialsFromEnv(): CloudCredentials | null {
  const accessToken = process.env.WHATSAPP_CLOUD_TEST_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_CLOUD_TEST_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;
  return { accessToken, phoneNumberId };
}

async function graphRequest<T>(
  path: string,
  accessToken: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`;
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    let message = `Graph API request to ${path} failed (${res.status}).`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // Body wasn't JSON — keep the generic message above.
    }
    throw new WhatsAppCloudApiError(message, res.status, path);
  }

  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export interface CloudSentMessage {
  messagingProduct: string;
  waId: string;
  messageId: string;
}

/**
 * Sends a free-form text message via the Cloud API.
 *
 * Only valid within a 24h customer-service window (i.e. the recipient
 * messaged this business number first) or, for this pilot, to one of the
 * up to 5 numbers Meta lets you pre-verify as test recipients regardless of
 * that window. A real merchant-facing send outside that window needs an
 * approved template — see PUL-17, not built yet.
 */
export async function sendCloudTextMessage(to: string, body: string): Promise<CloudSentMessage> {
  const creds = credentialsFromEnv();
  if (!creds) {
    throw new WhatsAppCloudApiError(
      "WHATSAPP_CLOUD_TEST_TOKEN and WHATSAPP_CLOUD_TEST_PHONE_NUMBER_ID must both be set.",
      0,
      "messages",
    );
  }

  const response = await graphRequest<{
    messaging_product: string;
    contacts: { wa_id: string }[];
    messages: { id: string }[];
  }>(`${creds.phoneNumberId}/messages`, creds.accessToken, {
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    },
  });

  return {
    messagingProduct: response.messaging_product,
    waId: response.contacts[0]?.wa_id ?? to,
    messageId: response.messages[0]?.id ?? "",
  };
}

export interface CloudMessageTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
}

/**
 * Lists message templates on the connected WhatsApp Business Account —
 * exercises whatsapp_business_management, separately from
 * whatsapp_business_messaging above, since App Review reviews each
 * permission's usage independently.
 */
export async function listCloudMessageTemplates(): Promise<CloudMessageTemplate[]> {
  const creds = credentialsFromEnv();
  if (!creds) {
    throw new WhatsAppCloudApiError(
      "WHATSAPP_CLOUD_TEST_TOKEN and WHATSAPP_CLOUD_TEST_PHONE_NUMBER_ID must both be set.",
      0,
      "message_templates",
    );
  }

  // The template list lives on the WABA, not the phone number -- Meta's test
  // setup exposes the phone number id directly, but message_templates is a
  // WABA-level edge. The phone number lookup response includes its parent
  // WABA id, so resolve that first rather than requiring a second env var.
  const phoneInfo = await graphRequest<{ id: string; whatsapp_business_account?: { id: string } }>(
    `${creds.phoneNumberId}?fields=whatsapp_business_account`,
    creds.accessToken,
  );
  const wabaId = phoneInfo.whatsapp_business_account?.id;
  if (!wabaId) {
    throw new WhatsAppCloudApiError(
      "Could not resolve the WhatsApp Business Account id for this phone number.",
      0,
      "message_templates",
    );
  }

  const templates = await graphRequest<{
    data: { id: string; name: string; status: string; category: string; language: string }[];
  }>(`${wabaId}/message_templates`, creds.accessToken);

  return templates.data.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    category: t.category,
    language: t.language,
  }));
}
