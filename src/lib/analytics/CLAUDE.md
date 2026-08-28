# src/lib/analytics — orientation for AI agents

## engine.ts is pure. Keep it that way.

`computeAnalytics` and everything it calls (`acquisition.ts`, `cohorts.ts`,
`customer-cohorts.ts`, `customers.ts`, `inventory.ts`, `products.ts`,
`operations.ts`) is a pure function from a `StoreSnapshot` to numbers — no
I/O, no database, no fetch. That purity is *the* reason a date-range change
costs milliseconds instead of a re-pull, and the reason every figure is
reproducible from the same snapshot. If you're adding a new metric, it goes
in here as another pure derivation from the snapshot — reaching out to
WooCommerce or the database from inside this module breaks the property
every caller assumes.

## The "All time" bug shape — don't reintroduce it

A real, shipped bug: the "All time" preset computed a frozen `{from, to}`
date pair from `bounds` that could be stale or not yet loaded, silently
falling back to `range: null` and letting the server's own 30-day default
kick in. The fix was sending an explicit `all: true`/`all=1` signal that gets
resolved fresh, server-side, on every request — never precomputing a
supposedly-equivalent date range on the client and trusting it stays valid.
If you add another "special" range (e.g. a future "since I connected this
store" preset), resolve it the same way: a signal the server interprets
fresh each time, not a client-computed date pair standing in for it.

## cache.ts vs shared-cache.ts — two different problems

`cache.ts` is an in-process memo: makes a warm instance fast, keyed so a
range change or a second route in the same instance reuses the result.
`shared-cache.ts` is the cross-instance version (gzip'd bytea in Postgres):
makes a *cold* instance fast, which on serverless is most requests. The
shared-cache key includes the snapshot's `fetchedAt`, specifically so a
re-pull can never be served a pre-refresh result — there's no TTL because
entries don't expire, they become unreachable once a new snapshot exists.
If you add a new derived result worth caching, decide explicitly which of
these two problems it has (or both) rather than reusing one cache for both
purposes.

## hasPhone, never the number

The analytics payload carries `hasPhone: boolean` (see `types.ts` and
`customers.ts`), never an actual phone number or email address — this is the
same "server keeps PII, payload gets a boolean" convention documented for
the assistant in `AGENTS.md`. Any new field you add to a customer or order
record in this module should follow the same rule: if it's PII, the payload
gets a derived boolean or count, not the value itself.
