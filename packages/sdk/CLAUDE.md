# packages/sdk — orientation for AI agents

Published to npm as `pulsecommerce-sdk`. A typed TS client wrapping the same
routes `src/lib/openapi.ts` describes — `packages/cli` is built on top of
this, not on its own fetch calls, and any third-party integration should be
too.

## Types are hand-written against openapi.ts. Keep them matched.

`src/types.ts`'s own top comment explains why they aren't generated: the
underlying routes are Next.js handlers with Zod validation inside them, and
no generator reads that combination faithfully — the same reasoning
`src/lib/openapi.ts` itself gives for being hand-written. **Whenever a route
in `src/lib/openapi.ts` changes shape, update the matching type here in the
same change.** There is no build-time check that catches drift between the
two the way `scripts/check-openapi.mjs` catches drift between routes and the
OpenAPI document — this pairing is kept honest by hand, so treat it with the
same discipline.

## One group file per resource

`src/groups/*.ts` (`analytics.ts`, `auth.ts`, `campaigns.ts`, `customers.ts`,
`flows.ts`, `reports.ts`, `settings.ts`, `sync.ts`) — each is a small class
of methods bound to the shared `request()` in `client.ts`, mirroring the
route groups in `src/lib/openapi.ts`'s own tags. A new API route gets a
method on the group matching its OpenAPI tag, not a new top-level method on
`PulseCommerceClient` — keep the one-group-per-resource shape.

Errors throw `PulseApiError` with `.status` and `.hint` — this is what lets
`packages/cli` print a useful message without the CLI needing to know
anything about HTTP status codes itself. Preserve this shape for any new
failure path; don't throw a bare `Error` from inside a group method.

## What does not belong here

Terminal UX — output formatting, interactive prompts, config file storage —
belongs in `packages/cli`, not here. This package is a library other
consumers (not just the CLI) would import; keep it free of anything that
assumes it's running in a terminal.

## Publishing

The user's own `npm publish` from their own machine, after `npm login` —
not something to attempt from an agent session. See
`.github/workflows/release.yml` for the (currently dormant, no `NPM_TOKEN`
secret configured) CI path if that changes.
