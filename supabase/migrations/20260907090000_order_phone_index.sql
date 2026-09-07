-- readPhoneByCustomerKey() (src/lib/woo/mirror.ts) reads a customer's most
-- recent billing phone straight from woo_orders instead of paying for a full
-- readSnapshot() reassembly -- but without an index on the expression it
-- filters and sorts by, Postgres still has to detoast and parse every
-- order's `raw` jsonb to answer it: ~8s on a real 22,000-order store versus
-- ~1.7s with this index in place, confirmed by testing against one.
--
-- Partial: only orders that actually carry a billing phone are worth
-- indexing, and that's also exactly the filter the query already applies.
create index if not exists woo_orders_billing_phone_idx
  on public.woo_orders (store_id, (trim(raw -> 'billing' ->> 'phone')), date_created desc)
  where nullif(trim(raw -> 'billing' ->> 'phone'), '') is not null;
