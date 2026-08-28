-- Monthly subscription billing: two plans (Go, Plus), Razorpay Subscriptions
-- with UPI Autopay, and the usage counter that enforces Go's message cap.
--
-- Plan state lives on profiles, not stores — WhatsApp identity in this app is
-- per-user (see whatsapp_connections, whatsapp_opt_outs), so a subscription
-- is a property of the person, not any one connected shop.
--
-- ── Rollout safety ──────────────────────────────────────────────────────────
-- Every profile that exists before this migration ran without any concept of
-- a plan and must not be silently cut off the moment this ships — the same
-- reasoning as abandoned_checkout_enabled_at: a feature turning on must never
-- sweep up a backlog it didn't create. legacy_unlimited is backfilled true
-- for every existing row and defaults false from here on, so only accounts
-- created after this migration are ever asked to subscribe before sending.

alter table public.profiles
  add column if not exists plan text check (plan in ('go', 'plus')),
  add column if not exists subscription_status text not null default 'none'
    check (subscription_status in ('none', 'created', 'active', 'past_due', 'halted', 'cancelled')),
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_subscription_id text,
  add column if not exists current_period_end timestamptz,
  -- Set on payment.failed, cleared on the next successful charge. Sends stay
  -- allowed up to this deadline (see src/lib/billing/usage.ts) — a dunning
  -- grace window, not an instant cutoff on the first bounced UPI debit.
  add column if not exists grace_until timestamptz,
  add column if not exists legacy_unlimited boolean not null default false;

update public.profiles set legacy_unlimited = true where legacy_unlimited = false;

create index if not exists profiles_razorpay_subscription_idx
  on public.profiles (razorpay_subscription_id) where razorpay_subscription_id is not null;

-- ── Usage, per calendar month ────────────────────────────────────────────────
-- A row per (user, month) rather than one running counter that gets reset in
-- place: "reset usage on renewal" is then just the next period's row starting
-- at zero, no past month is ever overwritten, and two concurrent increments
-- (a broadcast tick and a flow tick landing at the same moment) both land
-- safely via the upsert below rather than racing a read-modify-write.

create table if not exists public.whatsapp_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  period     text not null, -- 'YYYY-MM', UTC
  sent_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table public.whatsapp_usage enable row level security;

comment on table public.whatsapp_usage is
  'Written and read entirely by the server (every WhatsApp send path calls '
  'src/lib/billing/usage.ts), no reason for a browser to query this directly.';

-- ── Invoices ──────────────────────────────────────────────────────────────

create table if not exists public.billing_invoices (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  razorpay_invoice_id text unique,
  razorpay_payment_id text,
  plan                text not null check (plan in ('go', 'plus')),
  amount_paise        integer not null,
  currency            text not null default 'INR',
  status              text not null default 'paid' check (status in ('paid', 'failed', 'refunded')),
  period_start        timestamptz not null,
  period_end          timestamptz not null,
  paid_at             timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists billing_invoices_user_idx
  on public.billing_invoices (user_id, paid_at desc);

alter table public.billing_invoices enable row level security;

-- ── Webhook idempotency ─────────────────────────────────────────────────────
-- Razorpay delivers at-least-once and a retried delivery is byte-identical,
-- so the raw request body's hash is the dedupe key rather than trusting any
-- single field inside the payload to be a stable, unique event id.

create table if not exists public.billing_webhook_events (
  id          uuid primary key default gen_random_uuid(),
  body_hash   text not null unique,
  event_type  text not null,
  received_at timestamptz not null default now()
);

alter table public.billing_webhook_events enable row level security;

comment on table public.billing_webhook_events is
  'Written and read entirely by the Razorpay webhook route, keyed on a hash '
  'of the raw request body, so a retried delivery is a no-op.';
