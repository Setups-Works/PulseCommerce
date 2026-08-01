import type { WhatsAppConfig } from "./config";

/**
 * Client for a self-hosted OpenWA gateway.
 *
 * Only the endpoints this app actually uses are modelled, and each shape below
 * was checked against a live 0.12.2 instance rather than inferred from the
 * schema — the two disagree in places. Most usefully: a session's connection
 * state lives on GET /api/sessions/{id}, not on /status, which is the WhatsApp
 * Stories API and returns {"statuses":[]} whatever the session is doing.
 */

export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = "WhatsAppApiError";
  }
}

/** Session state as reported by GET /api/sessions/{id}. */
export interface WhatsAppSession {
  id: string;
  name: string;
  /** "created" | "initializing" | "qr_ready" | "ready" | "disconnected" | ... */
  status: string;
  phone: string | null;
  pushName: string | null;
  connectedAt: string | null;
  lastActive: string | null;
  lastError: string | null;
  engineLoaded: boolean;
}

export interface NumberCheck {
  number: string;
  exists: boolean;
  whatsappId: string | null;
}

export interface SentMessage {
  messageId: string;
  timestamp: number;
}

export type BulkMessageType = "text" | "image" | "video" | "audio" | "document";

export interface BulkMessageItem {
  chatId: string;
  type: BulkMessageType;
  content: Record<string, unknown>;
}

export interface BulkOptions {
  /** OpenWA enforces a 1000ms floor. */
  delayBetweenMessages?: number;
  /** Adds 0-2s of jitter so sends do not land on a metronome. */
  randomizeDelay?: boolean;
  stopOnError?: boolean;
}

export interface BulkAccepted {
  batchId: string;
  [key: string]: unknown;
}

/**
 * A linked session reports this status — but the status alone does not mean
 * anything can be sent. See isSessionSendable.
 */
export const READY_STATUS = "ready";

/**
 * Whether the gateway can actually deliver a message right now.
 *
 * `status` is a persisted database value and `engineLoaded` is the live one,
 * and they disagree after the gateway process restarts: the row still says
 * "ready" while the in-memory engine is gone. A send in that state fails with
 * "Session is not active. Start the session first." for every recipient, so
 * both signals have to agree before anything is dispatched.
 */
export function isSessionSendable(session: {
  status: string;
  engineLoaded?: boolean;
}): boolean {
  return session.status === READY_STATUS && session.engineLoaded !== false;
}

