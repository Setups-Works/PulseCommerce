# Performance

Measured, not guessed. Every figure below came from a benchmark against a
synthetic 20,000-order store or from the live deployment, and the method is
given so the numbers can be rechecked when something changes.

## Where the time goes

A cold request for the dashboard, before any of the caching described here:

| step | cost |
| --- | --- |
| read the gzipped snapshot from the shared store | ~380 ms (2 round trips) |
| gunzip and parse it into a 20 MB object | 158 ms |
| derive every metric from the order list | 137 ms |
| serialise the result | 6 ms |
| **response over the wire** | **~106 KB** (1.37 MB before Brotli) |

The response size is a non-issue: Vercel serves the API with
`content-encoding: br`, so 1.37 MB of JSON leaves as roughly 106 KB. Trimming
fields from the payload would win almost nothing, which is why it was not done.

## The dominant cost is distance, not computation

The single largest factor is where the database sits relative to the functions.

Measured against the live project from a machine in India:

```
tiny read (1 byte)   190 ms/call   <- pure round-trip latency
106 KB read          194 ms/call
```

Payload is free; the round trip is everything. At the time of writing:

- Vercel functions: `iad1` (Virginia)
- Supabase project: `ap-northeast-1` (Tokyo)

Every cache read crossed the Pacific. `vercel.json` now pins functions to
`sin1` (Singapore), which is closer to both Tokyo and the Indian merchants and
stores this product serves.

**The better fix is still open.** The product's users, their WooCommerce
stores, and therefore most of its traffic are in India. A Supabase project in
`ap-south-1` (Mumbai) paired with functions in `bom1` would cut the round trip
from ~190 ms to single digits. A project's region cannot be changed after
creation, so this means creating a new project and re-running
`supabase db push` — worth doing before there is production data worth
migrating.

## The caches, and what each one is for

Three layers, each covering a case the one below it cannot.

**1. In-process memo** — `lib/analytics/cache.ts`

`computeAnalytics` rebuilds RFM quintiles, cohort matrices, predicted lifetime
value, basket affinity and stock cover from the full order list on every call,
and was being called from six places. 137 ms each time.

Keyed on `storeUrl + fetchedAt + range + granularity`. `fetchedAt` is a correct
invalidation signal rather than a convenient one: it changes exactly when the
store is re-pulled, which is exactly when every derived figure goes stale, so a
refresh cannot be served a pre-refresh result.

Bounded at eight entries. Each holds ~1.4 MB and part of the key comes from
user-supplied dates, so unbounded it would leak a megabyte per custom range
anyone tried.

```
20 repeat calls   0.14 ms total
single miss     246 ms
```

**2. Shared analytics cache** — `lib/analytics/shared-cache.ts`

The memo helps a warm instance. On serverless most requests hit a cold one,
where the memo is empty and the whole chain is paid again.

This stores the derived result — gzipped, 106 KB — as a single row, so a cold
request reads one row instead of fetching, gunzipping and re-deriving a 20 MB
snapshot. Roughly 194 ms instead of ~675 ms.

Entries do not expire; they become unreachable, because `fetchedAt` is in the
key. Writes are fire-and-forget: a slow cache write must never hold open a
response that already has its answer.

**3. Snapshot cache** — `lib/store/snapshot.ts` and `snapshot-cache.ts`

Predates this work. Memory (10 min), local disk, then the shared key-value
store, chunked and gzipped. What stops a cold instance re-pulling the store's
entire order history — minutes on a large store, and enough sustained traffic
that a store's security layer starts refusing requests.

## Rechecking any of this

The benchmarks were run with a synthetic snapshot rather than real store data,
deliberately: this repository must never carry a real merchant's orders. The
fixture builds 20,000 orders across 24 months, 1,200 customers and 300
products, which is representative of the stores this product targets.

To re-measure, write a fixture matching `StoreSnapshot`, then time
`computeAnalytics` directly and `getStore().get()` against a real project.
Compare a one-byte read with a large one — if they cost the same, the
bottleneck is distance and no amount of code will fix it.
