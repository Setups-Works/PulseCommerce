import { db } from "@/lib/db/client";
import type { StoreConfig } from "@/lib/store/config";
import { WooClient } from "./client";
import type { WooCustomer, WooOrder, WooProduct } from "./types";

/**
 * Pulls a WooCommerce store into Postgres, a little at a time.
 *
 * ─── Why this is resumable rather than a single pass ───────────────────────
 *
 * WooCommerce serves a hundred orders per request and is not fast about it:
 * measured at roughly eleven seconds a page against a real store of 21,052
 * orders. That is about forty minutes for a first sync — many times longer
 * than a serverless function is allowed to run.
 *
 * The first version did it in one pass and only advanced its watermark on
 * success. Every attempt was therefore killed partway and restarted from
 * nothing, so a store that size could never finish, and the two runs it
 * produced sat at "running" forever because nothing was left to record a
 * failure.
 *
 * So a run now works to a time budget, writes what it reads as it reads it,
 * and records where it got to. Whatever calls it next resumes from there. A
 * killed invocation costs the page it was mid-way through, not the run.
 *
 * ─── Why the cursor is a date, not a page number ───────────────────────────
 *
 * Page numbers shift underneath you. An order placed during the backfill
 * renumbers every page after it, so resuming at "page 47" silently skips or
 * repeats records. The backfill therefore reads oldest-first and remembers the
 * newest `date_created` it has written; resuming asks for everything after
 * that. Inserts land ahead of the cursor and are picked up in order.
 */

/**
 * How long one invocation may work for.
 *
 * Under the route's 300s maxDuration with room to finish the page in hand,
 * write it, and update the cursor. Exceeding the platform limit would kill the
 * process before the cursor was saved, losing that page's progress.
 */
const DEFAULT_BUDGET_MS = 230_000;

/** Seconds of overlap re-read on each incremental run. */
const OVERLAP_SECONDS = 120;

/** Rows per insert: few round trips, without exceeding Postgres's parameter cap. */
const BATCH = 500;

const PER_PAGE = 100;

/**
 * Pages requested at once during a backfill.
 *
 * Measured against a real store: one page at a time gives ~46 orders/s and a
 * 21,000-order history takes about eight minutes. Four gives 170/s, eight 305,
 * fourteen 422 — with no failures at any level.
 *
 * Eight rather than fourteen. The gain from there is a third while the request
 * rate nearly doubles, and the failure this trades against is not a slow sync
 * but the store's security layer refusing the app outright — which has already
 * happened once here, when two backfills overlapped. Eight puts a full history
 * inside a single invocation with room spare, which is the thing that actually
 * matters.
 */
const PAGE_CONCURRENCY = 8;

export interface SyncResult {
  mode: "full" | "incremental";
  /** False when the budget ran out with history still to read. */
  done: boolean;
  orders: number;
  customers: number;
  products: number;
  /** How far the backfill has reached, for progress display. */
  backfillThrough: string | null;
  warnings: string[];
  durationMs: number;
}

interface StoreRow {
  synced_through: Date | null;
  backfill_through: Date | null;
  backfill_done: boolean;
}

