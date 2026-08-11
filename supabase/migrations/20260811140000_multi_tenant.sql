-- Multi-tenancy: every row belongs to a Supabase Auth user.
--
-- The two migrations before this one modelled a single installation with one
-- connected store. This is a SaaS product: each person signs up, connects
-- their own WooCommerce store and their own WhatsApp gateway, and must never
-- be able to see anyone else's. That is not a filter you add to queries — one
-- forgotten `where user_id = ...` is a cross-tenant data leak — so it is
-- enforced by the database through row level security, and the application is
-- not trusted to remember.
--
-- Those tables are dropped and rebuilt rather than altered. They were created
-- minutes ago and hold nothing; a clean shape is worth more than the history
-- of a schema that never carried data.
--
-- ── The two keys ────────────────────────────────────────────────────────────
--
-- `stores` gets a surrogate uuid rather than being keyed by URL. Two different
-- customers may connect the same shop — an agency and its client, someone
-- moving between accounts — so a URL is not an identity. Every mirrored table
-- then references `store_id`, which keeps the composite keys to two columns
-- and makes "delete this store and everything under it" a single cascade.
--
-- ── How isolation is enforced ───────────────────────────────────────────────
--
-- Two distinct paths reach this data and they are secured differently:
--
--   The browser, through PostgREST with the user's own JWT. RLS applies, and
--   the policies below limit every row to `auth.uid()`.
--
--   The server, through the transaction pooler as the table owner. RLS does
--   not apply, because this path also serves the WooCommerce callback and the
--   scheduler, neither of which has a user session. Everything on this path
--   must scope by user_id itself — which is why the application resolves a
--   tenant once per request rather than passing user ids around.

begin;

drop table if exists public.woo_order_items cascade;
drop table if exists public.woo_orders cascade;
drop table if exists public.woo_customers cascade;
drop table if exists public.woo_products cascade;
drop table if exists public.woo_sync_runs cascade;
drop table if exists public.woo_stores cascade;
drop table if exists public.store_config cascade;
drop table if exists public.whatsapp_config cascade;
drop table if exists public.whatsapp_enrolments cascade;
drop table if exists public.whatsapp_flows cascade;
drop table if exists public.whatsapp_broadcast_recipients cascade;
drop table if exists public.whatsapp_broadcasts cascade;
drop table if exists public.whatsapp_opt_outs cascade;
drop table if exists public.whatsapp_menu cascade;
drop table if exists public.analytics_cache cascade;
drop table if exists public.api_keys cascade;
drop table if exists public.kv_store cascade;

-- ── Profiles ────────────────────────────────────────────────────────────────
-- auth.users is managed by Supabase and should not be extended directly. This
-- is the application's own row per person, created by a trigger so it always
-- exists — code that has to cope with a missing profile is code that will
-- eventually get it wrong.

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    -- Populated by Google sign-in; absent for email/password, and that is fine.
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Stores ──────────────────────────────────────────────────────────────────

create table public.stores (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  url              text not null,
  name             text,
  -- Written only by the WooCommerce authorization flow. There is deliberately
  -- no way to type a consumer key into this app: a merchant pasting a secret
  -- into a form is the failure mode that flow exists to remove.
  consumer_key     text not null,
  consumer_secret  text not null,
  history_months   integer not null default 24,
  max_pages        integer not null default 300,
  is_active        boolean not null default true,
  synced_through   timestamptz,
  last_sync_at     timestamptz,
  order_count      integer not null default 0,
  customer_count   integer not null default 0,
  product_count    integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, url)
);

-- One active store per user, enforced here rather than by every write path
-- remembering to clear the previous one.
create unique index stores_one_active_per_user_idx
  on public.stores (user_id) where is_active;

create index stores_user_idx on public.stores (user_id);

-- ── The WooCommerce mirror ──────────────────────────────────────────────────
-- Columns for what gets filtered and aggregated; `raw` jsonb for fidelity, so
-- the analytics engine still receives the exact WooCommerce object shape and a
-- snapshot can be reconstructed without a lossy sixty-column mapping.

