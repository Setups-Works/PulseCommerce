# supabase/migrations — orientation for AI agents

## The scheduler lives here, not in vercel.json

This project has no Vercel Cron jobs configured — `npx vercel cron ls`
returns nothing, and there's no `crons` block in `vercel.json`. The three
scheduled jobs (`sync-stores` every 10 min, `advance-flows` daily at 04:30
UTC, `abandoned-checkouts` every 5 min) are **Supabase pg_cron + pg_net**,
defined in `*cron*.sql` files here. `select * from cron.job;` against the
database is the source of truth for what's actually scheduled — grep this
directory for `cron.schedule`/`cron.unschedule` before trusting any prose
description of cadence, including in `README.md` (which got this wrong for
a long time before it was caught).

A `trigger_app_job(path)` SQL function (`20260811170000_cron.sql`) reads the
app's base URL and `CRON_SECRET` from Supabase Vault and POSTs to the app
directly from Postgres. New scheduled work reuses this function — don't
write a second HTTP-calling function; add a new `cron.schedule(...)` call
that calls the existing one with a new path.

Changing a schedule's cadence: **unschedule the old name, then schedule it
again** (see `20260812070000_faster_backfill_cron.sql` for the pattern) —
`cron.schedule` on an existing job name updates it, but if you're
also changing the name, you need the unschedule first or you'll end up with
two jobs racing each other.

## Naming and structure

Filenames are `<YYYYMMDDHHMMSS>_<description>.sql`, applied in that order.
Keep each migration focused on one change — the CLI auth table, the
abandoned-checkout table, and the abandoned-checkout `enabled_at` column
each got their own file rather than being bundled, which makes it possible
to reason about (and if truly necessary, roll back) one change without
touching the others.

RLS is enabled on tenant tables but does not protect the server's own access
path (see root `AGENTS.md` and `src/lib/auth/CLAUDE.md`) — it exists as
defense in depth for any future access path that isn't the table-owner
pooler connection, not as the thing keeping tenants apart today. Don't treat
"I added an RLS policy" as equivalent to "I scoped the query in code" — you
need both, and only the second one is actually load-bearing right now.

## Applying a migration in a sandboxed / agent environment

The `supabase` CLI needs a direct (usually IPv6) connection to the database,
which is commonly blocked on a sandboxed network. When it can't reach the
DB, apply a migration with a throwaway Node script using the `postgres` npm
package and `SUPABASE_DB_POOL_URL` (or the pooler connection string) from
`.env.local` — write it to something like `.tmp-migration.mjs`, run it, then
`rm -f` it in the same command chain. Don't leave the script committed or
lying around; it typically embeds a connection string.
