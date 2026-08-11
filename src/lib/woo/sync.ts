import { db } from "@/lib/db/client";
import type { StoreConfig } from "@/lib/store/config";
import { WooClient } from "./client";
import type { WooCustomer, WooOrder, WooProduct } from "./types";

/**
 * Pulls a WooCommerce store into Postgres.
 *
 * The problem this solves: everything the dashboard shows is derived from the
 * order history, and the only way out of WooCommerce is its REST API, a
 * hundred orders per request. On a real store that is minutes of sequential
 * HTTP — long enough to outlive a serverless invocation, and enough sustained
 * traffic that the shop's own security layer starts refusing us.
 *
 * That pull used to happen in front of a waiting user on a cache miss. Now it
 * happens here, on a schedule, and every read is a query against local tables.
 *
 * ─── Full and incremental ──────────────────────────────────────────────────
 *
 * The first run is full. Every run after that asks WooCommerce only for
 * records modified since the last successful one, which on a typical day is a
 * few dozen rows rather than tens of thousands.
 *
 * `date_modified` rather than `date_created` is what makes that correct: an
 * order placed last year can be refunded today, and filtering on creation
 * would never see the change.
 *
 * ─── Overlap ───────────────────────────────────────────────────────────────
 *
 * The high-water mark is rewound slightly on each run. WooCommerce timestamps
 * have one-second resolution, so a record modified in the same second the
 * previous run finished can be missed entirely. Re-reading a small overlap is
 * free — every write is an upsert — and missing an order is not.
 */

/** Seconds of overlap re-read on each incremental run. See above. */
const OVERLAP_SECONDS = 120;

/** Rows per insert. Large enough to be few round trips, small enough to not
 *  exceed Postgres's parameter limit once multiplied by the column count. */
const BATCH = 500;

export interface SyncResult {
  mode: "full" | "incremental";
  orders: number;
  customers: number;
  products: number;
  warnings: string[];
  durationMs: number;
}

