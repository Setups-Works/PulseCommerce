-- Device-authorization login for the CLI (`pulse login`).
--
-- No "approved" status is stored at rest. Approving in the browser only
-- attaches user_id to the pending row; the API key itself is minted inside
-- the first poll that observes a user_id set, which flips the row straight
-- to 'completed' in the same statement. That mirrors api_keys' own
-- discipline of never persisting a raw secret — here there is a moment where
-- a key could be minted and then never collected, but there is never a
-- moment where an already-issued key sits recoverable in this table.
create table if not exists public.cli_auth_requests (
  id            uuid primary key default gen_random_uuid(),
  -- CSPRNG, long. Only the CLI process holds this; a human never sees or
  -- types it, so it does not need to be memorable.
  device_code   text not null unique,
  -- CSPRNG, short and typeable (e.g. XXXX-XXXX). Shown to the human in the
  -- browser so they can compare it against what their terminal printed —
  -- the standard device-flow check against a phished approval page.
  user_code     text not null unique,
  -- Set on approval. Null the whole time the code is only sitting in a
  -- terminal waiting for someone to visit the verification URL.
  user_id       uuid,
  scopes        text[] not null default '{read,write}',
  status        text not null default 'pending' check (status in ('pending', 'denied', 'completed')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null
);

-- The poll endpoint's hot path: look up by device_code, only ever among rows
-- that could still resolve to something. Completed and denied rows are dead
-- ends a poll should treat as "expired" without needing this index's help.
create index if not exists cli_auth_requests_device_code_idx
  on public.cli_auth_requests (device_code) where status = 'pending';

-- The approval page's lookup, by the code a human typed or followed a link
-- with. Same partial condition, same reasoning.
create index if not exists cli_auth_requests_user_code_idx
  on public.cli_auth_requests (user_code) where status = 'pending';

-- Written and read entirely by the server over the owner connection (see
-- `db()` in src/lib/db/client.ts), the same as analytics_cache. RLS on, no
-- policies: there is no reason for a browser to query this table directly.
alter table public.cli_auth_requests enable row level security;
