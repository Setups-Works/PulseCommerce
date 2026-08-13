# Moving to another Supabase project

A project's region is fixed when it is created, so changing it means creating a
new project and moving into it. This is what that took, written down because
two steps of it are non-obvious and one of them looks like a completely
unrelated bug.

## What has to move, and what does not

Only three things cannot be regenerated:

- The account in `auth.users`, and its row in `auth.identities`.
- The row in `stores`, which holds the WooCommerce consumer key and secret.
- Issued rows in `api_keys`.

Everything under `woo_orders`, `woo_customers` and `woo_products` is a mirror
of WooCommerce. It re-syncs itself, so it is not worth migrating — and copying
it would cost more than re-reading it. That property is what makes changing
region cheap enough to be worth doing at all.

`profiles` is deliberately *not* restored. The `on_auth_user_created` trigger
writes it when the user row lands, so letting it fire keeps the two consistent
by construction instead of trusting a dump to have matched.

The backfill cursor (`stores.backfill_through`, `backfill_done`) must be left
null. The new mirror is empty, so resuming from a cursor would skip all the
history in front of it.

## The trap: "Database error querying schema"

Restoring a user with a column list — rather than a full row — leaves several
`auth.users` text columns NULL:

    confirmation_token
    recovery_token
    email_change
    email_change_token_new
    email_change_token_current
    phone_change
    phone_change_token
    reauthentication_token

GoTrue scans these into non-nullable Go strings. A NULL cannot be scanned, and
the failure surfaces at sign-in as:

    Database error querying schema

Which says nothing about tokens, or users, or the row that caused it. It is
easy to read as a broken schema, a bad migration or a permissions problem, and
it is none of those.

They are "no token outstanding" markers. Set them to empty strings:

```sql
update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '');
```

`phone` is genuinely optional and stays NULL.

A missing `auth.identities` row produces a *different* failure — the sign-in is
simply rejected — so if credentials are refused rather than erroring, check
that first.

## Applying migrations without the database password

`supabase db push` needs the Postgres password, which is only shown once at
creation. If it is not to hand, the Management API will run SQL directly:

```bash
TOKEN=$(security find-generic-password -s "Supabase CLI" -w)   # macOS keychain
curl -X POST "https://api.supabase.com/v1/projects/<ref>/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select 1"}'
```

That is enough to apply every migration and restore the data. Record them in
`supabase_migrations.schema_migrations` afterwards, or the next `db push` will
try to apply them again.

It is **not** enough to run the application: the app connects over the
transaction pooler and needs the password. It also cannot be set this way —
`alter user postgres` is refused with *permission denied to alter role*. Reset
it from Settings → Database instead.

## Things to set that are easy to forget

- **Vault**, or `pg_cron` cannot authenticate to the app. The schedules come
  from a migration, but the secrets they read do not:
  `select vault.create_secret('<value>', 'app_base_url' | 'cron_secret')`.
- **`CRON_SECRET`** on the host must match the Vault copy.
- **Delete the old project's variables** rather than leaving them. A stale
  `SUPABASE_SERVICE_ROLE_KEY` pointing at a deleted project is an invitation to
  wire it back up.
- **`NEXT_PUBLIC_*` are baked at build time.** Changing them on the host does
  nothing until a fresh build runs — a redeploy of an existing build reuses the
  old bundle and keeps pointing at the old project.

## What the move was worth

Measured warm, from India, before and after moving `ap-northeast-1` →
`ap-south-1` with functions on `bom1`:

| | Tokyo | Tokyo, tuned | Mumbai |
| --- | --- | --- | --- |
| warm query | ~140 ms | ~140 ms | **~50 ms** |
| `/api/settings` | 2637 ms | 1200 ms | **464 ms** |
| `/api/sync` | 1245 ms | 1218 ms | **498 ms** |
| `/api/keys` | 295 ms | 317 ms | **125 ms** |
| `/api/analytics` | — | 5178 ms | **4463 ms** |
| backfill | 55 orders/s | 55 orders/s | **62 orders/s** |

Two of those are worth reading carefully, because they were predicted wrong.

**The backfill barely moved.** It had been reasoned that writes were the
bottleneck, because fetching eight pages in parallel measured ~305 orders/s
while the full sync managed 55. The flaw was in the measurement: the
concurrency probe requested seven fields and the real client requests the whole
order including line items. The sync was WooCommerce-bound the entire time, and
no database move could have changed that.

**`/api/analytics` improved least and is now the slowest endpoint.** It derives
RFM quintiles, cohorts, predicted lifetime value and basket affinity across
21,000 orders on every cold instance. That is compute over a large dataset;
proximity to the database does not help it. Reducing it means caching the
derived result or deriving less, not moving anything.
