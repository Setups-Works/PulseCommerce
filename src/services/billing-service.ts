import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * What the caller's plan allows.
 *
 * The UI asks this before offering an action; the database enforces the same
 * limits with triggers and policies. Both are needed and they do different
 * jobs — this one produces a good error message, the database one makes the
 * limit actually true when something skips the service layer.
 *
 * Self-hosted deployments have no billing, so every limit is unlimited. That
 * is not a loophole: there is one merchant, they are running it on their own
 * infrastructure, and there is nothing to meter.
 */

export interface Entitlements {
  planSlug: string;
  status: string;
  isActive: boolean;
  maxStores: number | null;
  maxOrders: number | null;
  maxHistoryMonths: number | null;
  maxTeamMembers: number | null;
  maxMessagesPerMonth: number | null;
  aiAssistant: boolean;
  automatedFlows: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

/** Self-hosted: one merchant, their own hardware, nothing to meter. */
const UNLIMITED: Entitlements = {
  planSlug: "self-hosted",
  status: "active",
  isActive: true,
  maxStores: null,
  maxOrders: null,
  maxHistoryMonths: null,
  maxTeamMembers: null,
  maxMessagesPerMonth: null,
  aiAssistant: true,
  automatedFlows: true,
  apiAccess: true,
  prioritySupport: false,
};

export const getEntitlements = cache(async (): Promise<Entitlements> => {
  if (!isSupabaseConfigured()) return UNLIMITED;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("current_entitlements").maybeSingle();
    if (error || !data) return UNLIMITED;

    return {
      planSlug: data.plan_slug ?? "growth",
      status: data.status ?? "trialing",
      isActive: data.is_active ?? true,
      maxStores: data.max_stores,
      maxOrders: data.max_orders,
      maxHistoryMonths: data.max_history_months,
      maxTeamMembers: data.max_team_members,
      maxMessagesPerMonth: data.max_messages_per_month,
      aiAssistant: data.ai_assistant ?? true,
      automatedFlows: data.automated_flows ?? true,
      apiAccess: data.api_access ?? true,
      prioritySupport: data.priority_support ?? false,
    };
  } catch {
    // A billing lookup that fails should not take the product down. Failing
    // open is the right direction here: the database triggers still hold the
    // hard limits, so the worst case is a customer briefly seeing an action
    // offered that the database then refuses.
    return UNLIMITED;
  }
});

export interface LimitCheck {
  allowed: boolean;
  used: number;
  limit: number | null;
  /** Present when `allowed` is false. Written for a person, not a log. */
  reason?: string;
}

/**
 * Whether the caller may connect another store.
 *
 * Counts against `stores` through the caller's own client, so row level
 * security scopes the count to their organization without this function
 * naming the organization at all.
 */
export async function canConnectStore(): Promise<LimitCheck> {
  const entitlements = await getEntitlements();
  if (entitlements.maxStores === null) return { allowed: true, used: 0, limit: null };

  if (!isSupabaseConfigured()) return { allowed: true, used: 0, limit: null };

  const supabase = await createClient();
  const { count } = await supabase.from("stores").select("*", { count: "exact", head: true });
  const used = count ?? 0;

  if (used >= entitlements.maxStores) {
    return {
      allowed: false,
      used,
      limit: entitlements.maxStores,
      reason:
        `The ${entitlements.planSlug} plan includes ${entitlements.maxStores} ` +
        `connected store${entitlements.maxStores === 1 ? "" : "s"}, and you are using ${used}. ` +
        `Upgrade, or disconnect one first.`,
    };
  }

  return { allowed: true, used, limit: entitlements.maxStores };
}

/**
 * Clamps a requested history window to what the plan allows.
 *
 * Returns the clamped value rather than refusing, because the useful behaviour
 * when someone on a twelve-month plan asks for thirty-six is to give them
 * twelve and say so — not to error.
 */
export async function clampHistoryMonths(requested: number): Promise<{
  months: number;
  clamped: boolean;
  limit: number | null;
}> {
  const { maxHistoryMonths } = await getEntitlements();
  if (maxHistoryMonths === null || requested <= maxHistoryMonths) {
    return { months: requested, clamped: false, limit: maxHistoryMonths };
  }
  return { months: maxHistoryMonths, clamped: true, limit: maxHistoryMonths };
}

/** Feature switches, for hiding a control the plan does not include. */
export async function hasFeature(
  feature: "aiAssistant" | "automatedFlows" | "apiAccess",
): Promise<boolean> {
  const entitlements = await getEntitlements();
  return entitlements.isActive && entitlements[feature];
}
