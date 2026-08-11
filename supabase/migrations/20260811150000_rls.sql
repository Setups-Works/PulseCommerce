-- Row level security: a user reaches their own rows and nothing else.
--
-- This is the isolation boundary for the whole product. It is written in the
-- database rather than in queries because a missing `where user_id = ...` in
-- one handler out of dozens is a cross-tenant leak, and code review is not a
-- reliable way to catch the one that was forgotten. With these policies, a
-- query that forgets to scope simply returns nothing.
--
-- ── Two paths, secured differently ──────────────────────────────────────────
--
-- The browser reaches Postgres through PostgREST carrying the user's own JWT,
-- so `auth.uid()` is their id and these policies apply.
--
-- The server reaches it through the transaction pooler as the table owner.
-- Table owners bypass RLS. That is deliberate and necessary — the WooCommerce
-- callback and the scheduler have no user session — and it means server code
-- must scope by user_id itself. The application does that in one place, by
-- resolving a tenant per request, rather than at each query.
--
-- ── Why `select auth.uid()` and not `auth.uid()` ────────────────────────────
--
-- Wrapping it in a subselect lets Postgres evaluate it once per statement
-- instead of once per row. On a table with tens of thousands of orders that is
-- the difference between an index scan and a per-row function call.

-- ── Ownership helpers ───────────────────────────────────────────────────────
-- The mirrored tables carry store_id, not user_id. Rather than repeating the
-- join in a dozen policies, ownership is one stable function.

create or replace function public.owns_store(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stores s
    where s.id = target and s.user_id = (select auth.uid())
  );
$$;

comment on function public.owns_store is
  'True when the current user owns the given store. security definer so the '
  'lookup is not itself filtered by the policy on stores, which would recurse.';

create or replace function public.owns_flow(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.whatsapp_flows f
    where f.id = target and f.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_broadcast(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.whatsapp_broadcasts b
    where b.id = target and b.user_id = (select auth.uid())
  );
$$;

-- ── Enable RLS everywhere ───────────────────────────────────────────────────
-- Every table, including ones with no policy. A table with RLS on and no
-- policy denies everyone, which is the correct default for anything reachable
-- over PostgREST that has not been thought about yet.

alter table public.profiles                      enable row level security;
alter table public.stores                        enable row level security;
alter table public.woo_orders                    enable row level security;
alter table public.woo_order_items               enable row level security;
alter table public.woo_customers                 enable row level security;
alter table public.woo_products                  enable row level security;
alter table public.woo_sync_runs                 enable row level security;
alter table public.whatsapp_connections          enable row level security;
alter table public.whatsapp_flows                enable row level security;
alter table public.whatsapp_enrolments           enable row level security;
alter table public.whatsapp_broadcasts           enable row level security;
alter table public.whatsapp_broadcast_recipients enable row level security;
alter table public.whatsapp_opt_outs             enable row level security;
alter table public.whatsapp_menu                 enable row level security;
alter table public.api_keys                      enable row level security;
alter table public.analytics_cache               enable row level security;

-- ── Profiles ────────────────────────────────────────────────────────────────
-- Readable and updatable by the person it describes. No insert policy: rows
-- are created by the on_auth_user_created trigger, and no delete policy:
-- profiles disappear with the auth user via the cascade.

create policy profiles_select_own on public.profiles
  for select using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ── Stores ──────────────────────────────────────────────────────────────────
-- Full control over your own. `with check` as well as `using` on update, so a
-- row cannot be handed to another user by rewriting its user_id.

create policy stores_all_own on public.stores
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── The mirror ──────────────────────────────────────────────────────────────
-- Read-only to the browser. This data is written by the sync engine over the
-- owner connection; nothing a user does should insert an order.

create policy woo_orders_select_own on public.woo_orders
  for select using (public.owns_store(store_id));

create policy woo_order_items_select_own on public.woo_order_items
  for select using (public.owns_store(store_id));

create policy woo_customers_select_own on public.woo_customers
  for select using (public.owns_store(store_id));

create policy woo_products_select_own on public.woo_products
  for select using (public.owns_store(store_id));

create policy woo_sync_runs_select_own on public.woo_sync_runs
  for select using (public.owns_store(store_id));

-- ── WhatsApp ────────────────────────────────────────────────────────────────

create policy whatsapp_connections_all_own on public.whatsapp_connections
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy whatsapp_flows_all_own on public.whatsapp_flows
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy whatsapp_enrolments_all_own on public.whatsapp_enrolments
  for all using (public.owns_flow(flow_id))
  with check (public.owns_flow(flow_id));

create policy whatsapp_broadcasts_all_own on public.whatsapp_broadcasts
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy whatsapp_broadcast_recipients_all_own on public.whatsapp_broadcast_recipients
  for all using (public.owns_broadcast(broadcast_id))
  with check (public.owns_broadcast(broadcast_id));

create policy whatsapp_opt_outs_all_own on public.whatsapp_opt_outs
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy whatsapp_menu_all_own on public.whatsapp_menu
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── API keys ────────────────────────────────────────────────────────────────
-- Select and delete only. Creating a key has to hash it and return the
-- plaintext exactly once, which a direct insert from a browser cannot do — so
-- there is no insert policy and the API route is the only way to mint one.
--
-- Note what is not protected here: `hash` is selectable by its owner. That is
-- a digest of a 32-byte random value, so it is not a route back to the key.

create policy api_keys_select_own on public.api_keys
  for select using (user_id = (select auth.uid()));

create policy api_keys_delete_own on public.api_keys
  for delete using (user_id = (select auth.uid()));

-- ── Analytics cache ─────────────────────────────────────────────────────────
-- No policies at all. It is written and read by the server over the owner
-- connection, and there is no reason for a browser to touch it directly.
-- RLS is on, so PostgREST sees nothing.
