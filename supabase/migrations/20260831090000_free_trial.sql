-- 14-day free trial for both Go and Plus.
--
-- The mandate is set up immediately via Razorpay Checkout.js, exactly like a
-- paid subscription today -- the only difference is `start_at` on the
-- Razorpay subscription, which defers the first charge 14 days. Razorpay's
-- own lifecycle for a future-dated start: created -> authenticated (mandate
-- done, nothing charged yet) -> held until start_at -> active (first charge
-- succeeds) or halted (it fails). 'authenticated' is a real Razorpay
-- subscription status, not an invented label -- see
-- src/app/api/billing/webhook/route.ts's new subscription.authenticated case.
--
-- trial_used_at is set exactly once, ever, by that webhook case -- only when
-- a mandate is actually authenticated, never merely by starting checkout --
-- so the trial is a one-time account benefit regardless of how many times a
-- checkout is started and abandoned first. trial_ends_at is the exact
-- start_at this app requested; cleared if that attempt is abandoned.
--
-- The check constraint on subscription_status was added inline with no
-- explicit name in 20260828140000_billing.sql, so Postgres auto-named it --
-- verified against production as `profiles_subscription_status_check`
-- (select conname from pg_constraint where conrelid = 'profiles'::regclass
-- and contype = 'c') rather than assumed, before writing this.
alter table public.profiles drop constraint profiles_subscription_status_check;
alter table public.profiles add constraint profiles_subscription_status_check
  check (subscription_status in ('none', 'created', 'authenticated', 'active', 'past_due', 'halted', 'cancelled'));

alter table public.profiles
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_used_at timestamptz;
