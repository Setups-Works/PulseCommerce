import { decodeEntities } from "./entities";
import type { WooCustomer, WooOrder, WooProduct } from "./types";

export interface WooCredentials {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  /** WooCommerce REST namespace version. */
  version?: "wc/v3" | "wc/v2";
}

export class WooApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
    readonly body?: string,
  ) {
    super(message);
    this.name = "WooApiError";
  }
}

const DEFAULT_TIMEOUT_MS = 60_000;

function normaliseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

/**
 * Minimal WooCommerce REST client.
 *
 * Auth strategy: HTTP Basic over HTTPS (Woo's documented method). For plain
 * HTTP endpoints — local dev stores, mostly — Woo rejects Basic auth, so we
 * fall back to query-string credentials, which is the documented escape hatch.
 */
export class WooClient {
  private readonly base: string;
  private readonly key: string;
  private readonly secret: string;
  private readonly version: string;
  private readonly useQueryAuth: boolean;

  constructor(creds: WooCredentials) {
    this.base = normaliseUrl(creds.url);
    this.key = creds.consumerKey.trim();
    this.secret = creds.consumerSecret.trim();
    this.version = creds.version ?? "wc/v3";
    this.useQueryAuth = this.base.startsWith("http://");
  }

  private buildUrl(endpoint: string, params: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.base}/wp-json/${this.version}/${endpoint.replace(/^\//, "")}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    if (this.useQueryAuth) {
      url.searchParams.set("consumer_key", this.key);
      url.searchParams.set("consumer_secret", this.secret);
    }
    return url.toString();
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "PulseCommerce-Analytics/1.0",
    };
    if (!this.useQueryAuth) {
      h.Authorization = `Basic ${Buffer.from(`${this.key}:${this.secret}`).toString("base64")}`;
    }
    return h;
  }

  /** Single page request. Returns the parsed body plus Woo's pagination headers. */
  async request<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<{ data: T; totalPages: number; total: number }> {
    const url = this.buildUrl(endpoint, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: this.headers(),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new WooApiError(
          describeStatus(res.status, endpoint),
          res.status,
          endpoint,
          body.slice(0, 500),
        );
      }

      const data = (await res.json()) as T;
      return {
        data,
        totalPages: Number(res.headers.get("x-wp-totalpages") ?? "1") || 1,
        total: Number(res.headers.get("x-wp-total") ?? "0") || 0,
      };
    } catch (err) {
      if (err instanceof WooApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new WooApiError(`Request to ${endpoint} timed out after 30s.`, 408, endpoint);
      }
      throw new WooApiError(
        `Could not reach ${this.base}. Check the store URL is correct and publicly reachable. (${
          err instanceof Error ? err.message : String(err)
        })`,
        0,
        endpoint,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Walks every page of a collection endpoint.
   *
   * Pages after the first are fetched in bounded-concurrency batches — Woo
   * stores fall over under unbounded parallelism, and most hosts rate-limit.
   */
  async fetchAll<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
    opts: { perPage?: number; maxPages?: number; concurrency?: number } = {},
  ): Promise<T[]> {
    const perPage = opts.perPage ?? 100;
    const concurrency = opts.concurrency ?? 4;

    const first = await this.request<T[]>(endpoint, { ...params, per_page: perPage, page: 1 });
    const pageCount = Math.min(first.totalPages, opts.maxPages ?? Infinity);
    if (pageCount <= 1) return first.data;

    const out: T[] = [...first.data];
    const pages = Array.from({ length: pageCount - 1 }, (_, i) => i + 2);

    for (let i = 0; i < pages.length; i += concurrency) {
      const batch = pages.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map((page) =>
          this.request<T[]>(endpoint, { ...params, per_page: perPage, page }).then((r) => r.data),
        ),
      );
      for (const r of results) out.push(...r);
    }

    return out;
  }

  /** Cheap credential check — asks for a single order and reports what came back. */
  async testConnection(): Promise<{ ok: true; storeName: string; currency: string; orderCount: number }> {
    const probe = await this.request<WooOrder[]>("orders", { per_page: 1 });
    let storeName = new URL(this.base).hostname;
    let currency = probe.data[0]?.currency ?? "USD";

    // The WP REST root carries the site title. `settings/general` only has the
    // postal address, which reads as a street name, not a store name.
    try {
      const res = await fetch(`${this.base}/wp-json/`, { headers: this.headers(), cache: "no-store" });
      if (res.ok) {
        const root = (await res.json()) as { name?: string };
        if (root.name) storeName = decodeEntities(root.name);
      }
    } catch {
      // Falls back to the hostname.
    }

    try {
      const settings = await this.request<{ id: string; value: unknown }[]>("settings/general");
      const currencySetting = settings.data.find((s) => s.id === "woocommerce_currency");
      if (currencySetting && typeof currencySetting.value === "string") currency = currencySetting.value;
    } catch {
      // settings/general needs a key with shop-manager scope; not fatal.
    }

    return { ok: true, storeName, currency, orderCount: probe.total };
  }

  getOrders(params: Record<string, string | number | undefined>, maxPages?: number) {
    return this.fetchAll<WooOrder>("orders", { ...params, _fields: ORDER_FIELDS }, {
      maxPages,
      concurrency: 6,
    });
  }

  getCustomers(params: Record<string, string | number | undefined>, maxPages?: number) {
    return this.fetchAll<WooCustomer>("customers", { ...params, _fields: CUSTOMER_FIELDS }, { maxPages });
  }

  getProducts(params: Record<string, string | number | undefined>, maxPages?: number) {
    return this.fetchAll<WooProduct>("products", { ...params, _fields: PRODUCT_FIELDS }, { maxPages });
  }
}

/**
 * `_fields` trims the response to what the analytics engine actually reads.
 * On a real store this cut the orders payload from ~900KB to ~160KB per page,
 * which is the difference between a usable cold load and a timeout.
 */
const ORDER_FIELDS = [
  "id", "number", "status", "currency", "date_created", "date_created_gmt", "date_paid",
  "date_completed", "discount_total", "shipping_total", "total_tax", "total", "customer_id",
  "billing", "payment_method", "payment_method_title", "line_items", "coupon_lines", "refunds",
  // Carries WooCommerce Order Attribution; trimmed to the attribution keys at ingest.
  "meta_data",
].join(",");

const CUSTOMER_FIELDS = [
  "id", "date_created", "email", "first_name", "last_name", "username", "billing", "shipping",
  "is_paying_customer", "role",
].join(",");

const PRODUCT_FIELDS = [
  "id", "name", "slug", "permalink", "date_created", "type", "status", "sku", "price",
  "regular_price", "sale_price", "total_sales", "stock_quantity", "stock_status", "categories",
  "tags", "average_rating", "rating_count",
].join(",");

function describeStatus(status: number, endpoint: string): string {
  switch (status) {
    case 401:
      return "WooCommerce rejected the credentials (401). Check the consumer key and secret, and that the key has Read access.";
    case 403:
      return "WooCommerce refused the request (403). The API key likely lacks permission, or a security plugin/WAF is blocking REST traffic.";
    case 404:
      return `Endpoint /${endpoint} was not found (404). Confirm WooCommerce is active and the REST API is enabled (permalinks must not be set to "Plain").`;
    case 429:
      return "Rate limited by the store (429). Reduce the date range or retry shortly.";
    default:
      return `WooCommerce returned HTTP ${status} for /${endpoint}.`;
  }
}
