-- Subscriptions and entitlements.
--
-- Before this, `pricing_plans` was marketing copy: three cards on a page with
-- nothing behind them. A customer on Starter could connect three stores and
-- pull unlimited history, because no code had any idea which tier they were
-- on.
--
-- Two tables, deliberately separate:
--
--   plan_entitlements — what a tier *allows*. Keyed to pricing_plans.slug, so
--     the limits and the marketing copy cannot describe different products.
--   subscriptions     — which tier an organization is *on*, and until when.
--
-- Limits are columns rather than a jsonb blob. A blob is easy to write and
-- impossible to query: "which organizations are over their store limit" is a
-- join here and a full scan with application-side parsing there.
--
-- NULL means unlimited, throughout. It reads better than a sentinel like -1
-- and it is what a SQL comparison already treats as "no answer", so a limit
-- check that forgets to handle it fails open rather than locking a paying
-- customer out — the right direction for that particular bug.

create table public.plan_entitlements (
  plan_slug text primary key references public.pricing_plans (slug) on delete cascade,

  max_stores integer check (max_stores is null or max_stores > 0),
  max_orders integer check (max_orders is null or max_orders > 0),
  max_history_months integer check (max_history_months is null or max_history_months > 0),
  max_team_members integer check (max_team_members is null or max_team_members > 0),
  max_messages_per_month integer check (max_messages_per_month is null or max_messages_per_month >= 0),

  -- Feature switches, as opposed to quantity limits.
  ai_assistant boolean not null default true,
  automated_flows boolean not null default true,
  api_access boolean not null default true,
  priority_support boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.attach_updated_at('public.plan_entitlements');

alter table public.plan_entitlements enable row level security;

-- Readable by anyone: these are the limits advertised on the pricing page.
create policy plan_entitlements_select_public on public.plan_entitlements
  for select to anon, authenticated using (true);

create policy plan_entitlements_write_admin on public.plan_entitlements
  for all to authenticated
  using (public.has_min_role('admin'))
  with check (public.has_min_role('admin'));

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired'
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  -- One live subscription per organization. A second row for the same tenant
  -- would make "which plan are they on" ambiguous at exactly the moment it
  -- matters, so the constraint is here rather than in application code.
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  plan_slug text not null references public.pricing_plans (slug),

  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,

  -- Set once a payment provider is wired up. Nullable because the product is
  -- usable before billing exists, and a NOT NULL here would block that.
  provider text,
  provider_customer_id text,
  provider_subscription_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);

select public.attach_updated_at('public.subscriptions');

alter table public.subscriptions enable row level security;

create policy subscriptions_select_own_org on public.subscriptions
  for select to authenticated
  using (organization_id = public.current_organization());

-- Customers may not edit their own subscription — that is what a payment
-- provider webhook is for. Staff can, for support.
create policy subscriptions_select_staff on public.subscriptions
  for select to authenticated using (public.has_min_role('support'));

create policy subscriptions_write_admin on public.subscriptions
  for all to authenticated
  using (public.has_min_role('admin'))
  with check (public.has_min_role('admin'));

-- ---------------------------------------------------------------------------
-- The entitlements a caller actually has
--
-- One function rather than a join repeated at every call site, and SECURITY
-- DEFINER so it can read plan_entitlements for the caller's plan without
-- needing a policy that exposes every organization's subscription.
--
-- An organization with no subscription row falls back to the trial tier, so a
-- signup that predates billing is not locked out of its own product.
-- ---------------------------------------------------------------------------

create or replace function public.current_entitlements()
returns table (
  plan_slug text,
  status public.subscription_status,
  is_active boolean,
  max_stores integer,
  max_orders integer,
  max_history_months integer,
  max_team_members integer,
  max_messages_per_month integer,
  ai_assistant boolean,
  automated_flows boolean,
  api_access boolean,
  priority_support boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(s.plan_slug, 'growth') as plan_slug,
    coalesce(s.status, 'trialing'::public.subscription_status) as status,
    -- Trialing counts as active until the trial actually ends. past_due does
    -- too: locking a customer out the hour a card fails loses more than the
    -- invoice is worth, and dunning is the payment provider's job.
    coalesce(
      s.status in ('active', 'past_due')
      or (s.status = 'trialing' and (s.trial_ends_at is null or s.trial_ends_at > now())),
      true
    ) as is_active,
    e.max_stores, e.max_orders, e.max_history_months,
    e.max_team_members, e.max_messages_per_month,
    coalesce(e.ai_assistant, true), coalesce(e.automated_flows, true),
    coalesce(e.api_access, true), coalesce(e.priority_support, false)
  from (select public.current_organization() as org) ctx
  left join public.subscriptions s on s.organization_id = ctx.org
  left join public.plan_entitlements e on e.plan_slug = coalesce(s.plan_slug, 'growth')
$$;

comment on function public.current_entitlements is
  'The caller''s plan limits. Falls back to the growth tier on a trial when '
  'no subscription row exists, so accounts created before billing keep working.';

-- ---------------------------------------------------------------------------
-- Enforcement in the database
--
-- The store limit is checked here as well as in the UI. The UI check is what
-- gives a good error message; this is what makes the limit true — a customer
-- who finds the API, or a bug that skips the service layer, still cannot
-- exceed it.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_store_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed integer;
  used integer;
begin
  select e.max_stores into allowed
  from public.subscriptions s
  join public.plan_entitlements e on e.plan_slug = s.plan_slug
  where s.organization_id = new.organization_id;

  -- No subscription, or an unlimited tier.
  if allowed is null then return new; end if;

  select count(*) into used
  from public.stores
  where organization_id = new.organization_id
    and id <> new.id;

  if used >= allowed then
    raise exception 'Store limit reached for this plan (% of %). Upgrade to connect another.',
      used, allowed
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger enforce_store_limit
  before insert on public.stores
  for each row execute function public.enforce_store_limit();

-- ---------------------------------------------------------------------------
-- Seed: limits matching the tiers already on the pricing page
-- ---------------------------------------------------------------------------

insert into public.plan_entitlements (
  plan_slug, max_stores, max_orders, max_history_months, max_team_members,
  ai_assistant, automated_flows, api_access, priority_support
)
values
  ('starter',     1, 2000,  12, 2,  true, true, true, false),
  ('growth',      3, 50000, 36, 10, true, true, true, true),
  ('self-hosted', null, null, null, null, true, true, true, false)
on conflict (plan_slug) do nothing;
