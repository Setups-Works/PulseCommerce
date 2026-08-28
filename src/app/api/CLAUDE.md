# src/app/api — orientation for AI agents

Three things are true of every route in this directory, and a new route
that skips any of them is broken by omission, not by a subtle bug:

## 1. It resolves a tenant through `src/lib/auth/tenant.ts`

Unless the route is genuinely public (webhook-style, like
`auth/woo/callback`) or a cron endpoint gated by `CRON_SECRET`, it must call
`requireTenant`/`requireStore` and scope its queries by the result. See
`src/lib/auth/CLAUDE.md` and the root `AGENTS.md` for why — the server
reaches Postgres as the table owner, so RLS is not doing this for you.

## 2. It's on an allowlist in `src/proxy.ts`

Next 16's replacement for `middleware.ts`. Three sets decide what a request
needs before it reaches your handler:

- `PUBLIC_API` — no session or key required at all (auth start/callback,
  cron endpoints that check their own secret, CLI device-login start/poll)
- `READ_ONLY_POSTS` — a POST that only reads (previews, dry runs) needs
  `read` scope rather than `write` when called with an API key
- `PROTECTED_PAGES` — browser pages that redirect to `/login` when signed out

A new route that needs to be reachable without a full session (a new cron
job, a new public callback) must be added here explicitly — there's no
implicit "this looks safe" fallback, and forgetting this step means a route
either 401s unexpectedly or (worse, if you reach for a workaround instead of
fixing the allowlist) ends up bypassing auth entirely.

## 3. It has an entry in `src/lib/openapi.ts`

`scripts/check-openapi.mjs` fails CI if a route exists that the document
doesn't describe. Written by hand, not generated — the file's own top
comment explains why (Zod-validated Next.js handlers, no generator reads
that combination faithfully). Add the new route's entry in the same commit
that adds the route, under the tag that best matches its existing
neighbors, matching an existing entry of the same shape rather than
inventing new conventions.

## Cron routes specifically

`src/app/api/cron/*` routes are **not called by Vercel Cron** — see the root
`AGENTS.md`, this was a real, previously-uncaught documentation bug. They're
called by Supabase pg_cron + pg_net, authenticated with the same
constant-time `CRON_SECRET` bearer check pattern in every one of them
(`sync`, `flows`, `abandoned-checkouts`). If you add a new scheduled route,
copy that check verbatim rather than writing a new one, and add the actual
schedule to a new migration in `supabase/migrations/` — never to
`vercel.json`, which this project doesn't use for scheduling at all.
