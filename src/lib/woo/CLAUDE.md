# src/lib/woo — orientation for AI agents

The WooCommerce REST API client and everything that turns its responses into
what the rest of the app actually uses.

## client.ts — a deliberately narrow set of mutating methods

`WooClient` writes in exactly three places: `createCoupon` (campaign coupon
generation), and `createWebhook`/`deleteWebhook` (registering and removing
the `order.created` webhook behind WhatsApp order confirmations — see
`src/app/api/whatsapp/order-confirmations/route.ts`). Nothing else writes to
orders, products, customers, or settings. This isn't an oversight to
"complete" — it's the enforcement mechanism for the store key's scope.
WooCommerce only offers `read` or `read_write`, with nothing finer-grained,
so `read_write` is requested purely for these writes, and the narrowing to
"exactly these, nothing else" is enforced here in code, not by the key
itself (see `src/app/api/auth/woo/start/route.ts` for the request-side
reasoning). If you add a fourth mutating method, you've further widened what
a compromised or buggy code path can do to a merchant's live store — treat
that as a real design decision, not routine feature work, the same way
adding the webhook pair was.

Retries are transient-conditions-only (`0, 408, 429, 5xx`) with backoff — a
`401` or `404` is retried by nothing, because it will fail identically every
time and retrying just delays surfacing the real error.

`_fields` matters more than it looks: `ORDER_FIELDS` is trimmed to what the
analytics engine actually reads (900KB → 160KB per page per the pipeline
diagram in `README.md`). `getAbandonedOrders` deliberately uses a *separate*
`ABANDONED_ORDER_FIELDS` list rather than widening `ORDER_FIELDS` for
everyone — it needs `order_key` (for the WooCommerce "resume checkout" link)
that the main sync doesn't, and widening the shared list would cost every
sync call payload size for a field only one feature needs. Follow this
pattern for future field needs: a new dedicated `_fields` list beats
widening a shared one.

## slim.ts / entities.ts / attribution.ts

`slim()` drops tax arrays, `meta_data`, and image galleries post-fetch — an
81% size reduction per the data pipeline diagram in `README.md`. If you need
a field this currently drops, add it deliberately here rather than reaching
for the raw, un-slimmed order elsewhere; the whole snapshot/cache pipeline
downstream assumes it's working with the slimmed shape.

`decodeEntities()` runs once at ingest so no chart, table, PDF, or CSV
exporter downstream has to think about HTML entities in product/customer
names. Don't re-decode downstream; if something looks double-escaped, the
bug is almost certainly that some new field bypassed this step.

`attachAttribution()` reads WooCommerce's own Order Attribution meta
(core since 8.5) — orders from an older WooCommerce, or from a store with
the feature disabled, carry no attribution data at all. Every acquisition
metric that depends on this reports its coverage percentage rather than
treating missing data as zero; keep that convention for anything new built
on top of it.

## mirror.ts / sync.ts

The sync that runs every 10 minutes via Supabase pg_cron (see root
`AGENTS.md`) — orders stores by staleness, and an already-synced store costs
one cheap incremental query rather than a full re-pull. If you're debugging
"why does this store show stale data," check `stores` for its last sync
timestamp and the per-store lock before assuming the cron job itself isn't
running — a locked store waiting out another in-flight sync looks identical
to a stuck cron from the outside.

## types.ts

Hand-maintained against the actual WooCommerce REST response shape, not
generated. If a field WooCommerce returns isn't here, code reading it will
be typed as `unknown`/absent rather than silently wrong — add the field here
first, deliberately, rather than casting around the gap at the call site.
