import { db } from "@/lib/db/client";
import type { TenantStore } from "@/lib/auth/tenant";
import type { StoreSnapshot, WooCustomer, WooOrder, WooProduct } from "./types";

/**
 * Reads a snapshot back out of the mirror.
 *
 * The analytics engine takes a `StoreSnapshot` of full WooCommerce objects,
 * and it stays that way deliberately: it is six hundred lines of tested
 * derivation — RFM quintiles, cohorts, predicted lifetime value, basket
 * affinity — and rewriting all of it as SQL to save a deserialisation would be
 * a large change with a lot of room to be subtly wrong about someone's
 * revenue.
 *
 * So the `raw` column exists, and this reassembles from it. What changed is
 * where the data comes from: three tiers of cache in front of a multi-minute
 * WooCommerce pull, replaced by three indexed queries against local tables.
 *
 * A full reassembly is still not cheap on a real store -- 188MB of raw JSON
 * on a 22,000-order store, confirmed by testing against one, which rules out
 * caching the *whole snapshot* as a single blob anywhere with a practical
 * size limit (Redis, an HTTP response, ...). Consumers that only need part of
 * the mirror should call a narrower reader below (`readProducts`,
 * `readPhoneByCustomerKey`) instead of this function, and consumers that need
 * derived results (analytics) should go through a cache keyed on the store's
 * version -- see `getAnalyticsForVersion` in `@/lib/analytics/cache` -- rather
 * than force a full readSnapshot() just to check whether the answer is
 * already cached.
 *
 * ─── The remaining in-process cache ────────────────────────────────────────
 *
 * One memo per instance, so a single dashboard session's several requests —
 * page navigation, an assistant's multi-round tool calls, a report export
 * moments after the page that prompted it — read the mirror once rather than
 * once each. It is not a correctness mechanism: the mirror is the source of
 * truth, and `forgetSnapshot` below is what actually keeps it fresh, called
 * right after every sync.
 *
 * The TTL used to be a hardcoded 15 seconds, on the theory that a local
 * Postgres read is cheap enough not to matter. It is not free:
 * `pg_stat_statements` showed this store's ~21,700-order table (raw column:
 * ~90MB) being read close to whole on nearly every cache miss, and on Vercel
 * a fresh serverless instance is the common case, not the exception — so a
 * 15-second window bought almost nothing while still generating tens of
 * gigabytes of Supabase egress. Sync already bounds real staleness to one
 * cycle (10 minutes, see supabase/migrations/20260812070000_faster_backfill_
 * cron.sql) and calls `forgetSnapshot` the moment new data lands, so a memo
 * living that long costs nothing in freshness and saves the re-reads that
 * happen for reasons other than new data existing.
 *
 * SNAPSHOT_CACHE_MINUTES makes this tunable rather than another hardcoded
 * number — an operator who wants to trade more staleness for less egress
 * (or vice versa) sets it without a code change.
 */

const MEMO_TTL_MS = Math.max(1, Number(process.env.SNAPSHOT_CACHE_MINUTES) || 10) * 60_000;
const memo = new Map<string, { snapshot: StoreSnapshot; expiresAt: number }>();

export class NoMirrorDataError extends Error {
  readonly code = "not_synced";
  constructor() {
    super("This store has not been synced yet.");
    this.name = "NoMirrorDataError";
  }
}

/**
 * Narrower than the full TenantStore: everything below only ever reads these
 * five fields, and the cron sync route (which warms the Redis cache right
 * after a sync, before requireStore has assembled a full TenantStore) can
 * only supply this much. Pick<> rather than a separate interface, so
 * TenantStore stays the one place the full shape is defined.
 */
type SnapshotSource = Pick<TenantStore, "id" | "url" | "name" | "historyMonths" | "lastSyncAt">;

