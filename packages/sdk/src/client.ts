/**
 * The shared HTTP layer every method group calls through.
 *
 * Speaks the API's own error dialect: `src/proxy.ts` on the server always
 * returns `{ error, hint, docs }` on a rejected request. Surfacing `hint` on
 * `PulseApiError` means a caller sees the same actionable text the API meant
 * a human to see, rather than a bare status code.
 */

export interface PulseCommerceClientOptions {
  /** `pc_live_...`, from Settings → API keys, or from `auth.pollDeviceLogin()`. */
  apiKey?: string;
  /** The deployment's origin, e.g. `https://your-store.pulsecommerce.io`. */
  baseUrl: string;
  /** Overrides the global `fetch`, mainly for tests. */
  fetch?: typeof fetch;
}

export class PulseApiError extends Error {
  constructor(
    public status: number,
    public hint: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "PulseApiError";
  }
}

interface ErrorPayload {
  error?: string;
  hint?: string;
}

interface RequestOptions {
  method?: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  /** Auth is optional only for the two public device-login routes. */
  requireAuth?: boolean;
}

export class BaseClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PulseCommerceClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? fetch;
  }

  private buildUrl(path: string, query?: Record<string, string | undefined>): string {
    const url = new URL(path, this.baseUrl + "/");
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const requireAuth = options.requireAuth ?? true;
    if (requireAuth && !this.apiKey) {
      throw new PulseApiError(401, "Pass an apiKey to the client, or use auth.pollDeviceLogin() first.", "No API key configured.");
    }

    const headers: Record<string, string> = {};
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    const res = await this.fetchImpl(this.buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      let error = `Request failed with status ${res.status}`;
      let hint: string | undefined;
      try {
        const payload = (await res.json()) as ErrorPayload;
        if (typeof payload?.error === "string") error = payload.error;
        if (typeof payload?.hint === "string") hint = payload.hint;
      } catch {
        // Not JSON — the plain status message above stands.
      }
      throw new PulseApiError(res.status, hint, error);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) return (await res.json()) as T;
    return (await res.arrayBuffer()) as unknown as T;
  }

  /** For binary responses — currently only the report exporter. */
  async requestBinary(path: string, options: RequestOptions = {}): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>(path, options);
  }
}
