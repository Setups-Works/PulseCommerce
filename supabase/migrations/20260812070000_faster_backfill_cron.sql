-- Run the sync often enough for a backfill to actually finish.
--
-- Every two hours suits a store that is already mirrored: WooCommerce data
-- does not change fast enough for anything tighter, and each run costs the
-- merchant's shop real work.
--
-- It is far too slow for the first sync. A run reads roughly 4,000-5,000
-- orders before its budget expires, so a 21,000-order history needs several;
-- at one run every two hours that is most of a day, during which the dashboard
-- shows a fraction of the merchant's history.
--
-- Ten minutes closes that gap without becoming a burden afterwards, because
-- the endpoint orders stores by staleness and an already-synced store costs
-- one cheap incremental query. The per-store lock added alongside this stops
-- overlapping runs from doubling the request rate against a shop.

select cron.unschedule('sync-stores');

select cron.schedule(
  'sync-stores',
  '*/10 * * * *',
  $$ select public.trigger_app_job('/api/cron/sync') $$
);
