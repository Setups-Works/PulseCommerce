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
 * ─── The remaining in-process cache ────────────────────────────────────────
 *
 * One short-lived memo per instance, because a single dashboard load makes
 * several requests that each want the same snapshot, and reading it three
 * times in two seconds is waste. It is not a correctness mechanism: the mirror
 * is the source of truth and the memo is measured in seconds.
 */

const MEMO_TTL_MS = 15_000;
const memo = new Map<string, { snapshot: StoreSnapshot; expiresAt: number }>();

export class NoMirrorDataError extends Error {
  readonly code = "not_synced";
  constructor() {
    super("This store has not been synced yet.");
    this.name = "NoMirrorDataError";
  }
}

export async function readSnapshot(store: TenantStore): Promise<StoreSnapshot> {
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

/** Drops the memo for a store. Called after a sync, so the next read is fresh. */
export function forgetSnapshot(storeId: string): void {
  memo.delete(storeId);
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
  const [store] = await db()<
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
  `;

  const [run] = await db()<
    { status: string; mode: string; error: string | null; finished_at: Date | null }[]
  >`
    select status, mode, error, finished_at from woo_sync_runs
    where store_id = ${storeId} order by started_at desc limit 1
  `;

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
