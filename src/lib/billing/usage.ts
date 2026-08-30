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

export interface BillingProfile {
  plan: "go" | "plus" | null;
  subscription_status: string;
  grace_until: Date | null;
  legacy_unlimited: boolean;
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM", UTC
}

/**
 * The monthly message cap a profile is actually entitled to right now, with
 * no regard for how many it's already sent — null means unlimited, 0 means
 * "no active plan, nothing goes out."
 *
 * The one place this policy is written down. `checkSendAllowance` (the send
 * gate) and `/api/billing/status` (what Settings → Billing displays) both
 * call this rather than each hand-rolling their own version of "is this
 * account entitled to send" — status/route.ts used to default anyone who
 * wasn't unlimited to the Go 10,000 figure, which quietly showed "9,998
 * remaining" to an account with no plan at all.
 */
export function planMessageLimit(profile: BillingProfile): number | null {
  if (profile.legacy_unlimited || profile.plan === "plus") return null;

  const inGrace = profile.grace_until !== null && profile.grace_until.getTime() > Date.now();
  const usable = profile.plan === "go" && (profile.subscription_status === "active" || inGrace);
  return usable ? GO_MONTHLY_LIMIT : 0;
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
  const rows = await db()<BillingProfile[]>`
    select plan, subscription_status, grace_until, legacy_unlimited
    from profiles
    where id = ${userId}
  `;
  const profile = rows[0];

  if (!profile) return { allowed: false, remaining: 0, reason: "No account found." };

  const limit = planMessageLimit(profile);
  if (limit === null) return { allowed: true, remaining: null };

  if (limit === 0) {
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
  const remaining = Math.max(0, limit - sent);

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
