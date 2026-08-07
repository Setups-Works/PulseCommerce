-- Foundation: enums, tenancy, identity, RBAC helpers, audit log.
--
-- Design notes that the rest of the schema depends on:
--
--   * Roles are an ordered enum, and every policy is written against
--     `public.has_min_role(...)` rather than an equality check. Adding a role
--     between two existing ones then needs one migration here rather than an
--     edit to every policy in the database.
--
--   * The role lookup lives in a SECURITY DEFINER function, not an inline
--     sub-select. A policy on `public.users` that reads `public.users` to find
--     the caller's role recurses forever; a definer function reads it with RLS
--     bypassed and breaks the cycle. `search_path` is pinned on every one of
--     them, because a definer function with a mutable search_path is a
--     privilege-escalation hole.
--
--   * This CMS drives one public marketing site. `organizations` exists and
--     users belong to one, but content tables are deliberately NOT org-scoped:
--     scoping them would put an identical join in every policy and buy nothing
--     until there is genuinely a second site to serve.

create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Ascending privilege. `has_min_role` compares on this order, so the
-- declaration order IS the hierarchy — inserting a role in the middle later
-- needs `alter type ... add value ... before ...`, not a rewrite of policies.
--
-- The important boundary is between `customer` and `viewer`:
--
--   customer — a SaaS customer. Signs up, connects their WooCommerce store,
--              uses the product at /dashboard. Has no access to /admin at all.
--   viewer   — the first staff role. Read-only access to the admin panel.
--
-- `public.is_staff()` is defined as `has_min_role('viewer')`, so a customer is
-- never staff, and no content or admin policy needs to special-case them.
create type public.app_role as enum (
  'customer',
  'viewer',
  'support',
  'editor',
  'admin'
);

create type public.content_status as enum ('draft', 'published', 'archived');

create type public.media_kind as enum ('image', 'video', 'document');

-- ---------------------------------------------------------------------------
-- Shared triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Maintains updated_at on write. Attached by public.attach_updated_at().';

-- Applying the trigger by hand on twenty tables is twenty chances to forget.
create or replace function public.attach_updated_at(target regclass)
returns void
language plpgsql
as $$
begin
  execute format(
    'create trigger set_updated_at before update on %s
       for each row execute function public.set_updated_at()',
    target
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.attach_updated_at('public.organizations');

-- ---------------------------------------------------------------------------
-- Users
--
-- A profile row mirroring auth.users, carrying the role. Kept separate from
-- auth.users because that table belongs to Supabase and adding columns to it
-- is not upgrade-safe.
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  email text not null,
  full_name text,
  avatar_url text,
  -- Signups are SaaS customers by default. Staff are promoted deliberately.
  role public.app_role not null default 'customer',
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_organization_id_idx on public.users (organization_id);
create index users_role_idx on public.users (role);

select public.attach_updated_at('public.users');

-- ---------------------------------------------------------------------------
-- RBAC helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select u.role
  from public.users u
  where u.id = (select auth.uid())
    and u.is_active
$$;

comment on function public.current_role is
  'The signed-in user''s role, or NULL when signed out or deactivated. '
  'SECURITY DEFINER so policies on public.users can call it without recursing.';

-- The enum's declaration order is the hierarchy, so comparison is the check.
create or replace function public.has_min_role(minimum public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role() >= minimum, false)
$$;

comment on function public.has_min_role is
  'True when the caller holds `minimum` or higher. Relies on app_role being '
  'declared in ascending order of privilege.';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_min_role('viewer')
$$;

-- ---------------------------------------------------------------------------
-- New signups
--
-- Every auth.users row gets a profile. The first account becomes `admin` so a
-- fresh deployment is not locked out of its own admin panel; every later one
-- is a `customer` and has to be promoted to staff deliberately.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_first boolean;
  default_org uuid;
begin
  select not exists (select 1 from public.users) into is_first;
  select id into default_org from public.organizations order by created_at limit 1;

  insert into public.users (id, organization_id, email, full_name, avatar_url, role)
  values (
    new.id,
    default_org,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    case when is_first then 'admin'::public.app_role else 'customer'::public.app_role end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.users (id) on delete set null,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.audit_logs enable row level security;

-- Organizations: readable by any staff member, written by admins.
create policy organizations_select_staff on public.organizations
  for select to authenticated using (public.is_staff());

create policy organizations_write_admin on public.organizations
  for all to authenticated
  using (public.has_min_role('admin'))
  with check (public.has_min_role('admin'));

-- Users: everyone signed in sees their own row; staff see the directory.
create policy users_select_self on public.users
  for select to authenticated using (id = (select auth.uid()));

create policy users_select_staff on public.users
  for select to authenticated using (public.is_staff());

-- A user may edit their own profile, but not their own role or active flag —
-- that is enforced by the trigger below rather than in the policy, because a
-- WITH CHECK clause cannot see the previous row to compare against.
create policy users_update_self on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy users_manage_admin on public.users
  for all to authenticated
  using (public.has_min_role('admin'))
  with check (public.has_min_role('admin'));

create or replace function public.guard_user_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Admins may change anything they can see; everyone else is editing their
  -- own profile and must not be able to grant themselves a role.
  if public.has_min_role('admin') then
    -- Demoting the last admin would leave nobody able to promote anyone,
    -- locking the deployment out of its own user management permanently.
    if old.role = 'admin' and new.role <> 'admin'
       and (select count(*) from public.users where role = 'admin' and is_active) <= 1 then
      raise exception 'Cannot demote the last admin';
    end if;
    -- Deactivating is demotion by another route, and locks the door just as
    -- effectively.
    if old.is_active and not new.is_active and old.role = 'admin'
       and (select count(*) from public.users where role = 'admin' and is_active) <= 1 then
      raise exception 'Cannot deactivate the last admin';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only an admin may change a role';
  end if;
  if new.is_active is distinct from old.is_active then
    raise exception 'Only an admin may activate or deactivate an account';
  end if;
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Only an admin may move an account between organizations';
  end if;

  return new;
end;
$$;

create trigger guard_user_privileges
  before update on public.users
  for each row execute function public.guard_user_privileges();

-- Audit logs: readable by admins, append-only, never updated or deleted.
create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated using (public.has_min_role('admin'));

create policy audit_logs_insert_staff on public.audit_logs
  for insert to authenticated with check (public.is_staff());
