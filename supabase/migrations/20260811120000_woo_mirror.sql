-- A local mirror of the connected WooCommerce store.
--
-- Why this exists
-- ---------------
-- Everything the dashboard shows is derived from the store's order history,
-- and the only way to get that history out of WooCommerce is its REST API,
-- one page of orders at a time. On a store with tens of thousands of orders
-- that is minutes of sequential HTTP, and enough sustained traffic that the
-- store's own security layer starts refusing us. It was cached as a single
-- gzipped blob, which made the second read fast and left the first one slow,
-- unqueryable, and all-or-nothing to refresh.
--
-- Mirroring into Postgres replaces that: the pull happens on a schedule
-- instead of in front of a waiting user, it can resume and go incremental
-- because every row records when WooCommerce last modified it, and the data
-- becomes something you can query rather than a blob you must load whole.
--
-- Shape: columns plus `raw`
-- -------------------------
-- Each table has real columns for the fields that get filtered, sorted and
-- aggregated, and a `raw` jsonb holding the complete WooCommerce object.
--
-- The columns are what make SQL possible — a paginated order list, a revenue
-- sum by month, a customer's history — without loading anything into memory.
-- The jsonb is what makes the mirror lossless: the analytics engine consumes
-- the full WooCommerce object shape, and mapping sixty-odd fields into columns
-- would be a large migration that quietly drops whatever it failed to
-- anticipate. Reconstructing a snapshot is `select raw`, and the engine cannot
-- tell the difference.
--
-- Access
-- ------
-- Row level security is on with no policies, so PostgREST reaches none of it
-- with an anon or authenticated key. The application connects as the table
-- owner over the pooler, which is not subject to RLS. This data includes every
-- customer's name, email and address; it must never be reachable from a
-- browser.

-- ── The stores being mirrored ───────────────────────────────────────────────

