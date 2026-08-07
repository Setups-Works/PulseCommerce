"use server";

import { revalidatePath } from "next/cache";
import { listStores, removeStore, setActiveStore } from "@/lib/store/config";
import { invalidateSnapshotCache } from "@/lib/store/snapshot";
import { getProfile } from "@/services/auth-service";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * A customer managing their own store connections.
 *
 * Distinct from the admin CMS actions: these are performed by a `customer` on
 * their own tenant, so the capability model does not apply. Row level security
 * is the boundary — every call runs as the signed-in user, and the policies on
 * `public.stores` scope it to their organization without these functions
 * naming an organization at all.
 *
 * A signed-in check is still here rather than relying on RLS alone, because
 * "not signed in" should say so rather than looking like "you have no stores".
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireAccount(): Promise<ActionResult | null> {
  if (!isSupabaseConfigured()) {
    // Self-hosted: one merchant, no accounts, and the store is managed from
    // the existing settings screen rather than here.
    return { ok: false, error: "Account-based store management needs Supabase configured." };
  }
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "You are not signed in." };
  return null;
}

/**
 * Switches which store the dashboard reads.
 *
 * The snapshot cache is keyed per tenant and per store, so switching does not
 * need to clear anything — the other store's snapshot stays valid and is there
 * instantly when they switch back.
 */
export async function activateStore(url: string): Promise<ActionResult> {
  const denied = await requireAccount();
  if (denied) return denied;

  const result = await setActiveStore(url);
  if (!result) return { ok: false, error: "That store is not connected to this account." };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Disconnects a store and discards everything derived from it.
 *
 * The cached snapshot goes with the credentials, deliberately. Leaving it
 * would mean a merchant who disconnected could still see their order history
 * on the dashboard, which is the opposite of what disconnecting means — and
 * the product promises elsewhere that disconnecting wipes every cached order.
 */
export async function disconnectStore(url: string): Promise<ActionResult> {
  const denied = await requireAccount();
  if (denied) return denied;

  try {
    /*
     * Invalidate before removing, not after. The cache key is derived from the
     * store's config, so once the row is gone there is nothing left to compute
     * the key from and the cached snapshot would be orphaned — readable by the
     * next request that happened to reconnect the same store.
     */
    const { stores } = await listStores();
    const target = stores.find((store) => store.url === url);
    if (target) await invalidateSnapshotCache([target]);

    await removeStore(url);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not disconnect that store.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
