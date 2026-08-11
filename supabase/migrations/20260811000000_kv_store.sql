-- The analytics cache.
--
-- This is the whole schema. PulseCommerce is a single-tenant, self-hosted
-- WooCommerce analytics tool: it has no accounts, no tenants and no CMS, so
-- there is nothing else for the database to hold.
--
-- What Supabase is for here is narrow and specific. Every figure in the
-- product derives from one cached snapshot of the store's order history, and
-- pulling that history takes minutes on a large store. Serverless platforms
-- have a read-only filesystem and start every instance empty, so without
-- shared storage each cold start re-pulls everything — slow for the merchant,
-- and enough sustained traffic that a store's security layer starts refusing
-- requests.
--
-- One table, addressed by key, holding whatever the application puts there:
-- the issued WooCommerce credentials, the gzipped snapshot chunks, and the
-- derived analytics results. It implements the KeyValueStore interface in
-- src/lib/store/kv.ts, which also has filesystem and Redis backends — this is
-- a third, not a new concept.

create table if not exists public.kv_store (
  key text primary key,
  value text not null,
  -- Bytes stored, so a cached snapshot's size is visible without reading it.
  size_bytes integer generated always as (octet_length(value)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kv_store_updated_at_idx on public.kv_store (updated_at desc);

create or replace function public.kv_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kv_store_updated_at on public.kv_store;
create trigger kv_store_updated_at
  before update on public.kv_store
  for each row execute function public.kv_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Access
--
-- Row level security is enabled with no policies at all, which denies every
-- request made with the anon or authenticated key. That is deliberate rather
-- than an omission: this table holds the issued WooCommerce consumer secret
-- and a full copy of the store's order history, and no browser client in this
-- product has any business reading either.
--
-- The application reaches it with the service-role key, server-side only,
-- which bypasses RLS. The rule is simply: nothing in a browser can read this
-- table, ever.
-- ---------------------------------------------------------------------------

alter table public.kv_store enable row level security;

comment on table public.kv_store is
  'Durable cache for the WooCommerce snapshot, credentials and derived '
  'analytics. RLS is on with no policies, so only the service-role key can '
  'reach it. Never expose this to a browser client.';
