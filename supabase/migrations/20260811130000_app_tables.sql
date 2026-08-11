-- Everything the key-value store used to hold, as tables.
--
-- What was wrong with the blobs
-- -----------------------------
-- Each of these lived as one JSON document under a string key: every flow in
-- `whatsapp-flow-index`, every broadcast in `whatsapp-broadcast-index`, the
-- whole opt-out list in `whatsapp-opt-out`. Three consequences, all of which
-- this fixes:
--
--   Lost updates. Changing one flow meant read the document, edit it in
--   memory, write it back. Two requests overlapping means the second silently
--   discards the first — which for the opt-out list means honouring an
--   unsubscribe and then losing it.
--
--   No queries. "Which broadcasts failed this week" had to load every
--   broadcast ever sent and filter in JavaScript.
--
--   Whole-document writes. Advancing one enrolment rewrote every flow.
--
-- Access
-- ------
-- RLS on, no policies. The application connects as the table owner over the
-- pooler, which RLS does not apply to; PostgREST with an anon or authenticated
-- key reaches none of it. These tables hold the WooCommerce consumer secret,
-- the WhatsApp gateway key and customer phone numbers.

-- ── The connected WooCommerce store ─────────────────────────────────────────

create table if not exists public.store_config (
  store_url        text primary key,
  name             text,
  -- WooCommerce REST credentials. Reachable only by the owner role; see the
  -- note above. The consumer secret grants read/write to the merchant's store.
  consumer_key     text not null,
  consumer_secret  text not null,
  history_months   integer not null default 12,
  max_pages        integer not null default 100,
  -- Exactly one row may be active. The partial unique index below enforces it
  -- in the database rather than trusting every write path to remember.
  is_active        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists store_config_single_active_idx
  on public.store_config ((true)) where is_active;

-- ── API keys ────────────────────────────────────────────────────────────────

create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  -- Null when the key predates accounts, or was issued by the owner rather
  -- than on behalf of a person. Not a foreign key to auth.users: deleting a
  -- person must not silently delete the integrations they set up.
  user_id       uuid,
  name          text not null,
  -- SHA-256 of the key, hex. The key itself is never stored, so it can be
  -- shown exactly once and never recovered.
  hash          text not null unique,
  display       text not null,
  scopes        text[] not null default '{read}',
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

-- Verification looks a key up by digest on every authenticated request, so
-- this is the hottest index in the schema. Partial: revoked keys never match.
create index if not exists api_keys_active_hash_idx
  on public.api_keys (hash) where revoked_at is null;

-- ── WhatsApp gateway ────────────────────────────────────────────────────────

create table if not exists public.whatsapp_config (
  id             boolean primary key default true check (id),
  base_url       text,
  api_key        text,
  session_id     text,
  dial_code      text,
  send_delay_ms  integer,
  updated_at     timestamptz not null default now()
);

comment on column public.whatsapp_config.id is
  'Always true. A one-row table: the check constraint and the primary key '
  'together make a second row impossible, which is cheaper than remembering '
  'to write "where id = 1" everywhere.';

-- ── Flows ───────────────────────────────────────────────────────────────────

create table if not exists public.whatsapp_flows (
  id            text primary key,
  name          text not null,
  status        text not null default 'draft',
  -- Steps and the entry filter stay as jsonb: they are a nested,
  -- fast-changing shape that is always read and written whole, and nothing
  -- queries inside them. The rows below are the parts that are queried.
  definition    jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One row per customer per flow, replacing an array inside the flow document.
-- This is where the lost updates were: two enrolments advancing at once used
-- to overwrite each other.
create table if not exists public.whatsapp_enrolments (
  flow_id        text not null references public.whatsapp_flows(id) on delete cascade,
  customer_key   text not null,
  step_index     integer not null default 0,
  status         text not null default 'active',
  enrolled_at    timestamptz not null default now(),
  last_sent_at   timestamptz,
  -- When the scheduler should next look at this enrolment. Indexed, so a run
  -- selects only what is due instead of scanning every enrolment.
  next_due_at    timestamptz,
  meta           jsonb not null default '{}'::jsonb,
  primary key (flow_id, customer_key)
);

create index if not exists whatsapp_enrolments_due_idx
  on public.whatsapp_enrolments (next_due_at)
  where status = 'active' and next_due_at is not null;

-- ── Broadcasts ──────────────────────────────────────────────────────────────

create table if not exists public.whatsapp_broadcasts (
  id             text primary key,
  status         text not null default 'sending',
  message        jsonb not null,
  filter         jsonb,
  total          integer not null default 0,
  handed_off     integer not null default 0,
  skipped        jsonb not null default '{}'::jsonb,
  error          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists whatsapp_broadcasts_created_idx
  on public.whatsapp_broadcasts (created_at desc);

create table if not exists public.whatsapp_broadcast_recipients (
  broadcast_id   text not null references public.whatsapp_broadcasts(id) on delete cascade,
  customer_key   text not null,
  status         text not null default 'pending',
  sent_at        timestamptz,
  error          text,
  primary key (broadcast_id, customer_key)
);

create index if not exists whatsapp_broadcast_recipients_pending_idx
  on public.whatsapp_broadcast_recipients (broadcast_id)
  where status = 'pending';

-- ── Opt-outs ────────────────────────────────────────────────────────────────
-- A row per person rather than one list document. An unsubscribe is the one
-- write in this system that must never be lost to a concurrent update, and as
-- a single document it could be.

create table if not exists public.whatsapp_opt_outs (
  phone        text primary key,
  reason       text,
  opted_out_at timestamptz not null default now()
);

-- ── Menu ────────────────────────────────────────────────────────────────────

create table if not exists public.whatsapp_menu (
  id         boolean primary key default true check (id),
  tree       jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── Derived analytics cache ─────────────────────────────────────────────────
-- Keyed by a digest of the store, the snapshot's timestamp and the requested
-- range. Entries are not expired; they become unreachable when the snapshot
-- changes, because the timestamp is part of the key. The sweep below is
-- housekeeping, not correctness.

create table if not exists public.analytics_cache (
  key         text primary key,
  payload     bytea not null,
  created_at  timestamptz not null default now()
);

create index if not exists analytics_cache_created_idx
  on public.analytics_cache (created_at);

-- ── updated_at ──────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'store_config', 'whatsapp_config', 'whatsapp_flows',
    'whatsapp_broadcasts', 'whatsapp_menu'
  ] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I '
      'for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ── Lock everything down ────────────────────────────────────────────────────

alter table public.store_config                   enable row level security;
alter table public.api_keys                       enable row level security;
alter table public.whatsapp_config                enable row level security;
alter table public.whatsapp_flows                 enable row level security;
alter table public.whatsapp_enrolments            enable row level security;
alter table public.whatsapp_broadcasts            enable row level security;
alter table public.whatsapp_broadcast_recipients  enable row level security;
alter table public.whatsapp_opt_outs              enable row level security;
alter table public.whatsapp_menu                  enable row level security;
alter table public.analytics_cache                enable row level security;
