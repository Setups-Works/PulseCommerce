#!/usr/bin/env node
/**
 * Seeds exactly one signed-in-but-no-store identity for CI's E2E suite.
 *
 * tests/api-contract.spec.ts asserts what every endpoint does for a real
 * tenant who hasn't connected a store yet (409 "not_connected", not a crash)
 * — a state that only exists once someone is actually signed in. Since
 * src/proxy.ts correctly fails closed (503) when no database is configured at
 * all, the suite needs a real, working identity to authenticate as, not just
 * a database to talk to.
 *
 * This creates (idempotently) one Supabase Auth user in the CI-only test
 * project, and one API key for it with the exact digest CI_TEST_API_KEY
 * hashes to — computed the same way src/lib/auth/api-key.ts does, so the app
 * accepts it as a real key with no special-casing for "this is a test".
 *
 * Never run this against a real project — it creates a permanent, unrevoked
 * key with read+write scope.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * SUPABASE_DB_POOL_URL (or SUPABASE_DB_URL / DATABASE_URL), CI_TEST_API_KEY
 */
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const TEST_EMAIL = "ci-test@pulsecommerce.internal";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CI_TEST_API_KEY } = process.env;
const connectionString =
  process.env.SUPABASE_DB_POOL_URL ?? process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CI_TEST_API_KEY,
  SUPABASE_DB_POOL_URL: connectionString,
})) {
  if (!value) {
    console.error(`${name} is not set.`);
    process.exit(1);
  }
}

if (!CI_TEST_API_KEY.startsWith("pc_live_")) {
  console.error('CI_TEST_API_KEY must start with "pc_live_" — see src/lib/auth/api-key.ts.');
  process.exit(1);
}

const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findOrCreateUser() {
  // No admin "get by email" call exists; list-and-filter is the documented way.
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const existing = data.users.find((u) => u.email === TEST_EMAIL);
    if (existing) return existing.id;
    if (data.users.length < 200) break;
    page += 1;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    email_confirm: true,
    user_metadata: { full_name: "CI Test" },
  });
  if (error) throw error;
  return data.user.id;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  const userId = await findOrCreateUser();
  console.log(`Test user: ${userId}`);

  const hash = sha256(CI_TEST_API_KEY);
  const display = `pc_live_${CI_TEST_API_KEY.slice(8, 12)}…${CI_TEST_API_KEY.slice(-4)}`;

  const sql = postgres(connectionString, { prepare: false, max: 1 });
  try {
    await sql`
      insert into api_keys (user_id, name, hash, display, scopes)
      values (${userId}, 'CI', ${hash}, ${display}, array['read','write'])
      on conflict (hash) do nothing
    `;
  } finally {
    await sql.end();
  }

  console.log("Seeded CI test API key.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