export async function syncStore(
  storeId: string,
  config: StoreConfig,
  opts: { full?: boolean; budgetMs?: number } = {},
): Promise<SyncResult> {
  const started = Date.now();
  const deadline = started + (opts.budgetMs ?? DEFAULT_BUDGET_MS);
  const client = new WooClient(config);
  const warnings: string[] = [];

  const [store] = await db()<StoreRow[]>`
    select synced_through, backfill_through, backfill_done from stores where id = ${storeId}
  `;

  if (opts.full) {
    await db()`
      update stores set backfill_through = null, backfill_done = false, synced_through = null
      where id = ${storeId}
    `;
  }

  const backfilling = opts.full || !store?.backfill_done;
  const mode = backfilling ? "full" : "incremental";

  /*
   * One sync per store at a time.
   *
   * Two drivers exist — the onboarding page, which calls in a loop while it is
   * open, and the scheduler — and nothing stopped them overlapping. Two
   * backfills against the same shop double the request rate and get the app
   * refused by the store's own security layer, which is exactly what happened:
   * "Could not reach …(fetch failed)" while a second pull was in flight.
   *
   * The claim is a conditional insert, so two callers racing cannot both win:
   * the row only appears if no live run exists at the moment it is written.
   */
  const [run] = await db()<{ id: string }[]>`
    insert into woo_sync_runs (store_id, mode, status)
    select ${storeId}, ${mode}, 'running'
    where not exists (
      select 1 from woo_sync_runs
      where store_id = ${storeId} and status = 'running'
        -- A run whose process died leaves its row behind. After this long it
        -- is stale rather than live, or the caller would have finished it.
        and started_at > now() - interval '10 minutes'
    )
    returning id
  `;

  if (!run) {
    // Not an error: the work is already happening. The caller polls status and
    // will see it advance.
    const [current] = await db()<{ backfill_through: Date | null; backfill_done: boolean }[]>`
      select backfill_through, backfill_done from stores where id = ${storeId}
    `;
    return {
      mode,
      done: current?.backfill_done ?? false,
      orders: 0,
      customers: 0,
      products: 0,
      backfillThrough: current?.backfill_through?.toISOString() ?? null,
      warnings: ["A sync is already running for this store."],
      durationMs: Date.now() - started,
    };
  }

  let orders = 0;
  let customers = 0;
  let products = 0;
  let done = true;

  try {
    /*
     * Customers and products first, and only on a backfill's first pass or an
     * incremental run. They are small — hundreds, not tens of thousands — so
     * they finish in one go, and repeating them on every resumed page of the
     * order backfill would waste most of the budget.
     */
    const catalogueNeeded = !backfilling || !store?.backfill_through;
    if (catalogueNeeded) {
      const since = opts.full || !store?.synced_through
        ? undefined
        : isoSeconds(new Date(store.synced_through.getTime() - OVERLAP_SECONDS * 1000));

      const [c, p] = await Promise.all([
        client
          .getCustomers(
            { orderby: "registered_date", order: "asc", role: "all", ...(since ? { modified_after: since } : {}) },
            config.maxPages,
          )
          .catch((error) => {
            warnings.push(`Customer records unavailable (${describe(error)}).`);
            return [] as WooCustomer[];
          }),
        client
          .getProducts(
            { orderby: "date", order: "desc", status: "any", ...(since ? { modified_after: since } : {}) },
            config.maxPages,
          )
          .catch((error) => {
            warnings.push(`Product catalogue unavailable (${describe(error)}).`);
            return [] as WooProduct[];
          }),
      ]);

      await writeCustomers(storeId, c);
      await writeProducts(storeId, p);
      customers = c.length;
      products = p.length;
    }

    if (backfilling) {
      const outcome = await backfillOrders(storeId, client, config, store, deadline);
      orders = outcome.written;
      done = outcome.caughtUp;
    } else {
      orders = await incrementalOrders(storeId, client, config, store);
      done = true;
    }

    await db()`
      update stores set
        last_sync_at   = now(),
        order_count    = (select count(*) from woo_orders where store_id = ${storeId}),
        customer_count = (select count(*) from woo_customers where store_id = ${storeId}),
        product_count  = (select count(*) from woo_products where store_id = ${storeId})
      where id = ${storeId}
    `;

    /*
     * A run that stops on its time budget has still finished — it did the work
     * it was given. Whether history remains is a property of the store
     * (`backfill_done`), not of the run.
     *
     * Conflating the two left every budget-stopped run at 'running' with no
     * finish time, for ever. That made the lock's ten-minute staleness window
     * the only thing preventing a permanent deadlock, and made the run history
     * unreadable: a finished run appeared to have been going for 73 minutes,
     * because its duration was measured against a clock that never stopped.
     */
    await db()`
      update woo_sync_runs set
        status = 'succeeded', finished_at = now(),
        orders_synced = ${orders}, customers_synced = ${customers}, products_synced = ${products}
      where id = ${run.id}
    `;

    const [after] = await db()<{ backfill_through: Date | null }[]>`
      select backfill_through from stores where id = ${storeId}
    `;

    return {
      mode,
      done,
      orders,
      customers,
      products,
      backfillThrough: after?.backfill_through?.toISOString() ?? null,
      warnings,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    /*
     * The cursor is not rolled back. Everything written before the failure is
     * real and already committed, so the next run should carry on from there
     * rather than re-reading pages it has already stored.
     */
    await db()`
      update woo_sync_runs set status = 'failed', finished_at = now(), error = ${describe(error)}
      where id = ${run.id}
    `;
    throw error;
  }
}

/**
 * Reads history forward from the cursor until it catches up or runs out of time.
 *
 * Each page is written and the cursor advanced before the next is requested,
 * so the process can be killed at any point and lose at most the page in
 * flight.
 */
async function backfillOrders(
  storeId: string,
  client: WooClient,
  config: StoreConfig,
  store: StoreRow | undefined,
  deadline: number,
): Promise<{ written: number; caughtUp: boolean }> {
  // Where history starts, when nothing has been read yet.
  const floor = new Date();
  floor.setMonth(floor.getMonth() - (config.historyMonths || 24));

  let cursor = store?.backfill_through ?? floor;
  let written = 0;
  let failures = 0;

  while (Date.now() < deadline) {
    /*
     * Several pages of the same `after=cursor` query, at once.
     *
     * Ordering ascending is what makes this safe to parallelise: the result
     * set for a given cursor is stable, because an order placed while the
     * backfill runs sorts to the end rather than shifting the pages being
     * read. Page numbers within one round therefore address the rows they
     * addressed when the round began.
     */
    const wanted = Array.from({ length: PAGE_CONCURRENCY }, (_, i) => i + 1);

    let pages: WooOrder[][];
    try {
      pages = await Promise.all(
        wanted.map((page) =>
          client
            .request<WooOrder[]>("orders", {
              per_page: PER_PAGE,
              page,
              orderby: "date",
              order: "asc",
              status: "any",
              after: isoSeconds(cursor),
            })
            .then((r) => r.data),
        ),
      );
      failures = 0;
    } catch (error) {
      /*
       * Usually the store rate-limiting rather than a broken connection.
       * Backing off beats failing a run that has already written thousands of
       * orders — the cursor is saved, so the worst case is stopping early.
       */
      failures += 1;
      if (failures >= 3) {
        if (written > 0) return { written, caughtUp: false };
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, failures * 4000));
      continue;
    }

    const batch = pages.flat();
    if (batch.length === 0) {
      await db()`update stores set backfill_done = true where id = ${storeId}`;
      return { written, caughtUp: true };
    }

    await writeOrders(storeId, batch);
    written += batch.length;

    const newest = batch.reduce((max, o) => {
      const at = Date.parse(utc(o.date_created_gmt) ?? utc(o.date_created) ?? "");
      return Number.isFinite(at) && at > max ? at : max;
    }, cursor.getTime());

    /*
     * Guard against a stalled cursor. If every order in a round shares the
     * timestamp the cursor already holds, `after` returns the same rows for
     * ever. Nudging past costs at most a duplicated second, and every write is
     * an upsert, so re-reading is free.
     */
    cursor = new Date(newest > cursor.getTime() ? newest : cursor.getTime() + 1000);
    await db()`update stores set backfill_through = ${cursor} where id = ${storeId}`;

    /*
     * A round that came back short has reached the end of the history. Any
     * full round might not have, so keep going.
     */
    if (batch.length < PER_PAGE * PAGE_CONCURRENCY) {
      await db()`update stores set backfill_done = true where id = ${storeId}`;
      return { written, caughtUp: true };
    }
  }

  return { written, caughtUp: false };
}