export async function readSnapshot(store: SnapshotSource): Promise<StoreSnapshot> {
  const hit = memo.get(store.id);
  if (hit && hit.expiresAt > Date.now()) return hit.snapshot;

  const since = new Date();
  since.setMonth(since.getMonth() - (store.historyMonths || 24));

  /*
   * Three queries in parallel rather than one join. A join would multiply
   * every order row by its customer and product rows and then need
   * de-duplicating in memory — more bytes over the wire and more work at both
   * ends than fetching three independent sets.
   */
  const [orders, customers, products] = await Promise.all([
    db()<{ raw: WooOrder }[]>`
      select raw from woo_orders
      where store_id = ${store.id} and date_created >= ${since}
      order by date_created desc
    `,
    db()<{ raw: WooCustomer }[]>`
      select raw from woo_customers where store_id = ${store.id}
    `,
    db()<{ raw: WooProduct }[]>`
      select raw from woo_products where store_id = ${store.id}
    `,
  ]);

  if (orders.length === 0 && customers.length === 0) throw new NoMirrorDataError();

  const snapshot: StoreSnapshot = {
    storeUrl: store.url,
    storeName: store.name ?? store.url,
    currency: (orders[0]?.raw?.currency as string) ?? "USD",
    /*
     * The last sync, not now.
     *
     * This timestamp is what every cache downstream keys on, and what the UI
     * shows as "updated". Reporting the read time would make a stale mirror
     * look fresh and would change the cache key on every request, defeating
     * the cache entirely.
     */
    fetchedAt: store.lastSyncAt ?? new Date().toISOString(),
    orders: orders.map((r) => r.raw),
    customers: customers.map((r) => r.raw),
    products: products.map((r) => r.raw),
    warnings: [],
  };

  memo.set(store.id, { snapshot, expiresAt: Date.now() + MEMO_TTL_MS });
  return snapshot;
}

/**
 * Drops the in-process memo for a store. Called after a sync, a store
 * disconnect, or a manual re-sync trigger, so the next read on this instance
 * is fresh rather than serving the pre-sync snapshot for up to
 * SNAPSHOT_CACHE_MINUTES.
 */
export function forgetSnapshot(storeId: string): void {
  memo.delete(storeId);
}

/**
 * Just the catalogue — for the product picker and template-variable lookups,
 * neither of which touches an order or a customer. Splitting this out of
 * readSnapshot() means a request that only needs fifty-odd products doesn't
 * pay for reassembling the store's entire order history alongside them.
 */
export async function readProducts(storeId: string): Promise<WooProduct[]> {
  const rows = await db()<{ raw: WooProduct }[]>`
    select raw from woo_products where store_id = ${storeId}
  `;
  return rows.map((r) => r.raw);
}

/**
 * The currency of the store's most recent order — same value readSnapshot()
 * derives as `orders[0]?.raw?.currency`, since readSnapshot's orders are
 * sorted `date_created desc`. WooCommerce has no store-level currency field
 * to read this from directly, so, same as there, it's read off an order; one
 * indexed row rather than the whole order history.
 */
export async function readMostRecentCurrency(storeId: string): Promise<string> {
  const [row] = await db()<{ currency: string | null }[]>`
    select currency from woo_orders
    where store_id = ${storeId}
    order by date_created desc
    limit 1
  `;
  return row?.currency ?? "USD";
}

/**
 * Each customer's most recent billing phone, keyed the same way
 * `customerKey()` (src/lib/analytics/helpers.ts) keys a customer: a real
 * `customer_id` wins, falling back to the billing email, falling back to the
 * order id for a guest order with neither. Reimplemented in SQL rather than
 * calling customerKey() itself because the point is to never pull the full
 * order objects into the app at all -- this selects three narrow columns
 * instead of the `raw` jsonb blob that carries every line item, and orders
 * by date so, same as phoneMapFromSnapshot(), the most recent order *that
 * carried a phone* wins for a customer who has ordered more than once --
 * filtering out phone-less orders before picking "most recent" rather than
 * after, so a later order with no phone on file doesn't blank out an earlier
 * one that had it.
 */
export async function readPhoneByCustomerKey(storeId: string): Promise<Map<string, string>> {
  const rows = await db()<{ key: string; phone: string }[]>`
    select distinct on (key) key, phone from (
      select
        case
          when customer_id > 0 then 'id:' || customer_id
          when nullif(trim(billing_email), '') is not null then 'email:' || lower(trim(billing_email))
          else 'order:' || id
        end as key,
        trim(raw -> 'billing' ->> 'phone') as phone,
        date_created
      from woo_orders
      where store_id = ${storeId}
        and nullif(trim(raw -> 'billing' ->> 'phone'), '') is not null
    ) t
    order by key, date_created desc
  `;

  return new Map(rows.map((r) => [r.key, r.phone]));
}

/* ── Queries that do not need the whole snapshot ──────────────────────────
 *
 * The point of mirroring was not only to make the snapshot fast. These answer
 * questions directly in SQL that previously meant loading every order into
 * memory and filtering in JavaScript — which is what a paginated order table
 * had to do to show twenty rows.
 */

