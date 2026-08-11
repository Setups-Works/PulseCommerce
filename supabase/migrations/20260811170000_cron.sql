-- Scheduling, in the database rather than on the host.
--
-- The sync and the flow tick both have to happen on a timer. Doing that with
-- the hosting platform's scheduler ties it to the platform: the schedule lives
-- in vercel.json, it is invisible from the database, and a self-hosted install
-- gets nothing. pg_cron puts it next to the data it operates on, where it can
-- be inspected with a query and changed without a deploy.
--
-- pg_net makes the HTTP call. The work itself stays in the application —
-- syncing a store means talking to the WooCommerce REST API, parsing its
-- responses and honouring its rate limits, which is not something to write in
-- PL/pgSQL. What the database schedules is a request, not the logic.
--
-- ── The secret ──────────────────────────────────────────────────────────────
--
-- The endpoints authenticate with CRON_SECRET, and this file is committed, so
-- the value cannot live here. It goes in Supabase Vault, which stores it
-- encrypted and keeps it out of the schedule definition that `select * from
-- cron.job` would otherwise print in full.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

/*
 * Where the app is, and how to prove the call came from the scheduler.
 *
 * Read from Vault at call time rather than baked into the cron command, so
 * rotating the secret or moving the deployment is an update to one row instead
 * of a migration.
 */
create or replace function public.trigger_app_job(path text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  base_url text;
  secret   text;
  request_id bigint;
begin
  select decrypted_secret into base_url
  from vault.decrypted_secrets where name = 'app_base_url';

  select decrypted_secret into secret
  from vault.decrypted_secrets where name = 'cron_secret';

  if base_url is null or secret is null then
    -- Raising rather than silently doing nothing: a schedule that fires into
    -- the void every hour and reports success is worse than one that fails
    -- loudly the first time.
    raise exception
      'trigger_app_job: app_base_url or cron_secret is missing from Vault.';
  end if;

  select net.http_post(
    url     := base_url || path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body    := '{}'::jsonb,
    -- Generous, because a first sync of a large store is slow. pg_net is
    -- asynchronous — this returns a request id immediately and the response
    -- lands in net._http_response — so a long timeout blocks nothing.
    timeout_milliseconds := 280000
  ) into request_id;

  return request_id;
end;
$$;

comment on function public.trigger_app_job is
  'Calls an app endpoint with the Vault-held CRON_SECRET as a bearer token. '
  'Used by the scheduled jobs below.';

-- ── Schedules ───────────────────────────────────────────────────────────────
-- Unscheduled first so this migration can be re-run without duplicating jobs;
-- cron.schedule on an existing name updates it, but cron.unschedule of a name
-- that does not exist raises, hence the guard.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-stores') then
    perform cron.unschedule('sync-stores');
  end if;
  if exists (select 1 from cron.job where jobname = 'advance-flows') then
    perform cron.unschedule('advance-flows');
  end if;
end $$;

/*
 * Every two hours. WooCommerce data does not change fast enough for anything
 * tighter to be useful, and each run costs the merchant's store real work; the
 * dashboard has a manual sync for the moment somebody actually wants "now".
 */
select cron.schedule(
  'sync-stores',
  '0 */2 * * *',
  $$ select public.trigger_app_job('/api/cron/sync') $$
);

/*
 * Flow steps are scheduled in whole days, so once daily is the right
 * resolution. 04:30 UTC is 10:00 in India, where this product's merchants and
 * their customers are — a marketing message should not arrive at 3am.
 */
select cron.schedule(
  'advance-flows',
  '30 4 * * *',
  $$ select public.trigger_app_job('/api/cron/flows') $$
);
