import { db } from "@/lib/db/client";

/**
 * The monthly message-send gate.
 *
 * No shared middleware — matching src/lib/whatsapp/opt-out.ts's own
 * discipline, explained in src/lib/whatsapp/CLAUDE.md: every send path
 * checks this explicitly, inline, rather than routing through a wrapper.
 * There are exactly five call sites; see AGENTS.md / the billing plan for
 * the full list.
 */

const GO_MONTHLY_LIMIT = 10_000;

export interface SendAllowance {
  allowed: boolean;
  /** null means unlimited (Plus, or a grandfathered legacy account). */
  remaining: number | null;
  reason?: string;
}

interface ProfileRow {
  plan: "go" | "plus" | null;
  subscription_status: string;
  grace_until: Date | null;
  legacy_unlimited: boolean;
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM", UTC
}

/**
 * Whether `userId` may send `count` more messages this month.
 *
 * Policy, in order:
 *  - Grandfathered (pre-billing) accounts and Plus subscribers: unlimited.
 *  - Go, with a live or gracing subscription: allowed while this month's
 *    count is under 10,000. `past_due` still sends — a bounced UPI debit
 *    gets a few days before anything is cut off, not an instant block.
 *  - Everything else (no plan, or a status Razorpay itself has given up on)
 *    is a real "subscribe to send" state, not a bug to route around.
 */
export async function checkSendAllowance(userId: string, count = 1): Promise<SendAllowance> {
  const rows = await db()<ProfileRow[]>`
    select plan, subscription_status, grace_until, legacy_unlimited
    from profiles
    where id = ${userId}
  `;
  const profile = rows[0];

  if (!profile) return { allowed: false, remaining: 0, reason: "No account found." };
  if (profile.legacy_unlimited || profile.plan === "plus") {
    return { allowed: true, remaining: null };
  }

  const inGrace = profile.grace_until !== null && profile.grace_until.getTime() > Date.now();
  const usable = profile.plan === "go" && (profile.subscription_status === "active" || inGrace);

  if (!usable) {
    return {
      allowed: false,
      remaining: 0,
      reason:
        profile.plan === "go"
          ? "The subscription is not active. Check Settings → Billing."
          : "No active plan. Subscribe in Settings → Billing to send WhatsApp messages.",
    };
  }

  const [usage] = await db()<{ sent_count: number }[]>`
    select sent_count from whatsapp_usage where user_id = ${userId} and period = ${currentPeriod()}
  `;
  const sent = usage?.sent_count ?? 0;
  const remaining = Math.max(0, GO_MONTHLY_LIMIT - sent);

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, reason: "This month's 10,000-message limit has been reached." };
  }
  return { allowed: remaining >= count, remaining };
}

/** Records `count` messages actually sent this month. Call only after a send succeeds. */
export async function recordSend(userId: string, count = 1): Promise<void> {
  await db()`
    insert into whatsapp_usage (user_id, period, sent_count)
    values (${userId}, ${currentPeriod()}, ${count})
    on conflict (user_id, period)
    do update set sent_count = whatsapp_usage.sent_count + excluded.sent_count, updated_at = now()
  `;
}