export interface OrderPage {
  rows: {
    id: number;
    number: string;
    status: string;
    total: number;
    customerId: number;
    email: string | null;
    createdAt: string;
    itemCount: number;
  }[];
  total: number;
}

export async function pageOrders(
  storeId: string,
  opts: { limit?: number; offset?: number; status?: string; search?: string } = {},
): Promise<OrderPage> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  const rows = await db()<
    {
      id: number;
      number: string;
      status: string;
      total: number;
      customer_id: number;
      billing_email: string | null;
      date_created: Date;
      item_count: number;
      total_count: number;
    }[]
  >`
    select id, number, status, total, customer_id, billing_email,
           date_created, item_count,
           -- Window function rather than a second count query: one round trip,
           -- and the count is guaranteed consistent with the page beside it.
           count(*) over () ::int as total_count
    from woo_orders
    where store_id = ${storeId}
      ${opts.status ? db()`and status = ${opts.status}` : db()``}
      ${
        opts.search
          ? db()`and (number ilike ${`%${opts.search}%`} or billing_email ilike ${`%${opts.search}%`})`
          : db()``
      }
    order by date_created desc
    limit ${limit} offset ${offset}
  `;

  return {
    total: rows[0]?.total_count ?? 0,
    rows: rows.map((r) => ({
      id: r.id,
      number: r.number,
      status: r.status,
      total: r.total,
      customerId: r.customer_id,
      email: r.billing_email,
      createdAt: r.date_created.toISOString(),
      itemCount: r.item_count,
    })),
  };
}

/** Revenue by day, week or month, aggregated in Postgres. */
export async function revenueSeries(
  storeId: string,
  opts: { from: Date; to: Date; granularity: "day" | "week" | "month" },
): Promise<{ bucket: string; revenue: number; orders: number }[]> {
  // Interpolated, not parameterised — date_trunc takes a literal. Safe because
  // the value is constrained to three known strings by the type above and
  // checked again here rather than trusted.
  const unit =
    opts.granularity === "month" ? "month" : opts.granularity === "week" ? "week" : "day";

  const rows = await db()<{ bucket: Date; revenue: number; orders: number }[]>`
    select date_trunc(${unit}, date_created) as bucket,
           sum(total)::numeric(14,2) as revenue,
           count(*)::int as orders
    from woo_orders
    where store_id = ${storeId}
      and date_created >= ${opts.from} and date_created <= ${opts.to}
      -- Cancelled, refunded and failed orders are not revenue.
      and status in ('completed', 'processing', 'on-hold')
    group by 1 order by 1
  `;

  return rows.map((r) => ({
    bucket: r.bucket.toISOString(),
    revenue: Number(r.revenue),
    orders: r.orders,
  }));
}

/** How current the mirror is, for the "last updated" line and sync screens. */
export async function syncStatus(storeId: string): Promise<{
  lastSyncAt: string | null;
  orders: number;
  customers: number;
  products: number;
  /** False while history is still being read. Distinct from "has some rows". */
  backfillDone: boolean;
  backfillThrough: string | null;
  lastRun: { status: string; mode: string; error: string | null; finishedAt: string | null } | null;
}> {
  // Concurrent, not sequential: they touch different tables and neither needs
  // the other's result, so paying two round trips in series is pure waste.
  const [[store], [run]] = await Promise.all([
    db()<
      {
        last_sync_at: Date | null;
        order_count: number;
        customer_count: number;
        product_count: number;
        backfill_done: boolean;
        backfill_through: Date | null;
      }[]
    >`
      select last_sync_at, order_count, customer_count, product_count,
             backfill_done, backfill_through
      from stores where id = ${storeId}
    `,
    db()<{ status: string; mode: string; error: string | null; finished_at: Date | null }[]>`
      select status, mode, error, finished_at from woo_sync_runs
      where store_id = ${storeId} order by started_at desc limit 1
    `,
  ]);


  return {
    lastSyncAt: store?.last_sync_at?.toISOString() ?? null,
    orders: store?.order_count ?? 0,
    customers: store?.customer_count ?? 0,
    products: store?.product_count ?? 0,
    backfillDone: store?.backfill_done ?? false,
    backfillThrough: store?.backfill_through?.toISOString() ?? null,
    lastRun: run
      ? {
          status: run.status,
          mode: run.mode,
          error: run.error,
          finishedAt: run.finished_at?.toISOString() ?? null,
        }
      : null,
  };
}