/** Everything modified since the last run. Small enough for one pass. */
async function incrementalOrders(
  storeId: string,
  client: WooClient,
  config: StoreConfig,
  store: StoreRow | undefined,
): Promise<number> {
  const since = store?.synced_through
    ? new Date(store.synced_through.getTime() - OVERLAP_SECONDS * 1000)
    : new Date(Date.now() - 24 * 3600 * 1000);

  const data = await client.getOrders(
    { orderby: "modified", order: "desc", status: "any", modified_after: isoSeconds(since) },
    config.maxPages,
  );

  await writeOrders(storeId, data);

  /*
   * The mark comes from the data, not the clock. Using "now" would skip
   * anything modified while the run was in progress, since that change would
   * fall between the mark and the next window.
   */
  const newest = data.reduce((max, o) => {
    const at = Date.parse(utc((o as { date_modified_gmt?: string }).date_modified_gmt) ?? "");
    return Number.isFinite(at) && at > max ? at : max;
  }, 0);

  await db()`
    update stores set synced_through = ${newest ? new Date(newest) : new Date()}
    where id = ${storeId}
  `;

  return data.length;
}

/* ── Writers ──────────────────────────────────────────────────────────────
 *
 * Every write is an upsert keyed on (store_id, id), which is what makes the
 * overlap window, a resumed cursor and any retry safe: running the same page
 * twice produces the same table, not duplicates.
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
          date_created: utc(o.date_created_gmt) ?? utc(o.date_created),
          date_paid: utc(o.date_paid),
          date_completed: utc(o.date_completed),
          date_modified: utc((o as { date_modified_gmt?: string }).date_modified_gmt),
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

    // Line items are replaced for the orders in this chunk: an order can lose
    // a line to a refund, and an upsert alone would leave the removed row.
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
        order_date: utc(o.date_created_gmt) ?? utc(o.date_created),
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
          // Whether a number exists, never the number. Phone numbers are
          // resolved at send time; storing them would make this a contact list.
          has_phone: Boolean(c.billing?.phone?.trim()),
          orders_count: Number((c as { orders_count?: number }).orders_count ?? 0),
          total_spent: num((c as { total_spent?: string }).total_spent),
          date_created: utc(c.date_created),
          date_modified: utc((c as { date_modified_gmt?: string }).date_modified_gmt),
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
          date_created: utc((p as { date_created?: string }).date_created),
          date_modified: utc((p as { date_modified_gmt?: string }).date_modified_gmt),
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

/** WooCommerce wants `YYYY-MM-DDTHH:MM:SS`, and rejects a trailing Z. */
function isoSeconds(date: Date): string {
  return date.toISOString().slice(0, 19);
}

/**
 * Marks a WooCommerce GMT timestamp as UTC.
 *
 * The `*_gmt` fields are UTC but carry no zone marker, so
 * `2026-08-12T06:40:00` is ambiguous — and anything that turns it into a Date
 * resolves it against the *process* timezone. On a machine in IST that is
 * 06:40 local, or 01:10Z: five and a half hours earlier than the instant
 * WooCommerce meant.
 *
 * The damage is quiet and uneven. Every stored timestamp shifts, moving orders
 * near midnight into the wrong day — 1,254 of 21,057 on this store — so daily
 * revenue and every cohort boundary is wrong by whatever the host's offset
 * happens to be. It is also environment-dependent: correct on a UTC server,
 * wrong on a developer's laptop, which is worse than being consistently wrong
 * because the two disagree without either looking broken.
 *
 * Appending Z removes the ambiguity, so the value means the same thing
 * wherever it is parsed.
 */
function utc(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(value)) return value;
  return `${value}Z`;
}

/** WooCommerce sends money as strings, and empty for "not set". */
function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
