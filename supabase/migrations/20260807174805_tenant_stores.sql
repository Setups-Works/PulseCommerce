-- Per-tenant store connections.
--
-- This is the migration that makes the product multi-tenant.
--
-- Before it, a store connection lived in one deployment-global key/value entry
-- ("store-config") and `readStoreConfig()` took no argument — there was no way
-- for it to know who was asking. Two customers on one deployment shared a
-- single active store, so the second to connect silently took over the first
-- one's dashboard. Accounts and roles sat on top of that without fixing it.
--
-- Connections now belong to an organization, and row level security is what
-- enforces the boundary rather than application code remembering to filter.
-- A missed `.eq("organization_id", …)` is then a query that returns nothing,
-- not a query that returns somebody else's store.
--
-- Credentials are encrypted before they arrive here, by lib/store/crypto.ts,
-- and this table never sees a plaintext consumer secret. RLS already limits
-- reads to the owning organization, but the service-role key bypasses RLS by
-- design — encryption is what keeps a leaked service key or a database dump
-- from being a set of live credentials to every customer's store.

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,

  -- Normalised, no trailing slash. See normaliseStoreUrl in lib/store/config.ts.
  url text not null,
  name text,

  consumer_key text not null,
  -- AES-256-GCM, base64: iv.ciphertext.tag. Never a plaintext secret.
  consumer_secret_encrypted text not null,

  -- How far back to pull. Cohorts and CLV need real history.
  history_months integer not null default 24 check (history_months between 1 and 120),
  -- Safety valve so a huge store cannot hang the first request.
  max_pages integer not null default 300 check (max_pages between 1 and 5000),

  -- Exactly one active store per organization, enforced by the partial unique
  -- index below rather than by application code.
  is_active boolean not null default false,

  last_synced_at timestamptz,
  connected_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Re-authorising a store must update the row rather than add a second one.
  unique (organization_id, url)
);

create unique index stores_one_active_per_org
  on public.stores (organization_id)
  where is_active;

create index stores_organization_idx on public.stores (organization_id);

select public.attach_updated_at('public.stores');

-- ---------------------------------------------------------------------------
-- Keeping "exactly one active" true
--
-- A partial unique index rejects a second active row, but it cannot deactivate
-- the previous one — so without this trigger, activating store B while store A
-- is active raises a constraint violation instead of switching. Doing it in a
-- trigger rather than in two application statements means the switch is atomic
-- and cannot leave an organization with no active store if the second write
-- fails.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_single_active_store()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active then
    update public.stores
       set is_active = false
     where organization_id = new.organization_id
       and id <> new.id
       and is_active;
  end if;
  return new;
end;
$$;

create trigger enforce_single_active_store
  before insert or update of is_active on public.stores
  for each row when (new.is_active)
  execute function public.enforce_single_active_store();

-- ---------------------------------------------------------------------------
-- The caller's organization
--
-- SECURITY DEFINER for the same reason as public.current_role(): a policy on a
-- table that reads public.users to find the caller's organization would
-- recurse through the policies on public.users itself.
-- ---------------------------------------------------------------------------

create or replace function public.current_organization()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.organization_id
  from public.users u
  where u.id = (select auth.uid())
    and u.is_active
$$;

comment on function public.current_organization is
  'The signed-in user''s organization, or NULL. The tenancy boundary that '
  'every per-tenant policy is written against.';

-- ---------------------------------------------------------------------------
-- Row level security
--
-- No anonymous access at all: unlike the CMS tables, nothing here is ever
-- public. A store connection is the most sensitive row in the database.
-- ---------------------------------------------------------------------------

alter table public.stores enable row level security;

create policy stores_select_own_org on public.stores
  for select to authenticated
  using (organization_id = public.current_organization());

create policy stores_write_own_org on public.stores
  for all to authenticated
  using (organization_id = public.current_organization())
  with check (organization_id = public.current_organization());

-- Support and above can see that a store exists when helping a customer, but
-- not its credentials — the columns are excluded by the view below rather than
-- by hoping every query remembers to omit them.
create policy stores_select_staff on public.stores
  for select to authenticated
  using (public.has_min_role('support'));

create view public.stores_redacted
with (security_invoker = true)
as
  select id, organization_id, url, name, history_months, max_pages,
         is_active, last_synced_at, created_at, updated_at
  from public.stores;

comment on view public.stores_redacted is
  'Store connections without credentials, for support screens. '
  'security_invoker so the querying user''s RLS still applies.';

-- ---------------------------------------------------------------------------
-- Per-tenant WhatsApp gateway
--
-- Same problem, same shape: the gateway configuration was deployment-global,
-- so two customers would have shared one WhatsApp number.
-- ---------------------------------------------------------------------------

create table public.whatsapp_gateways (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,

  -- 'self_hosted' today. 'cloud_api' once that integration exists — the
  -- onboarding screen says so rather than offering a route that does not work.
  provider text not null default 'self_hosted' check (provider in ('self_hosted', 'cloud_api')),

  base_url text,
  -- Encrypted, as with store credentials.
  api_token_encrypted text,
  phone_number text,

  is_connected boolean not null default false,
  last_checked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.attach_updated_at('public.whatsapp_gateways');

alter table public.whatsapp_gateways enable row level security;

create policy whatsapp_gateways_own_org on public.whatsapp_gateways
  for all to authenticated
  using (organization_id = public.current_organization())
  with check (organization_id = public.current_organization());

-- ---------------------------------------------------------------------------
-- An organization per signup
--
-- Previously every account joined the single seeded organization, which would
-- have put every customer in one tenant — the same bug one level up. Each
-- signup now gets its own, except staff, who join the platform's own.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_first boolean;
  target_org uuid;
  new_role public.app_role;
begin
  select not exists (select 1 from public.users) into is_first;
  new_role := case when is_first then 'admin'::public.app_role else 'customer'::public.app_role end;

  if new_role = 'customer' then
    -- A tenant of their own. The slug is derived from the user id rather than
    -- the email, because an email can change and a slug is a permanent handle.
    insert into public.organizations (slug, name)
    values ('org-' || replace(new.id::text, '-', ''), coalesce(new.email, 'New organization'))
    returning id into target_org;
  else
    select id into target_org from public.organizations order by created_at limit 1;
  end if;

  insert into public.users (id, organization_id, email, full_name, avatar_url, role)
  values (
    new.id,
    target_org,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    new_role
  );

  return new;
end;
$$;
