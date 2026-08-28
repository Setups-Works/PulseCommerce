<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PulseCommerce — orientation for AI agents

`README.md` is the full reference (architecture diagrams, every pipeline, every
feature, deployment, troubleshooting) — read it before touching a subsystem you
don't already know. This file is not a second copy of that. It exists for the
things that aren't written down anywhere else, and that a careful read of the
code alone won't surface fast enough: real gotchas from real incidents in this
codebase, and the one or two facts that quietly invalidate an otherwise
reasonable assumption a fresh agent would make.

## Scheduling runs on Supabase, not Vercel

Nothing in this project runs on Vercel Cron — there is no `crons` block in
`vercel.json`, and `npx vercel cron ls` returns nothing. The three scheduled
jobs (`sync-stores` every 10 min, `advance-flows` daily at 04:30 UTC,
`abandoned-checkouts` every 5 min) are **Supabase pg_cron + pg_net**, defined
in `supabase/migrations/*cron*.sql` and visible with
`select * from cron.job;` against the database — not in any file in this repo.
A `trigger_app_job(path)` SQL function reads the app's base URL and
`CRON_SECRET` from Supabase Vault and POSTs to the app directly from Postgres.

This was itself a real, long-standing documentation bug: `README.md` claimed
"Vercel Cron" in three places until this was caught by actually checking
(`npx vercel cron ls`), not by reading the docs. If you're touching a
`/api/cron/*` route or its trigger cadence, the migration file is the source
of truth — grep `supabase/migrations/` for `cron.schedule`, don't trust prose.

## The tenant-scoping chokepoint

The server reaches Postgres as the table owner over the transaction pooler,
which bypasses row-level security — so RLS is not what keeps one tenant from
reading another's data. `src/lib/auth/tenant.ts` is what does: every request
handler resolves a `Tenant`/`TenantStore` through `resolveTenant` /
`requireTenant` / `requireStore` / `activeStore` and scopes its own queries by
the returned `storeId`/`userId`. A handler that queries a tenant-owned table
without going through one of these first has no isolation at all — this is
the one file where a shortcut is a cross-tenant data leak, not a style issue.

## Known-shape bug: per-tenant config tables

`whatsapp_config` (single-tenant) was dropped and replaced by
`whatsapp_connections` (per-user) in the multi-tenant migration
(`20260811140000_multi_tenant.sql`), but `src/lib/whatsapp/config.ts` kept
querying the old table for a long time afterward — every WhatsApp-touching
route silently broke ("Cannot POST /api/sessions//start") except the one route
that happened to do its own inline session lookup. The fix was threading
`userId` through every exported function in that file
(`readWhatsAppConfig(userId)` etc.) rather than reading a single global row.
If you add a new per-tenant config table, check every reader takes a
tenant/user id as a real parameter — a config helper with no id parameter in a
multi-tenant app is a bug waiting to surface exactly like this one did.

## Applying a migration in a sandboxed / agent environment

The `supabase` CLI needs a direct (usually IPv6) connection to the database,
which is commonly blocked on a sandboxed network. When it can't reach the DB,
apply a migration with a throwaway Node script using the `postgres` npm
package and `SUPABASE_DB_POOL_URL` (or the pooler connection string) from
`.env.local` — write it to something like `.tmp-migration.mjs`, run it, then
`rm -f` it in the same command chain. Don't leave the script committed or
lying around; it typically embeds a connection string.

## Safety rules for anything that can message a real phone

- **Test sends go to one number only.** Never send a real WhatsApp message —
  test or otherwise — to a number that isn't the established test number,
  without the user explicitly naming a different recipient in the current
  conversation. A phone number pulled from real WooCommerce order/customer
  data is a real customer; treat it as one.
- **The abandoned-checkout `enabled_at` boundary is load-bearing, not
  incidental.** `stores.abandoned_checkout_enabled_at` is reset to `now()`
  every time the toggle is switched on (`src/app/api/whatsapp/abandoned-
  checkouts/route.ts`), specifically so that turning the feature on for a
  store with a real backlog of old pending orders never messages that backlog
  as a batch. Any new "resume a paused recovery/reminder feature" work should
  default to the same pattern — an explicit boundary timestamp reset on
  enable — rather than "everything currently eligible" the moment a switch
  flips.
- The AI assistant (`src/lib/ai/execute.ts`) never returns a phone number or
  email to the model, and action tools (anything that sends or changes state)
  are returned to the browser as unexecuted proposals for a human to approve —
  the assistant is a way to reach the ordinary REST endpoints, not a way
  around their guards. Keep both properties if you add a tool.

## Where to look first

- `src/proxy.ts` — the single auth chokepoint (Next 16's replacement for
  `middleware.ts`); `PUBLIC_API` / `READ_ONLY_POSTS` / `PROTECTED_PAGES` are
  the allowlists that decide what needs a session or key.
- `src/lib/openapi.ts` — the hand-written OpenAPI 3.1 spec. CI
  (`scripts/check-openapi.mjs`) fails if a route exists that this doesn't
  describe; add new routes here in the same commit that adds them.
- `src/lib/auth/tenant.ts`, `src/lib/auth/api-key.ts`,
  `src/lib/auth/cli-login.ts`, `src/lib/auth/pending.ts` — the whole auth
  surface. Small on purpose; match the existing digest-only /
  signed-token-only discipline rather than inventing a new pattern.
- `packages/sdk` / `packages/cli` — published to npm as `pulsecommerce-sdk` /
  `pulsecommerce-cli`. The CLI is built on the SDK, not its own fetch calls.
  Publishing is the user's own `npm publish`, from their own machine — not
  something to attempt from an agent session.

## The WhatsApp gateway is a specific fork, not upstream OpenWA

Every WhatsApp send in this app goes through a self-hosted gateway at
**https://github.com/rmyndharis/OpenWA** — that repo is the source of truth
for its endpoints, plugins, and response shapes, not the upstream OpenWA
project or its general documentation. This fork's actual behavior has
already been found to disagree with documented behavior in at least one
place that matters (session state lives on `GET /api/sessions/{id}`, not
`/status`). Adding a new WhatsApp-facing feature — a new gateway call, a new
plugin integration, anything in `src/lib/whatsapp/client.ts` — means reading
that repo's source first, not inferring from OpenWA docs in general. See
`src/lib/whatsapp/CLAUDE.md` for more.
