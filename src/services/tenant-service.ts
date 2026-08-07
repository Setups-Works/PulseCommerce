import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * The caller's tenant.
 *
 * One place that answers "which organization is this request for". Everything
 * tenant-scoped resolves it through here rather than re-deriving it, so there
 * is a single definition of the boundary to audit.
 *
 * Returns null when Supabase is not configured — that is the self-hosted case,
 * where there is one merchant and no tenancy to establish. Callers treat null
 * as "single-tenant mode" rather than as an error.
 */
export const currentOrganizationId = cache(async (): Promise<string | undefined> => {
  if (!isSupabaseConfigured()) return undefined;

  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return undefined;

    const { data } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", auth.user.id)
      .maybeSingle();

    return data?.organization_id ?? undefined;
  } catch {
    return undefined;
  }
});
