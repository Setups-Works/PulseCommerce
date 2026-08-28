-- Marks *when* abandoned-checkout recovery was turned on, so a store with an
-- existing backlog of old pending orders never gets them all messaged at
-- once the moment the switch is flipped. Only orders created after this
-- timestamp are ever considered — see /api/cron/abandoned-checkouts.
alter table public.stores
  add column if not exists abandoned_checkout_enabled_at timestamptz;
