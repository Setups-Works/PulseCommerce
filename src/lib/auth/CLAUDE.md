# src/lib/auth — orientation for AI agents

Small on purpose. Match the existing digest-only / signed-token-only
discipline in each file rather than inventing a new auth pattern — this
directory is the whole auth surface, and a new pattern here means a second
thing to audit forever.

## tenant.ts — read this before writing any route handler

The server reaches Postgres as the table owner over the transaction pooler,
which bypasses row-level security. RLS policies exist on tenant tables but
**do not protect anything on this path** — `tenant.ts` is what actually keeps
one tenant from reading another's data.

Every request handler that touches a tenant-owned table must resolve a
caller through one of:

- `resolveTenant(request)` — returns `Tenant | null`, doesn't reject
- `requireTenant(request)` — returns `{ok, value}` or an error response
- `requireStore(request)` — like `requireTenant`, also resolves the active `TenantStore`
- `activeStore(userId)` — for code paths (cron, the assistant) that already have a `userId`

...and scope its own queries by the returned `storeId`/`userId`. A handler
that queries a tenant-owned table without going through one of these first
has no isolation at all — there is no fallback, no default-deny, nothing else
catches the mistake. See `AGENTS.md` at the repo root for the fuller version
of this warning.

Two caller kinds resolve to the same `Tenant` shape: a browser session
cookie (Supabase) and an API key (`Authorization: Bearer pc_live_...`). Code
elsewhere in the app should not need to know or care which one it was —
`tenant.via` and `tenant.scopes` exist for the few call sites that do (e.g.
gating a write behind `scopes.includes("write")`).

## api-key.ts

Keys are stored as a SHA-256 digest only — the raw key is shown once at
creation and never again, never logged, never returned by a later read. If
you add a new key-adjacent feature (rotation, a second key per user,
whatever), keep that property. A "forgot my key, show it again" feature is
not a bug to fix; it's the security model working as designed.

## pending.ts

Signs the WooCommerce authorization state token (HMAC-SHA256, 15-minute TTL,
constant-time verify). This is what lets the callback route
(`src/app/api/auth/woo/callback/route.ts`) — a server-to-server POST from the
merchant's WooCommerce install, carrying no session at all — know which
account to attach the store to. If you ever find yourself trusting a query
parameter instead of this token for "whose store is this", stop; that's
exactly the mistake this file exists to prevent (see its own top comment for
the full reasoning).

## cli-login.ts

The device-authorization flow behind `pulse login` — mirrors OAuth 2.0's
Device Authorization Grant shape without pulling in an OAuth library. No
`approved` status is ever persisted: a raw API key is minted exactly once,
inside the first poll that observes an approved, unexpired, still-pending
row, in the same statement that flips it to `completed`. If you touch this
file, preserve "minted exactly once" — it's the same guarantee
`api-key.ts`'s dashboard-facing create-key flow already gives, applied to a
flow that runs unattended in a terminal instead of in front of a person.

## session.ts / headers.ts

Thin — session cookie handling and the two header names
(`x-pulse-user-id` / `x-pulse-user-email`) `src/proxy.ts` sets after verifying
a caller, so a route handler doesn't have to re-verify. These headers are
only trustworthy because Proxy deletes any inbound copy before setting its
own — nothing else may set them. Not places to add new logic; if you need
something more than "read who's logged in," it belongs in `tenant.ts`.
