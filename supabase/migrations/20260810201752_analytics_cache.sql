-- Analytics cache, and the removal of the SaaS schema.
--
-- The product is a single-tenant, self-hosted WooCommerce analytics tool. It
-- has no accounts, no tenants and no CMS; the earlier migrations built all
-- three for a direction the project is not taking, and leaving them would mean
-- a database whose shape contradicts the application.
--
-- What Supabase is for here is narrower and more useful: durable, shared
-- storage so the order snapshot survives a cold start.
--
-- The problem it solves is real. Every analytics figure derives from one
-- cached snapshot of the store's order history, and pulling that history takes
-- minutes on a large store. On a serverless platform the filesystem is
-- read-only and each instance starts empty, so without shared storage every
-- cold lambda re-pulls everything — slow for the merchant, and enough
-- sustained traffic that a store's security layer starts refusing requests.
--
-- One table, addressed by key, holding whatever the application puts there:
-- the issued WooCommerce credentials and the gzipped snapshot chunks. It
-- implements the KeyValueStore interface in src/lib/store/kv.ts, which already
-- has filesystem and Redis backends — this is a third, not a new concept.

-- ---------------------------------------------------------------------------
-- Remove the SaaS schema
--
-- Dropped in dependency order, with `if exists` throughout so this migration
-- is safe against a database that never had them.
-- ---------------------------------------------------------------------------

drop table if exists public.audit_logs cascade;
drop table if exists public.api_keys cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.plan_entitlements cascade;
drop table if exists public.whatsapp_gateways cascade;
drop table if exists public.stores cascade;

drop view if exists public.stores_redacted cascade;

drop table if exists public.seo_entries cascade;
drop table if exists public.release_notes cascade;
drop table if exists public.blog_posts cascade;
drop table if exists public.pages cascade;
drop table if exists public.integrations cascade;
drop table if exists public.company cascade;
drop table if exists public.popups cascade;
drop table if exists public.announcements cascade;
drop table if exists public.footer_links cascade;
drop table if exists public.navigation cascade;
drop table if exists public.partners cascade;
drop table if exists public.testimonials cascade;
drop table if exists public.faqs cascade;
drop table if exists public.pricing_plans cascade;
drop table if exists public.analytics_modules cascade;
drop table if exists public.features cascade;
drop table if exists public.hero_sections cascade;
drop table if exists public.landing_settings cascade;
drop table if exists public.settings cascade;
drop table if exists public.media cascade;

drop table if exists public.users cascade;
drop table if exists public.organizations cascade;

-- The signup trigger fired on every auth.users insert; without public.users to
-- write into it would raise on any future signup.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

drop function if exists public.current_entitlements() cascade;
drop function if exists public.enforce_store_limit() cascade;
drop function if exists public.enforce_single_active_store() cascade;
drop function if exists public.current_organization() cascade;
drop function if exists public.guard_user_privileges() cascade;
drop function if exists public.apply_content_rls(regclass) cascade;
drop function if exists public.add_content_columns(regclass) cascade;
drop function if exists public.is_staff() cascade;
drop function if exists public.has_min_role(public.app_role) cascade;
drop function if exists public.current_role() cascade;

drop type if exists public.subscription_status cascade;
drop type if exists public.media_kind cascade;
drop type if exists public.content_status cascade;
drop type if exists public.app_role cascade;

-- ---------------------------------------------------------------------------
-- The cache
-- ---------------------------------------------------------------------------

create table if not exists public.kv_store (
  key text primary key,
  value text not null,
  -- Bytes stored, so a snapshot's size can be seen without reading it back.
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
-- and a full copy of the store's order history, and there is no browser client
-- in this product that has any business reading either.
--
-- The application reaches it with the service-role key, server-side only,
-- which bypasses RLS. So the rule is simply: nothing in a browser can read
-- this table, ever.
-- ---------------------------------------------------------------------------

alter table public.kv_store enable row level security;

comment on table public.kv_store is
  'Durable cache for the WooCommerce snapshot and credentials. RLS is on with '
  'no policies, so only the service-role key can reach it. Never expose this '
  'to a browser client.';
