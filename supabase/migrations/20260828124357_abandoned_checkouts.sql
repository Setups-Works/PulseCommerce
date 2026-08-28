-- Abandoned checkout recovery over WhatsApp.
--
-- WooCommerce creates a real order — status pending/on-hold/failed — the
-- instant someone starts checkout, before payment finishes. That order
-- already carries a phone number, a name and the line items, so recovering
-- it needs no new event source, only a way to remember which orders have
-- already been handled: the same still-pending order would otherwise be
-- reconsidered on every five-minute tick until it pays or truly lapses.
--
-- No cart-level tracking here on purpose — WooCommerce exposes no live cart
-- outside WordPress, and reaching one would mean code running inside
-- WordPress itself, which this app cannot deploy to. This catches "started
-- paying, didn't finish", not "added an item, never opened checkout".

create table if not exists public.whatsapp_abandoned_checkouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  woo_order_id bigint not null,
  status       text not null default 'messaged' check (status in ('messaged', 'skipped')),
  -- Set only for a skipped row — no phone, or opted out — so the dashboard
  -- can say why rather than just that nothing happened.
  skip_reason  text,
  messaged_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, woo_order_id)
);

-- The cron tick's hot lookup: "have we already handled this order?", checked
-- once per candidate order on every five-minute run.
create index if not exists whatsapp_abandoned_checkouts_lookup_idx
  on public.whatsapp_abandoned_checkouts (user_id, woo_order_id);

-- Written and read entirely by the server (the cron tick and the dashboard's
-- own API route, both over the owner connection) — no reason for a browser
-- to query this table directly. Same reasoning as analytics_cache and
-- cli_auth_requests.
alter table public.whatsapp_abandoned_checkouts enable row level security;

-- Explicit opt-in per store: the cron tick only makes a live WooCommerce call
-- for stores that turned this on, not every connected store on every tick.
alter table public.stores
  add column if not exists abandoned_checkout_enabled boolean not null default false;

-- ── Schedule ─────────────────────────────────────────────────────────────────
-- Every five minutes, so an order idle for 30 minutes is caught within five
-- minutes of becoming due. Reuses trigger_app_job exactly as defined in
-- 20260811170000_cron.sql — no changes to that function.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'abandoned-checkouts') then
    perform cron.unschedule('abandoned-checkouts');
  end if;
end $$;

select cron.schedule(
  'abandoned-checkouts',
  '*/5 * * * *',
  $$ select public.trigger_app_job('/api/cron/abandoned-checkouts') $$
);
