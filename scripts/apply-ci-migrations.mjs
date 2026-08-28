#!/usr/bin/env node
/**
 * Applies every migration in supabase/migrations/ to a database, in order.
 *
 * Written for CI's dedicated test Supabase project, not for a developer's own
 * database — a developer applies migrations with the `supabase` CLI (see
 * AGENTS.md for the sandboxed-network workaround when that CLI can't reach
 * the database directly). This script exists because a GitHub Actions runner
 * needs the exact same "run everything, in order, exactly once" behavior on
 * every push, with no interactive prompts and no assumption that a `supabase
 * link` has ever happened.
 *
 * Idempotent: applied filenames are tracked in a small table of their own, so
 * re-running this against the same database only applies what's new.
 *
 * Usage: node scripts/apply-ci-migrations.mjs
 * Requires: SUPABASE_DB_POOL_URL (or SUPABASE_DB_URL / DATABASE_URL)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

const connectionString =
  process.env.SUPABASE_DB_POOL_URL ?? process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "No database connection string. Set SUPABASE_DB_POOL_URL (or SUPABASE_DB_URL / DATABASE_URL).",
  );
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

async function main() {
  await sql`
    create table if not exists public._ci_migrations_applied (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = new Set(
    (await sql`select filename from public._ci_migrations_applied`).map((r) => r.filename),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const contents = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`Applying ${file}...`);
    await sql.unsafe(contents);
    await sql`insert into public._ci_migrations_applied (filename) values (${file})`;
    ran += 1;
  }

  console.log(ran > 0 ? `Applied ${ran} migration(s).` : "Nothing to apply — already up to date.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