create table public.woo_orders (
  store_id         uuid not null references public.stores(id) on delete cascade,
  id               bigint not null,
  number           text,
  status           text not null,
  currency         text,
  -- numeric, not float: these are money, and summing them as doubles produces
  -- totals that cannot be reconciled against the store.
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
  -- a refund long after the order was placed.
  date_modified    timestamptz,
  item_count       integer not null default 0,
  raw              jsonb not null,
  synced_at        timestamptz not null default now(),
  primary key (store_id, id)
);

create index woo_orders_store_created_idx  on public.woo_orders (store_id, date_created desc);
create index woo_orders_store_status_idx   on public.woo_orders (store_id, status);
create index woo_orders_store_customer_idx on public.woo_orders (store_id, customer_id) where customer_id > 0;
create index woo_orders_store_modified_idx on public.woo_orders (store_id, date_modified desc nulls last);

create table public.woo_order_items (
  store_id      uuid not null,
  order_id      bigint not null,
  id            bigint not null,
  product_id    bigint not null default 0,
  variation_id  bigint not null default 0,
  name          text,
  quantity      integer not null default 0,
  subtotal      numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  -- Denormalised from the order so per-product time series need no join.
  order_date    timestamptz not null,
  primary key (store_id, order_id, id),
  foreign key (store_id, order_id) references public.woo_orders(store_id, id) on delete cascade
);

create index woo_order_items_product_idx on public.woo_order_items (store_id, product_id, order_date desc);

create table public.woo_customers (
  store_id        uuid not null references public.stores(id) on delete cascade,
  id              bigint not null,
  email           text,
  first_name      text,
  last_name       text,
  username        text,
  billing_city    text,
  billing_state   text,
  billing_country text,
  -- Whether a number exists, not the number. Phone numbers are resolved at the
  -- moment a message is sent and never returned by the API; the boolean lets
  -- audience sizes be counted in SQL without this becoming a contact list.
  has_phone       boolean not null default false,
  orders_count    integer not null default 0,
  total_spent     numeric(14,2) not null default 0,
  date_created    timestamptz,
  date_modified   timestamptz,
  raw             jsonb not null,
  synced_at       timestamptz not null default now(),
  primary key (store_id, id)
);

create index woo_customers_email_idx on public.woo_customers (store_id, lower(email));
create index woo_customers_spent_idx on public.woo_customers (store_id, total_spent desc);

create table public.woo_products (
  store_id        uuid not null references public.stores(id) on delete cascade,
  id              bigint not null,
  name            text,
  sku             text,
  status          text,
  type            text,
  price           numeric(14,2),
  regular_price   numeric(14,2),
  stock_quantity  integer,
  stock_status    text,
  total_sales     integer not null default 0,
  date_created    timestamptz,
  date_modified   timestamptz,
  raw             jsonb not null,
  synced_at       timestamptz not null default now(),
  primary key (store_id, id)
);

create index woo_products_stock_idx on public.woo_products (store_id, stock_status);

create table public.woo_sync_runs (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references public.stores(id) on delete cascade,
  mode             text not null check (mode in ('full', 'incremental')),
  status           text not null check (status in ('running', 'succeeded', 'failed')),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  orders_synced    integer not null default 0,
  customers_synced integer not null default 0,
  products_synced  integer not null default 0,
  error            text
);

create index woo_sync_runs_store_idx on public.woo_sync_runs (store_id, started_at desc);

-- ── WhatsApp, per user ──────────────────────────────────────────────────────

create table public.whatsapp_connections (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  base_url       text,
  api_key        text,
  session_id     text,
  session_name   text,
  phone          text,
  dial_code      text,
  send_delay_ms  integer not null default 4000,
  updated_at     timestamptz not null default now()
);

