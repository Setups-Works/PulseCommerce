import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { decryptSecret, encryptSecret } from "@/lib/store/crypto";
import type { StoreConfig } from "@/lib/store/types";

/**
 * Store connections, per tenant.
 *
 * Every query here runs as the signed-in user through the anon key, so row
 * level security decides which rows exist — this module never adds an
 * `organization_id` filter of its own. That is the point: a forgotten filter
 * would be a cross-tenant leak, whereas a forgotten filter against RLS is a
 * query that simply returns nothing.
 *
 * Secrets are decrypted on the way out and encrypted on the way in, so callers
 * only ever handle a plain `StoreConfig` and cannot accidentally persist a
 * plaintext credential.
 */

/** Reads are cached per request: several screens ask for the active store. */
export const readActiveStore = cache(async (): Promise<StoreConfig | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;

    const secret = await decryptSecret(data.consumer_secret_encrypted);
    // A secret that will not decrypt means the encryption key was rotated.
    // Treating the store as disconnected is the honest outcome — the merchant
    // is told to reconnect rather than shown an empty dashboard.
    if (!secret) return null;

    return toConfig(data, secret);
  } catch {
    return null;
  }
});

export const listTenantStores = cache(async (): Promise<StoreConfig[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    const configs = await Promise.all(
      data.map(async (row) => {
        const secret = await decryptSecret(row.consumer_secret_encrypted);
        return secret ? toConfig(row, secret) : null;
      }),
    );
    return configs.filter((c): c is StoreConfig => c !== null);
  } catch {
    return [];
  }
});

/**
 * Adds a store, or replaces its credentials if it is already connected, and
 * makes it active.
 *
 * The window settings a merchant already chose are preserved on re-authorise:
 * reconnecting after an expired key should not silently reset their history
 * window back to the default and trigger a much larger re-pull.
 */
export async function upsertTenantStore(config: StoreConfig): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.user.id)
      .maybeSingle();

    if (!profile?.organization_id) return false;

    const { data: existing } = await supabase
      .from("stores")
      .select("history_months, max_pages")
      .eq("url", config.url)
      .maybeSingle();

    const { error } = await supabase.from("stores").upsert(
      {
        organization_id: profile.organization_id,
        url: config.url,
        name: config.name ?? null,
        consumer_key: config.consumerKey,
        consumer_secret_encrypted: await encryptSecret(config.consumerSecret),
        history_months: existing?.history_months ?? config.historyMonths,
        max_pages: existing?.max_pages ?? config.maxPages,
        is_active: true,
        connected_by: user.user.id,
      },
      { onConflict: "organization_id,url" },
    );

    return !error;
  } catch {
    return false;
  }
}

/**
 * Saves a connection on behalf of an organization, with no session involved.
 *
 * For the WooCommerce callback only. That leg is a server-to-server POST from
 * the merchant's store — there are no cookies, so RLS has no `auth.uid()` to
 * work with and the ordinary client would write nothing.
 *
 * Uses the service-role client, which bypasses RLS. That is safe here and
 * nowhere else: `organizationId` comes from a state token this application
 * signed and then verified, not from anything the caller sent. Passing a
 * caller-supplied organization id into this function would be a cross-tenant
 * write, so do not.
 */
export async function upsertStoreForOrganization(
  organizationId: string,
  config: StoreConfig,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("stores")
      .select("history_months, max_pages")
      .eq("organization_id", organizationId)
      .eq("url", config.url)
      .maybeSingle();

    const { error } = await admin.from("stores").upsert(
      {
        organization_id: organizationId,
        url: config.url,
        name: config.name ?? null,
        consumer_key: config.consumerKey,
        consumer_secret_encrypted: await encryptSecret(config.consumerSecret),
        history_months: existing?.history_months ?? config.historyMonths,
        max_pages: existing?.max_pages ?? config.maxPages,
        is_active: true,
      },
      { onConflict: "organization_id,url" },
    );

    // The plan's store limit is a database trigger, so an over-limit connection
    // fails here rather than being silently allowed by the admin client.
    if (error) {
      console.error("[stores] could not save connection", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function setActiveTenantStore(url: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    // The database trigger deactivates the previous one, so this is a single
    // atomic statement rather than a deactivate-then-activate pair that could
    // leave the tenant with no active store if the second half failed.
    const { error } = await supabase.from("stores").update({ is_active: true }).eq("url", url);
    return !error;
  } catch {
    return false;
  }
}

export async function removeTenantStore(url: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("stores").delete().eq("url", url);
    if (error) return false;

    // Deleting the active store leaves the tenant with none. Promote the
    // oldest remaining one so the dashboard has something to read.
    const { data: remaining } = await supabase
      .from("stores")
      .select("url, is_active")
      .order("created_at", { ascending: true });

    if (remaining && remaining.length > 0 && !remaining.some((s) => s.is_active)) {
      await supabase.from("stores").update({ is_active: true }).eq("url", remaining[0].url);
    }
    return true;
  } catch {
    return false;
  }
}

interface StoreRow {
  organization_id: string;
  url: string;
  name: string | null;
  consumer_key: string;
  history_months: number;
  max_pages: number;
  updated_at: string;
}

function toConfig(row: StoreRow, consumerSecret: string): StoreConfig {
  return {
    tenantId: row.organization_id,
    url: row.url,
    name: row.name ?? undefined,
    consumerKey: row.consumer_key,
    consumerSecret,
    historyMonths: row.history_months,
    maxPages: row.max_pages,
    updatedAt: row.updated_at,
  };
}
