import { db } from "@/lib/db/client";
import { currentUser, type CurrentUser } from "@/lib/supabase/server";
import { verifyApiKey, readPresentedKey, type Scope } from "./api-key";
import { USER_EMAIL_HEADER, USER_ID_HEADER } from "./headers";

/**
 * Who is making this request, and which store they may touch.
 *
 * This exists because the server reaches Postgres as the table owner, over the
 * transaction pooler, and table owners bypass row level security. That is not
 * an oversight — the WooCommerce callback and the scheduler both have to write
 * without a user session — but it does mean the policies protecting tenants
 * from each other do not apply on this path.
 *
 * So the server has to scope its own queries, and the way to make that
 * reliable is to have exactly one place that answers "whose data is this?".
 * Every handler resolves a tenant here and passes its `storeId` into queries.
 * A handler that forgets cannot accidentally read another tenant's rows,
 * because without a storeId it has nothing to query by.
 *
 * ─── Two kinds of caller ───────────────────────────────────────────────────
 *
 * A browser carries a Supabase session cookie. A script carries an API key.
 * Both resolve to the same thing: a user id, and the store that user has
 * active. The rest of the application does not need to know which it was.
 */

export interface Tenant {
  userId: string;
  email: string;
  /** How the caller authenticated. */
  via: "session" | "api-key";
  /** Scopes, when authenticated by key. A session may do anything. */
  scopes: Scope[];
  user: CurrentUser | null;
}

export interface TenantStore {
  id: string;
  url: string;
  name: string | null;
  consumerKey: string;
  consumerSecret: string;
  historyMonths: number;
  maxPages: number;
  syncedThrough: string | null;
  lastSyncAt: string | null;
  orderCount: number;
}

/**
 * Resolves the caller.
 *
 * Session first: it is the common case, and checking it costs one validated
 * token rather than a database round trip.
 */
export async function resolveTenant(request?: Request): Promise<Tenant | null> {
  /*
   * Proxy has already validated this request and written the caller into a
   * header it strips from anything inbound. Trusting that is what avoids a
   * second round trip to the Auth server on every API call — the single
   * largest cost in a request that otherwise does one indexed query.
   *
   * The header is only safe because Proxy runs on every matched path and
   * deletes any client-supplied copy. Nothing else may set it.
   */
  const forwardedId = request?.headers.get(USER_ID_HEADER);
  if (forwardedId) {
    const email = request?.headers.get(USER_EMAIL_HEADER) ?? "";
    const scopes = readScopes(request);
    return {
      userId: forwardedId,
      email,
      via: scopes ? "api-key" : "session",
      scopes: scopes ?? ["read", "write"],
      user: null,
    };
  }

  /*
   * No header: a server component, or a route Proxy does not match. Falls back
   * to asking the Auth server directly.
   */
  const user = await currentUser();
  if (user) {
    return { userId: user.id, email: user.email, via: "session", scopes: ["read", "write"], user };
  }

  if (!request) return null;

  const presented = readPresentedKey(request.headers);
  if (!presented) return null;

  const key = await verifyApiKey(presented);
  if (!key) return null;

  return {
    userId: key.userId,
    email: key.ownerEmail ?? "",
    via: "api-key",
    scopes: key.scopes,
    user: null,
  };
}

/**
 * Scopes, when Proxy authenticated by API key rather than session.
 *
 * Absent for a session, which may do anything. Present and possibly narrow for
 * a key — and the distinction is what `requireWrite` checks, so a read-only
 * key must not be mistaken for a session.
 */
function readScopes(request?: Request): Scope[] | null {
  const raw = request?.headers.get("x-pulse-scopes");
  if (!raw) return null;
  const scopes = raw.split(",").filter((s): s is Scope => s === "read" || s === "write");
  return scopes.length ? scopes : ["read"];
}

/** The store a tenant is currently working with, or null if none connected. */
export async function activeStore(userId: string): Promise<TenantStore | null> {
  const [row] = await db()<
    {
      id: string;
      url: string;
      name: string | null;
      consumer_key: string;
      consumer_secret: string;
      history_months: number;
      max_pages: number;
      synced_through: Date | null;
      last_sync_at: Date | null;
      order_count: number;
    }[]
  >`
    select id, url, name, consumer_key, consumer_secret, history_months,
           max_pages, synced_through, last_sync_at, order_count
    from stores
    where user_id = ${userId}
    order by is_active desc, updated_at desc
    limit 1
  `;

  if (!row) return null;

  return {
    id: row.id,
    url: row.url,
    name: row.name,
    consumerKey: row.consumer_key,
    consumerSecret: row.consumer_secret,
    historyMonths: row.history_months,
    maxPages: row.max_pages,
    syncedThrough: row.synced_through?.toISOString() ?? null,
    lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    orderCount: row.order_count,
  };
}

/**
 * Confirms a store belongs to a user before anything touches it.
 *
 * Used wherever a store id arrives from the client — a store switcher, a sync
 * trigger. A uuid from a request body is an assertion, not a fact, and this is
 * what turns it into one.
 */
export async function ownsStore(userId: string, storeId: string): Promise<boolean> {
  const rows = await db()`
    select 1 from stores where id = ${storeId} and user_id = ${userId}
  `;
  return rows.length > 0;
}

/* ── Route helpers ────────────────────────────────────────────────────────
 *
 * Handlers get the tenant and, where they need it, the store, or they get a
 * response to return. Returning the failure rather than throwing it means a
 * handler cannot forget a catch, and the discriminated union means TypeScript
 * will not let it read `.tenant` without having checked.
 */

type Resolved<T> = { ok: true; value: T } | { ok: false; response: Response };

function fail(body: Record<string, unknown>, status: number): { ok: false; response: Response } {
  return {
    ok: false,
    response: Response.json({ ...body, docs: "/api-docs" }, { status }),
  };
}

/** The caller, or a 401. */
export async function requireTenant(request?: Request): Promise<Resolved<Tenant>> {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return fail(
      {
        error: "Authentication required.",
        hint: "Sign in, or send an API key as `Authorization: Bearer pc_live_…`.",
      },
      401,
    );
  }
  return { ok: true, value: tenant };
}

/**
 * The caller and their active store, or a 401 / 409.
 *
 * Most endpoints need both, and needing both is the common reason a handler
 * would otherwise write its own scoping and get it subtly wrong.
 */
export async function requireStore(
  request?: Request,
): Promise<Resolved<{ tenant: Tenant; store: TenantStore }>> {
  const resolved = await requireTenant(request);
  if (!resolved.ok) return resolved;

  const store = await activeStore(resolved.value.userId);
  if (!store) {
    return fail(
      {
        error: "No WooCommerce store is connected yet.",
        code: "not_connected",
        hint: "Connect one from Settings → Store.",
      },
      409,
    );
  }

  return { ok: true, value: { tenant: resolved.value, store } };
}

/** A write-scope check for handlers that act rather than read. */
export function requireWrite(tenant: Tenant): Response | null {
  if (tenant.scopes.includes("write")) return null;
  return Response.json(
    {
      error: 'This key does not have the "write" scope.',
      hint: "Issue a key with write scope to call this endpoint.",
      docs: "/api-docs",
    },
    { status: 403 },
  );
}