export async function syncStore(
  storeId: string,
  config: StoreConfig,
  opts: { full?: boolean } = {},
): Promise<SyncResult> {
  const started = Date.now();
  const client = new WooClient(config);
  const warnings: string[] = [];

  const [{ synced_through }] = await db()<{ synced_through: Date | null }[]>`
    select synced_through from stores where id = ${storeId}
  `;

  const full = opts.full || !synced_through;
  const mode = full ? "full" : "incremental";

  const [run] = await db()<{ id: string }[]>`
    insert into woo_sync_runs (store_id, mode, status) values (${storeId}, ${mode}, 'running')
    returning id
  `;

  try {
    // The window WooCommerce is asked for. A full run goes back as far as the
    // merchant's configured history; an incremental one only to the last mark.
    const after = new Date();
    if (full) {
      after.setMonth(after.getMonth() - (config.historyMonths || 24));
    } else {
      after.setTime(synced_through!.getTime() - OVERLAP_SECONDS * 1000);
    }
    const modifiedAfter = after.toISOString().slice(0, 19);

    /*
     * Customers and products first, together: both are small and quick. The
     * order pull runs several connections wide and saturates a real store
     * badly enough that running it alongside these timed them out.
     */
    const [customers, products] = await Promise.all([
      client
        .getCustomers(
          full
            ? { orderby: "registered_date", order: "asc", role: "all" }
            : { orderby: "registered_date", order: "asc", role: "all", modified_after: modifiedAfter },
          config.maxPages,
        )
        .catch((error) => {
          warnings.push(`Customer records unavailable (${describe(error)}).`);
          return [] as WooCustomer[];
        }),
      client
        .getProducts(
          full
            ? { orderby: "date", order: "desc", status: "any" }
            : { orderby: "date", order: "desc", status: "any", modified_after: modifiedAfter },
          config.maxPages,
        )
        .catch((error) => {
          warnings.push(`Product catalogue unavailable (${describe(error)}).`);
          return [] as WooProduct[];
        }),
    ]);

    const orders = await client.getOrders(
      full
        ? { orderby: "date", order: "desc", status: "any", after: `${modifiedAfter}` }
        : { orderby: "modified", order: "desc", status: "any", modified_after: modifiedAfter },
      config.maxPages,
    );

    await writeCustomers(storeId, customers);
    await writeProducts(storeId, products);
    await writeOrders(storeId, orders);

    /*
     * The mark is the newest `date_modified` actually seen, not "now".
     *
     * Using the clock would silently skip anything modified during the run —
     * the pull takes minutes, and an order changed while it was in progress
     * would fall between the mark and the next window. Taking it from the data
     * means the worst case is re-reading a record, which is harmless.
     */
    const newest = newestModified(orders, customers, products);

    await db()`
      update stores set
        synced_through = ${newest ?? synced_through ?? new Date()},
        last_sync_at   = now(),
        order_count    = (select count(*) from woo_orders where store_id = ${storeId}),
        customer_count = (select count(*) from woo_customers where store_id = ${storeId}),
        product_count  = (select count(*) from woo_products where store_id = ${storeId})
      where id = ${storeId}
    `;

    await db()`
      update woo_sync_runs set
        status = 'succeeded', finished_at = now(),
        orders_synced = ${orders.length},
        customers_synced = ${customers.length},
        products_synced = ${products.length}
      where id = ${run.id}
    `;

    return {
      mode,
      orders: orders.length,
      customers: customers.length,
      products: products.length,
      warnings,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    /*
     * The mark is deliberately not advanced on failure, so the next run
     * re-reads the same window rather than stepping over whatever was missed.
     * A partial sync is recorded as failed so the dashboard can say why its
     * figures are behind, instead of presenting incomplete data as current.
     */
    await db()`
      update woo_sync_runs set status = 'failed', finished_at = now(), error = ${describe(error)}
      where id = ${run.id}
    `;
    throw error;
  }
}

/* ── Writers ──────────────────────────────────────────────────────────────
 *
 * Every write is an upsert keyed on (store_id, id), which is what makes the
 * overlap window and any retry safe: running the same sync twice produces the
 * same table, not duplicates.
 */

async function writeOrders(storeId: string, orders: WooOrder[]): Promise<void> {
  for (let i = 0; i < orders.length; i += BATCH) {
    const chunk = orders.slice(i, i + BATCH);

    await db()`
      insert into woo_orders ${db()(
        chunk.map((o) => ({
          store_id: storeId,
          id: o.id,
          number: o.number ?? String(o.id),
          status: o.status,
          currency: o.currency ?? null,
          total: num(o.total),
          discount_total: num(o.discount_total),
          shipping_total: num(o.shipping_total),
          total_tax: num(o.total_tax),
          customer_id: o.customer_id ?? 0,
          billing_email: o.billing?.email ?? null,
          billing_city: o.billing?.city ?? null,
          billing_state: o.billing?.state ?? null,
          billing_country: o.billing?.country ?? null,
          payment_method: o.payment_method ?? null,
          date_created: o.date_created_gmt ?? o.date_created,
          date_paid: o.date_paid ?? null,
          date_completed: o.date_completed ?? null,
          date_modified: (o as { date_modified_gmt?: string }).date_modified_gmt ?? null,
          item_count: o.line_items?.length ?? 0,
          raw: db().json(o as never),
        })) as never,
      )}
      on conflict (store_id, id) do update set
        status = excluded.status, total = excluded.total,
        discount_total = excluded.discount_total,
        shipping_total = excluded.shipping_total,
        total_tax = excluded.total_tax,
        date_paid = excluded.date_paid,
        date_completed = excluded.date_completed,
        date_modified = excluded.date_modified,
        item_count = excluded.item_count,
        raw = excluded.raw,
        synced_at = now()
    `;

    // Line items are replaced wholesale for the orders in this chunk: an order
    // can lose a line to a refund, and an upsert alone would leave the removed
    // row behind.
    const ids = chunk.map((o) => o.id);
    await db()`delete from woo_order_items where store_id = ${storeId} and order_id in ${db()(ids)}`;

    const items = chunk.flatMap((o) =>
      (o.line_items ?? []).map((li) => ({
        store_id: storeId,
        order_id: o.id,
        id: li.id,
        product_id: li.product_id ?? 0,
        variation_id: li.variation_id ?? 0,
        name: li.name ?? null,
        quantity: li.quantity ?? 0,
        subtotal: num(li.subtotal),
        total: num(li.total),
        order_date: o.date_created_gmt ?? o.date_created,
      })),
    );

    if (items.length) {
      await db()`
        insert into woo_order_items ${db()(items as never)}
        on conflict (store_id, order_id, id) do nothing
      `;
    }
  }
}

async function writeCustomers(storeId: string, customers: WooCustomer[]): Promise<void> {
  for (let i = 0; i < customers.length; i += BATCH) {
    const chunk = customers.slice(i, i + BATCH);
    await db()`
      insert into woo_customers ${db()(
        chunk.map((c) => ({
          store_id: storeId,
          id: c.id,
          email: c.email ?? null,
          first_name: c.first_name ?? null,
          last_name: c.last_name ?? null,
          username: (c as { username?: string }).username ?? null,
          billing_city: c.billing?.city ?? null,
          billing_state: c.billing?.state ?? null,
          billing_country: c.billing?.country ?? null,
          // Whether a number exists, never the number itself. Phone numbers are
          // resolved at send time; storing them here would turn the mirror into
          // a contact list.
          has_phone: Boolean(c.billing?.phone?.trim()),
          orders_count: Number((c as { orders_count?: number }).orders_count ?? 0),
          total_spent: num((c as { total_spent?: string }).total_spent),
          date_created: c.date_created ?? null,
          date_modified: (c as { date_modified_gmt?: string }).date_modified_gmt ?? null,
          raw: db().json(c as never),
        })) as never,
      )}
      on conflict (store_id, id) do update set
        email = excluded.email, first_name = excluded.first_name,
        last_name = excluded.last_name, has_phone = excluded.has_phone,
        orders_count = excluded.orders_count, total_spent = excluded.total_spent,
        date_modified = excluded.date_modified, raw = excluded.raw,
        synced_at = now()
    `;
  }
}

async function writeProducts(storeId: string, products: WooProduct[]): Promise<void> {
  for (let i = 0; i < products.length; i += BATCH) {
    const chunk = products.slice(i, i + BATCH);
    await db()`
      insert into woo_products ${db()(
        chunk.map((p) => ({
          store_id: storeId,
          id: p.id,
          name: p.name ?? null,
          sku: p.sku ?? null,
          status: p.status ?? null,
          type: (p as { type?: string }).type ?? null,
          price: num(p.price),
          regular_price: num((p as { regular_price?: string }).regular_price),
          stock_quantity: p.stock_quantity ?? null,
          stock_status: p.stock_status ?? null,
          total_sales: Number((p as { total_sales?: number }).total_sales ?? 0),
          date_created: (p as { date_created?: string }).date_created ?? null,
          date_modified: (p as { date_modified_gmt?: string }).date_modified_gmt ?? null,
          raw: db().json(p as never),
        })) as never,
      )}
      on conflict (store_id, id) do update set
        name = excluded.name, sku = excluded.sku, status = excluded.status,
        price = excluded.price, stock_quantity = excluded.stock_quantity,
        stock_status = excluded.stock_status, total_sales = excluded.total_sales,
        date_modified = excluded.date_modified, raw = excluded.raw,
        synced_at = now()
    `;
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** WooCommerce sends money as strings, and empty for "not set". */
function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function newestModified(...groups: unknown[][]): Date | null {
  let newest: number | null = null;
  for (const group of groups) {
    for (const record of group) {
      const raw = (record as { date_modified_gmt?: string }).date_modified_gmt;
      if (!raw) continue;
      // WooCommerce's GMT fields carry no zone marker; without the Z these
      // parse as local time and the mark lands hours off.
      const at = Date.parse(raw.endsWith("Z") ? raw : `${raw}Z`);
      if (Number.isFinite(at) && (newest === null || at > newest)) newest = at;
    }
  }
  return newest === null ? null : new Date(newest);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