create table if not exists public.woo_stores (
  store_url        text primary key,
  name             text,
  currency         text,
  -- Where an incremental sync resumes from: the newest `date_modified_gmt`
  -- seen. Null means nothing has been pulled yet and the next run is a full one.
  synced_through   timestamptz,
  last_sync_at     timestamptz,
  order_count      integer not null default 0,
  customer_count   integer not null default 0,
  product_count    integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Orders ──────────────────────────────────────────────────────────────────

create table if not exists public.woo_orders (
  store_url        text not null references public.woo_stores(store_url) on delete cascade,
  id               bigint not null,
  number           text,
  status           text not null,
  currency         text,
  -- numeric, not float: these are money. WooCommerce sends them as strings and
  -- summing them as doubles produces totals that are off by cents and cannot be
  -- reconciled against the store.
  total            numeric(14,2) not null default 0,
  discount_total   numeric(14,2) not null default 0,
  shipping_total   numeric(14,2) not null default 0,
  total_tax        numeric(14,2) not null default 0,
  customer_id      bigint not null default 0,
  billing_email    text,
  billing_city     text,
  billing_state    text,
  billing_country  text,
  payment_method   text,
  date_created     timestamptz not null,
  date_paid        timestamptz,
  date_completed   timestamptz,
  -- Drives incremental sync. WooCommerce updates this on any change, including
  -- a refund or a status transition long after the order was placed.
  date_modified    timestamptz,
  item_count       integer not null default 0,
  raw              jsonb not null,
  synced_at        timestamptz not null default now(),
  primary key (store_url, id)
);

-- The dashboard's default question is "this store, this date range", so the
-- store leads every index and the range follows.
create index if not exists woo_orders_store_created_idx
  on public.woo_orders (store_url, date_created desc);
create index if not exists woo_orders_store_status_idx
  on public.woo_orders (store_url, status);
create index if not exists woo_orders_store_customer_idx
  on public.woo_orders (store_url, customer_id)
  where customer_id > 0;
-- Resuming a sync reads the high-water mark; without this it is a seq scan
-- over every order on each run.
create index if not exists woo_orders_store_modified_idx
  on public.woo_orders (store_url, date_modified desc nulls last);

-- ── Line items ──────────────────────────────────────────────────────────────
-- Split out of the order because product questions — units sold, basket
-- affinity, what to restock — are per-item and would otherwise mean unnesting
-- jsonb across the whole table.

create table if not exists public.woo_order_items (
  store_url        text not null,
  order_id         bigint not null,
  id               bigint not null,
  product_id       bigint not null default 0,
  variation_id     bigint not null default 0,
  name             text,
  quantity         integer not null default 0,
  subtotal         numeric(14,2) not null default 0,
  total            numeric(14,2) not null default 0,
  -- Denormalised from the order so per-product time series need no join.
  order_date       timestamptz not null,
  primary key (store_url, order_id, id),
  foreign key (store_url, order_id)
    references public.woo_orders(store_url, id) on delete cascade
);

create index if not exists woo_order_items_product_idx
  on public.woo_order_items (store_url, product_id, order_date desc);

-- ── Customers ───────────────────────────────────────────────────────────────

create table if not exists public.woo_customers (
  store_url        text not null references public.woo_stores(store_url) on delete cascade,
  id               bigint not null,
  email            text,
  first_name       text,
  last_name        text,
  username         text,
  billing_city     text,
  billing_state    text,
  billing_country  text,
  -- Whether a number exists, not the number. Phone numbers are resolved at the
  -- moment a message is sent and are never returned by the API; keeping the
  -- boolean here means audience sizes can be counted in SQL without the
  -- mirror becoming a contact list.
  has_phone        boolean not null default false,
  orders_count     integer not null default 0,
  total_spent      numeric(14,2) not null default 0,
  date_created     timestamptz,
  date_modified    timestamptz,
  raw              jsonb not null,
  synced_at        timestamptz not null default now(),
  primary key (store_url, id)
);

create index if not exists woo_customers_store_email_idx
  on public.woo_customers (store_url, lower(email));
create index if not exists woo_customers_store_spent_idx
  on public.woo_customers (store_url, total_spent desc);

-- ── Products ────────────────────────────────────────────────────────────────

create table if not exists public.woo_products (
  store_url        text not null references public.woo_stores(store_url) on delete cascade,
  id               bigint not null,
  name             text,
  sku              text,
  status           text,
  type             text,
  price            numeric(14,2),
  regular_price    numeric(14,2),
  stock_quantity   integer,
  stock_status     text,
  total_sales      integer not null default 0,
  date_created     timestamptz,
  date_modified    timestamptz,
  raw              jsonb not null,
  synced_at        timestamptz not null default now(),
  primary key (store_url, id)
);

create index if not exists woo_products_store_stock_idx
  on public.woo_products (store_url, stock_status);

-- ── Sync history ────────────────────────────────────────────────────────────
-- Kept because "why is this figure stale" is otherwise unanswerable, and a
-- partial sync that failed halfway is indistinguishable from a small store.

create table if not exists public.woo_sync_runs (
  id               uuid primary key default gen_random_uuid(),
  store_url        text not null,
  mode             text not null check (mode in ('full', 'incremental')),
  status           text not null check (status in ('running', 'succeeded', 'failed')),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  orders_synced    integer not null default 0,
  customers_synced integer not null default 0,
  products_synced  integer not null default 0,
  error            text
);

create index if not exists woo_sync_runs_store_started_idx
  on public.woo_sync_runs (store_url, started_at desc);

-- ── updated_at ──────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists woo_stores_touch on public.woo_stores;
create trigger woo_stores_touch
  before update on public.woo_stores
  for each row execute function public.touch_updated_at();

-- ── Lock everything down ────────────────────────────────────────────────────
-- RLS on with no policies: PostgREST can reach none of this with an anon or
-- authenticated key. The app connects as the owner over the pooler, which RLS
-- does not apply to. Every table below holds customer-identifying data.

alter table public.woo_stores      enable row level security;
alter table public.woo_orders      enable row level security;
alter table public.woo_order_items enable row level security;
alter table public.woo_customers   enable row level security;
alter table public.woo_products    enable row level security;
alter table public.woo_sync_runs   enable row level security;