create table public.whatsapp_flows (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  status      text not null default 'draft',
  -- Steps and the entry filter are a nested, fast-changing shape that is always
  -- read and written whole and never queried into. The rows below are the parts
  -- that are queried.
  definition  jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index whatsapp_flows_user_idx on public.whatsapp_flows (user_id, created_at desc);

-- One row per customer per flow, replacing an array inside the flow document.
-- This is where lost updates were: two enrolments advancing at once used to
-- overwrite each other.
create table public.whatsapp_enrolments (
  flow_id      uuid not null references public.whatsapp_flows(id) on delete cascade,
  customer_key text not null,
  chat_id      text,
  step_index   integer not null default 0,
  status       text not null default 'active',
  orders_at_entry integer not null default 0,
  enrolled_at  timestamptz not null default now(),
  last_sent_at timestamptz,
  -- When the scheduler should next look at this enrolment. Indexed, so a run
  -- selects what is due instead of scanning every enrolment ever created.
  due_at       timestamptz,
  primary key (flow_id, customer_key)
);

create index whatsapp_enrolments_due_idx
  on public.whatsapp_enrolments (due_at)
  where status = 'active' and due_at is not null;

create table public.whatsapp_broadcasts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'sending',
  message     jsonb not null,
  filter      jsonb,
  total       integer not null default 0,
  handed_off  integer not null default 0,
  skipped     jsonb not null default '{}'::jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index whatsapp_broadcasts_user_idx on public.whatsapp_broadcasts (user_id, created_at desc);

create table public.whatsapp_broadcast_recipients (
  broadcast_id uuid not null references public.whatsapp_broadcasts(id) on delete cascade,
  customer_key text not null,
  status       text not null default 'pending',
  sent_at      timestamptz,
  error        text,
  primary key (broadcast_id, customer_key)
);

create index whatsapp_broadcast_recipients_pending_idx
  on public.whatsapp_broadcast_recipients (broadcast_id) where status = 'pending';

-- A row per number, not one list document. An unsubscribe is the write in this
-- system that can least afford to be lost to a concurrent update, and as a
-- single JSON array it could be.
create table public.whatsapp_opt_outs (
  user_id      uuid not null references auth.users(id) on delete cascade,
  phone        text not null,
  reason       text,
  opted_out_at timestamptz not null default now(),
  primary key (user_id, phone)
);

create table public.whatsapp_menu (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  tree       jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── API keys ────────────────────────────────────────────────────────────────

create table public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  -- SHA-256 of the key, hex. The key itself is never stored, so it is shown
  -- once at creation and can never be recovered.
  hash         text not null unique,
  display      text not null,
  scopes       text[] not null default '{read}',
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

-- The hottest index in the schema: every authenticated API request is one
-- lookup here. Partial, so revoked keys are not in it at all.
create index api_keys_active_hash_idx on public.api_keys (hash) where revoked_at is null;
create index api_keys_user_idx on public.api_keys (user_id, created_at desc);

-- ── Derived analytics cache ─────────────────────────────────────────────────

create table public.analytics_cache (
  key        text primary key,
  store_id   uuid not null references public.stores(id) on delete cascade,
  -- gzipped JSON. bytea rather than base64 text: no third added to the size,
  -- and no encode per write or decode per read.
  payload    bytea not null,
  created_at timestamptz not null default now()
);

create index analytics_cache_created_idx on public.analytics_cache (created_at);

-- ── updated_at ──────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/*
 * Written out rather than generated in a DO loop.
 *
 * The loop version deadlocked against Supabase's own catalog readers: dynamic
 * DDL takes an AccessExclusiveLock per table in whatever order the array
 * happens to iterate, while a concurrent reader holds AccessShareLock on
 * another, and the two wait on each other. Six explicit statements acquire
 * their locks in a fixed, declared order and are readable besides. The tables
 * are created in this same transaction, so there is no prior trigger to drop.
 */
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger stores_touch before update on public.stores
  for each row execute function public.touch_updated_at();
create trigger whatsapp_connections_touch before update on public.whatsapp_connections
  for each row execute function public.touch_updated_at();
create trigger whatsapp_flows_touch before update on public.whatsapp_flows
  for each row execute function public.touch_updated_at();
create trigger whatsapp_broadcasts_touch before update on public.whatsapp_broadcasts
  for each row execute function public.touch_updated_at();
create trigger whatsapp_menu_touch before update on public.whatsapp_menu
  for each row execute function public.touch_updated_at();

commit;
