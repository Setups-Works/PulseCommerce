import postgres, { type Sql } from "postgres";

/**
 * The connection to Supabase Postgres.
 *
 * This is the only way the server reaches stored data. It replaces the
 * key-value abstraction that used to sit here with three interchangeable
 * backends — filesystem, Redis, Supabase-over-REST — chosen from whatever
 * happened to be configured. That flexibility bought nothing and cost a great
 * deal: the same data behaved differently depending on the deployment, nothing
 * could be queried, and every write was a whole-document rewrite with no way
 * to express a constraint.
 *
 * ─── Why the pooler, and why not PostgREST ─────────────────────────────────
 *
 * Serverless functions are many short-lived processes. Postgres allocates a
 * backend process per connection and runs out long before the platform runs
 * out of function instances, so connecting directly does not survive traffic.
 * The transaction pooler on port 6543 hands out a server connection for the
 * duration of a statement and takes it straight back, which is the right shape
 * for functions that open one connection, run one query and exit.
 *
 * PostgREST would have avoided the problem by being stateless HTTP, but it
 * applies row level security, and every table here has RLS on with no
 * policies precisely so that no browser-reachable key can touch them. Reaching
 * them over PostgREST would have needed the service-role key. Connecting as
 * the table owner is both simpler and the thing RLS was configured to expect.
 *
 * ─── Constraints the pooler imposes ────────────────────────────────────────
 *
 * Transaction mode gives a different server connection per transaction, so
 * anything that assumes a persistent session breaks. `prepare: false` is
 * required: prepared statements live on the server connection, and the next
 * statement will not be on the same one.
 */

let client: Sql | null = null;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "SUPABASE_DB_POOL_URL is not set, so there is nowhere to read or write. " +
        "Copy the transaction-pooler connection string from Supabase → Project " +
        "Settings → Database → Connection pooling, and set it on the host.",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

function connectionString(): string | null {
  return (
    process.env.SUPABASE_DB_POOL_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    null
  );
}

/** True when this deployment can reach a database at all. */
export function databaseConfigured(): boolean {
  return Boolean(connectionString());
}

export function db(): Sql {
  if (client) return client;

  const url = connectionString();
  if (!url) throw new DatabaseNotConfiguredError();

  client = postgres(url, {
    // See above: mandatory in transaction pooling mode.
    prepare: false,
    /*
     * One connection per function instance. A serverless instance handles one
     * request at a time, so a larger pool would only reserve pooler slots that
     * this instance cannot use while denying them to another instance.
     */
    max: 1,
    /*
     * Measured: the TLS and auth handshake to the pooler costs ~1.6s, while a
     * warm query costs ~140ms. Dropping the connection after twenty seconds
     * meant almost every page load paid that handshake again — it was the
     * single largest cost in a request, far outweighing the queries.
     *
     * Five minutes keeps it alive across a browsing session while still
     * releasing the pooler slot from an instance that has gone quiet.
     */
    idle_timeout: 300,
    connect_timeout: 10,
    ssl: "require",
    // Postgres returns numeric as a string to avoid float precision loss.
    // These are money; parse them explicitly at the boundary rather than
    // letting a string reach arithmetic somewhere downstream.
    types: {
      numeric: {
        to: 1700,
        from: [1700],
        serialize: (value: number | string) => String(value),
        parse: (value: string) => Number(value),
      },
    },
    onnotice: () => {
      // `create table if not exists` and friends are chatty on every cold
      // start. Real problems arrive as errors.
    },
  });

  return client;
}

/**
 * Whether the database is reachable right now, as opposed to merely
 * configured. Used by the health check and by the setup screens, which should
 * say "cannot connect" rather than failing on the first real query.
 */
export async function databaseReachable(): Promise<{ ok: boolean; error?: string }> {
  if (!databaseConfigured()) return { ok: false, error: new DatabaseNotConfiguredError().message };
  try {
    await db()`select 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
