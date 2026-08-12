-- Make the first sync resumable.
--
-- The backfill walks WooCommerce's REST API a hundred orders per request. On a
-- real store that is slow — measured at ~11s per page against a store with
-- 21,052 orders, so roughly forty minutes end to end. A serverless function is
-- killed long before that, and because the watermark was only advanced on
-- success, every retry started again from nothing. A store that size could
-- never finish.
--
-- So a run now works to a time budget and records where it got to. The next
-- invocation resumes from there. `backfill_through` is the oldest point the
-- backfill has reached going forward in time; when it catches up to the
-- present, `backfill_done` flips and the store switches to cheap incremental
-- syncs keyed on `synced_through`.
--
-- The cursor is a timestamp rather than a page number on purpose. Page numbers
-- shift under you: an order placed mid-backfill renumbers every page after it,
-- so resuming at "page 47" silently skips or repeats records. A date is stable
-- against inserts because the backfill reads oldest-first.

alter table public.stores
  add column if not exists backfill_through timestamptz,
  add column if not exists backfill_done    boolean not null default false;

comment on column public.stores.backfill_through is
  'How far forward the historical backfill has read. Null means it has not '
  'started. Resume point for the next run.';

comment on column public.stores.backfill_done is
  'True once the backfill has reached the present. From then on only '
  'incremental syncs run, keyed on synced_through.';

-- Runs that were killed mid-flight are left as "running" forever, which makes
-- the UI wait on something that will never report. Anything still running from
-- before this migration is stale by definition.
update public.woo_sync_runs
   set status = 'failed',
       finished_at = now(),
       error = 'Interrupted before the sync became resumable.'
 where status = 'running';
