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
  wabaId: string | null;
}

function credentialsFromEnv(): CloudCredentials | null {
  const accessToken = process.env.WHATSAPP_CLOUD_TEST_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_CLOUD_TEST_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;
  const wabaId = process.env.WHATSAPP_CLOUD_TEST_WABA_ID?.trim() || null;
  return { accessToken, phoneNumberId, wabaId };
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
 * Only actually delivered within an open 24h customer-service window (the
 * recipient messaged this business number first) — confirmed the hard way:
 * a pre-verified test recipient is exempt from needing App-Review-approved
 * production access, but NOT from this window rule, which is universal. The
 * Graph API still accepts the call and returns a real message id outside
 * the window, so a 200 response here does not mean the message actually
 * reached the recipient's phone. Real merchant sends (order confirmations,
 * campaigns) are always business-initiated with no guaranteed open window,
 * so they need sendCloudTemplateMessage below, not this — see PUL-17 for
 * the full template-submission workflow, not built yet.
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

/**
 * Sends an approved template message — the only kind that reliably
 * delivers business-initiated, with no open-window requirement. Defaults
 * to "hello_world", the fixed template every WABA has pre-approved from
 * creation, specifically so a pilot/test send doesn't need PUL-17's
 * template-submission workflow to exist first.
 */
export async function sendCloudTemplateMessage(
  to: string,
  templateName = "hello_world",
  languageCode = "en_US",
): Promise<CloudSentMessage> {
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
      type: "template",
      template: { name: templateName, language: { code: languageCode } },
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

  // The template list lives on the WABA, not the phone number. Confirmed the
  // hard way: the phone number node has no whatsapp_business_account field
  // ("(#100) Tried accessing nonexisting field") -- there is no documented
  // way to derive the WABA id from a phone number id via this node, so it's
  // a third env var, read directly off the App Dashboard's WhatsApp Business
  // account ID shown next to the test number.
  if (!creds.wabaId) {
    throw new WhatsAppCloudApiError(
      "WHATSAPP_CLOUD_TEST_WABA_ID must be set (the WhatsApp Business account ID shown in the App Dashboard).",
      0,
      "message_templates",
    );
  }

  const templates = await graphRequest<{
    data: { id: string; name: string; status: string; category: string; language: string }[];
  }>(`${creds.wabaId}/message_templates`, creds.accessToken);

  return templates.data.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    category: t.category,
    language: t.language,
  }));
}
