# packages/cli — orientation for AI agents

Published to npm as `pulsecommerce-cli`. Built on `pulsecommerce-sdk`
(`packages/sdk`, a workspace dependency) — commands call
`clientFor(opts)` from `src/sdk.ts` to get a configured
`PulseCommerceClient` and then call SDK methods. **Do not add a raw `fetch`
call to a command file.** If the SDK doesn't have the method you need yet,
add it there first (see `packages/sdk/CLAUDE.md`), then consume it here —
that keeps every HTTP concern (auth headers, error shape, base URL
resolution) in one place instead of duplicated per command.

## Two ways to authenticate, one credential resolver

`pulse login` — the primary path. Device-authorization flow: prints a code
and URL, opens a browser, polls until approved, saves the key via
`config.ts`. `pulse config set --api-key ...` — the non-interactive
fallback for CI/containers/anywhere a browser can't open. Both end up
resolved the same way by `resolveCredentials()` (`config.ts`), which
`clientFor()` calls — a new command should use `clientFor(opts)` rather than
reading config or env vars directly, so both auth paths keep working for it
automatically.

## Commands mirror SDK groups, one file each

`src/commands/*.ts` (`analytics.ts`, `campaigns.ts`, `customers.ts`,
`flows.ts`, `login.ts`, `reports.ts`, `settings.ts`, `sync.ts`) — each wires
Commander subcommands to the matching SDK group. A new API capability gets a
new subcommand here matching the SDK group's method, not a one-off script.

## `lib/` is terminal UX, not API concerns

Output formatting, the confirmation prompt for anything destructive/costly
(a broadcast send, a config overwrite) — this is where that logic belongs,
deliberately kept out of the SDK so a non-terminal consumer of the SDK
doesn't inherit CLI-specific behavior.

## A known Commander gotcha, already fixed once

The root program's global options (`--api-key`, `--base-url`) will be
silently swallowed if a subcommand redeclares them locally — Commander
resolves the local (undefined) value instead of the global one. Use
`this.optsWithGlobals()` in a subcommand action instead of redeclaring the
flag. If a flag "isn't working" in a new subcommand, check this first before
assuming the bug is elsewhere.

## Publishing

The user's own `npm publish` from their own machine — not something to
attempt from an agent session. See `packages/sdk/CLAUDE.md` for the
(currently dormant) CI release path.
