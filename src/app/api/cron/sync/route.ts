import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { forgetSnapshot } from "@/lib/woo/mirror";
import { syncStore } from "@/lib/woo/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Syncs every connected store. Called by Supabase's scheduler.
 *
 * Authenticates with CRON_SECRET as a bearer token — the scheduler has no
 * session and no API key, and this endpoint reads every tenant's credentials,
 * so it must not be reachable without it.
 */
function unauthorized(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set, so scheduled sync is disabled." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";

  // Constant-time compare: a timing signal here is a way to guess the secret.
  if (presented.length !== secret.length) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= presented.charCodeAt(i) ^ secret.charCodeAt(i);
  if (diff !== 0) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  return null;
}

export async function POST(request: Request) {
  const denied = unauthorized(request);
  if (denied) return denied;

  /*
   * Ordered by staleness, so a run that cannot finish every store still makes
   * progress on the ones furthest behind rather than repeatedly syncing the
   * same few. `nulls first` puts never-synced stores at the front.
   */
  const stores = await db()<
    {
      id: string;
      url: string;
      name: string | null;
      consumer_key: string;
      consumer_secret: string;
      history_months: number;
      max_pages: number;
    }[]
  >`
    select id, url, name, consumer_key, consumer_secret, history_months, max_pages
    from stores
    order by last_sync_at asc nulls first
    limit 25
  `;

  const results = [];
  for (const store of stores) {
    try {
      const result = await syncStore(store.id, {
        id: store.id,
        url: store.url,
        name: store.name ?? undefined,
        consumerKey: store.consumer_key,
        consumerSecret: store.consumer_secret,
        historyMonths: store.history_months,
        maxPages: store.max_pages,
      });
      forgetSnapshot(store.id);
      results.push({ store: store.url, ok: true, ...result });
    } catch (error) {
      // One unreachable store must not stop the rest: a merchant who revoked
      // their key should not stall everybody else's figures.
      results.push({
        store: store.url,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ ran: results.length, results });
}

/** Same work, for schedulers that can only issue a GET. */
export async function GET(request: Request) {
  return POST(request);
}