export class WhatsAppClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  readonly sessionId: string;

  constructor(config: Pick<WhatsAppConfig, "baseUrl" | "apiKey" | "sessionId">) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.sessionId = config.sessionId;
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown; timeoutMs?: number } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 30_000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: init.method ?? "GET",
        headers: {
          "X-API-Key": this.apiKey,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      throw new WhatsAppApiError(
        aborted
          ? "The WhatsApp gateway did not respond in time."
          : `Could not reach the WhatsApp gateway at ${this.baseUrl}.`,
        0,
        path,
      );
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      // A non-JSON body means something other than the gateway answered —
      // a proxy error page, most likely. Keep the text for the message.
    }

    if (!response.ok) {
      throw new WhatsAppApiError(describeError(payload, text, response.status), response.status, path);
    }

    return payload as T;
  }

  /** Connection state. Also the cheapest way to verify a base URL and key. */
  getSession(): Promise<WhatsAppSession> {
    return this.request<WhatsAppSession>(`/api/sessions/${this.sessionId}`);
  }

  listSessions(): Promise<WhatsAppSession[]> {
    return this.request<WhatsAppSession[]>("/api/sessions");
  }

  /** Boots the engine. Rejects with 400 if the session is already running. */
  startSession(): Promise<WhatsAppSession> {
    return this.request<WhatsAppSession>(`/api/sessions/${this.sessionId}/start`, {
      method: "POST",
      timeoutMs: 60_000,
    });
  }

  /**
   * Gets the session running, whether or not it already was.
   *
   * "Session is already started" comes back as a 400, which reads as a failure
   * but describes exactly the state the caller wanted. Treating it as an error
   * meant refreshing a QR panel reported a problem instead of showing the QR
   * that was sitting there ready.
   */
  async ensureStarted(): Promise<WhatsAppSession> {
    try {
      return await this.startSession();
    } catch (error) {
      if (error instanceof WhatsAppApiError && error.status === 400) {
        return this.getSession();
      }
      throw error;
    }
  }

  /**
   * The pairing QR as a data URL, while one is being offered.
   *
   * The gateway answers 400 once a session is already authenticated, which is
   * a normal outcome here rather than a failure, so it is reported as "no QR"
   * instead of thrown.
   */
  async getQr(): Promise<{ qrCode: string | null; status: string | null }> {
    try {
      const body = await this.request<{ qrCode?: string; status?: string }>(
        `/api/sessions/${this.sessionId}/qr`,
      );
      return { qrCode: body?.qrCode ?? null, status: body?.status ?? null };
    } catch (error) {
      if (error instanceof WhatsAppApiError && error.status === 400) {
        return { qrCode: null, status: null };
      }
      throw error;
    }
  }

  /**
   * Whether a number is registered on WhatsApp, and its canonical chat id.
   * Worth doing before a broadcast: sending to numbers that were never on
   * WhatsApp is both wasted and a pattern that attracts restrictions.
   */
  checkNumber(number: string): Promise<NumberCheck> {
    return this.request<NumberCheck>(
      `/api/sessions/${this.sessionId}/contacts/check/${encodeURIComponent(number)}`,
    );
  }

  sendText(chatId: string, text: string): Promise<SentMessage> {
    return this.request<SentMessage>(`/api/sessions/${this.sessionId}/messages/send-text`, {
      method: "POST",
      body: { chatId, text },
      timeoutMs: 45_000,
    });
  }

  sendImage(chatId: string, url: string, caption?: string): Promise<SentMessage> {
    return this.request<SentMessage>(`/api/sessions/${this.sessionId}/messages/send-image`, {
      method: "POST",
      body: { chatId, url, caption },
      timeoutMs: 60_000,
    });
  }

  sendVideo(chatId: string, url: string, caption?: string): Promise<SentMessage> {
    return this.request<SentMessage>(`/api/sessions/${this.sessionId}/messages/send-video`, {
      method: "POST",
      body: { chatId, url, caption },
      timeoutMs: 90_000,
    });
  }

  /**
   * Hands a batch to OpenWA, which then works through it on its own schedule
   * using the pacing below. It returns as soon as the batch is accepted, so the
   * caller polls getBatch rather than waiting.
   */
  sendBulk(
    messages: BulkMessageItem[],
    options: BulkOptions,
    batchId?: string,
  ): Promise<BulkAccepted> {
    return this.request<BulkAccepted>(`/api/sessions/${this.sessionId}/messages/send-bulk`, {
      method: "POST",
      body: { messages, options, ...(batchId ? { batchId } : {}) },
      timeoutMs: 60_000,
    });
  }

  getBatch(batchId: string): Promise<Record<string, unknown>> {
    return this.request(
      `/api/sessions/${this.sessionId}/messages/batch/${encodeURIComponent(batchId)}`,
    );
  }

  cancelBatch(batchId: string): Promise<unknown> {
    return this.request(
      `/api/sessions/${this.sessionId}/messages/batch/${encodeURIComponent(batchId)}/cancel`,
      { method: "POST" },
    );
  }
}

function describeError(payload: unknown, raw: string, status: number): string {
  if (payload && typeof payload === "object") {
    const body = payload as { message?: unknown; error?: unknown };
    const message = Array.isArray(body.message) ? body.message.join(" ") : body.message;
    if (typeof message === "string" && message) {
      // These two are worth translating: they are the failures an operator
      // actually hits, and the raw text does not say what to do about them.
      if (status === 401) {
        return `${message}. Check the API key in Settings — a key is only valid for the gateway that issued it.`;
      }
      return message;
    }
    if (typeof body.error === "string" && body.error) return body.error;
  }
  if (status === 404) {
    return "Not found on the gateway. The session may have been deleted, or the URL points at something other than OpenWA.";
  }
  return raw.slice(0, 200) || `The gateway returned HTTP ${status}.`;
}
