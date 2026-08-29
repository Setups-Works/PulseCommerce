-- WhatsApp order-confirmation messages.
--
-- Unlike abandoned-checkout recovery (a live poll every five minutes), this
-- reacts to a genuine WooCommerce order.created webhook, registered per
-- store the moment a merchant turns the feature on (see
-- src/app/api/whatsapp/order-confirmations/route.ts) and delivered to
-- src/app/api/webhooks/woo/[storeId]/order-created/route.ts within seconds
-- of a real order being placed.
--
-- Dedup key is (store_id, woo_order_id), not (user_id, woo_order_id) like
-- whatsapp_abandoned_checkouts uses: a WooCommerce order id is only unique
-- per store, and one user can have more than one connected store.

create table if not exists public.whatsapp_order_confirmations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  store_id     uuid not null references public.stores(id) on delete cascade,
  woo_order_id bigint not null,
  status       text not null check (status in ('sent', 'skipped')),
  -- Set only for a skipped row, so the dashboard can say why.
  skip_reason  text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (store_id, woo_order_id)
);

-- The webhook route's hot lookup: "have we already handled this order?",
-- checked on every delivery (including WooCommerce redeliveries).
create index if not exists whatsapp_order_confirmations_lookup_idx
  on public.whatsapp_order_confirmations (store_id, woo_order_id);

-- Written and read entirely by the server (the webhook route and the
-- dashboard's own API route, both over the owner connection) — same
-- reasoning as whatsapp_abandoned_checkouts.
alter table public.whatsapp_order_confirmations enable row level security;

-- order_confirmation_webhook_id / _secret let the toggle route delete the
-- right WooCommerce webhook resource on disable, and let the public webhook
-- route verify each store's HMAC independently (no shared global secret).
--
-- order_confirmation_enabled_at is defense in depth against WooCommerce
-- redelivering a queued event after downtime, or after a disable/re-enable
-- cycle recreates the webhook — not a backlog-sweep concern the way
-- abandoned_checkout_enabled_at is, since a webhook only ever fires on
-- genuinely new orders, but cheap insurance against a stale replay.
alter table public.stores
  add column if not exists order_confirmation_enabled boolean not null default false,
  add column if not exists order_confirmation_enabled_at timestamptz,
  add column if not exists order_confirmation_webhook_id bigint,
  add column if not exists order_confirmation_webhook_secret text;
