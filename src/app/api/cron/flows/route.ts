import { NextResponse } from "next/server";
import type { CustomerRecord } from "@/lib/analytics/types";
import { checkSendAllowance, recordSend } from "@/lib/billing/usage";
import { isNotConnected } from "@/lib/store/errors";
import { mediaFor, renderMessage, type BroadcastRecipient } from "@/lib/whatsapp/broadcast";
import { isSessionSendable, WhatsAppClient } from "@/lib/whatsapp/client";
import { isGatewayNotConnected } from "@/lib/whatsapp/errors";
import {
  advance,
  dueNow,
  flowsWithWork,
  readFlow,
  pendingEnrolments,
  readState,
  shouldExit,
  writeState,
  type Enrolment,
  type Flow,
  type FlowState,
} from "@/lib/whatsapp/flows";
import { readOptOutSet } from "@/lib/whatsapp/opt-out";
import { normalisePhone } from "@/lib/whatsapp/phone";
import { resolveAudience } from "@/lib/whatsapp/recipients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Advances every active flow.
 *
 * Driven by Vercel Cron rather than by a browser, because a flow's defining
 * feature is waiting days between steps and nobody keeps a tab open for that.
 *
 * Runs once a day (Vercel's Hobby plan allows no more), at an hour chosen so
 * messages land mid-morning rather than overnight. A step is therefore sent on
 * the first run after it comes due, which makes waitDays the granularity a flow
 * actually has.
 *
 * Everything here is idempotent against time, not against being run: what is
 * due is computed from stored timestamps, so a tick that is skipped, retried or
 * runs late sends the same messages, once, whenever it does run. A missed tick
 * delays a step. It cannot lose one, and it cannot double one, because an
 * enrolment is advanced only after its send returns.
 */
export async function POST(request: Request) {
  const denied = unauthorized(request);
  if (denied) return denied;

  const now = new Date();

  /*
   * Every tenant's flows, not one installation's.
   *
   * The scheduler has no session — it authenticates with CRON_SECRET — so it
   * cannot resolve a tenant the usual way and instead works from the flows
   * themselves, each of which knows its owner. `flowsWithWork` returns only
   * flows that are active and have somebody due, so a thousand idle tenants
   * cost one indexed query rather than a thousand audience resolutions.
   */
  const due = await flowsWithWork();
  if (due.length === 0) {
    return NextResponse.json({ ran: 0, flows: [], at: now.toISOString() });
  }

  const results = [];
  for (const { flowId, userId } of due) {
    const flow = await readFlow(userId, flowId);
    if (!flow || flow.status !== "active") continue;
    try {
      results.push(await tickFlow(userId, flow, now));
    } catch (error) {
      // One broken flow must not stop the others: a flow whose audience cannot
      // be resolved is a configuration problem, and the flows either side of it
      // still have customers waiting on a step.
      results.push({
        id: flow.id,
        name: flow.name,
        error: describe(error),
      });
    }
  }

  return NextResponse.json({ ran: results.length, flows: results, at: now.toISOString() });
}

/** Manual runs and monitoring. Same work, same guard. */
export async function GET(request: Request) {
  return POST(request);
}

/**
 * Cron authorisation.
 *
 * Vercel sends the project's CRON_SECRET as a bearer token. This endpoint sends
 * real messages to real customers, so an unset secret closes the route rather
 * than opening it — the failure mode of a missing environment variable must not
 * be "anyone on the internet can trigger the sends".
 */
function unauthorized(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set, so scheduled sending is disabled." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  return null;
}

async function tickFlow(userId: string, flow: Flow, now: Date) {
  const state = await readState(userId, flow.id);
  const resolved = await resolveAudience(userId, { filter: flow.entry });

  /*
   * A test flow addresses one hand-typed number and never reads the audience,
   * so trying a sequence out cannot reach a customer. The opt-out list still
   * applies: a number that asked not to be messaged is not a number to test on.
   */
  const recipients = flow.testPhone
    ? testRecipient(flow.testPhone, resolved.config.defaultDialCode, await readOptOutSet(userId))
    : resolved.recipients;

  // Reachability is resolved by the same code a broadcast uses, so a flow can
  // never address a number a broadcast would have refused.
  const byKey = new Map(recipients.map((r) => [r.key, r]));
  const customersByKey = new Map(resolved.allCustomers.map((c) => [c.key, c]));

  const enrolled = enrol(flow, state, recipients, now);
  const { exited, remaining } = flow.testPhone
    ? { exited: 0, remaining: state.active }
    : applyExits(flow, state, customersByKey);

  state.active = remaining;
  state.stats.exited += exited;

  const due = dueNow(state, now);
  let sent = 0;
  let failed = 0;
  let completed = 0;

  if (due.length > 0) {
    const client = new WhatsAppClient(resolved.config);

    /*
     * Checked once for the whole tick, not per recipient: a dead engine fails
     * every send, and finding that out sixty times over is sixty pointless
     * calls. Nothing is advanced when the session is down, so every due step
     * is still due on the next tick.
     */
    const session = await client.ensureSendable().catch(() => null);
    if (!session || !isSessionSendable(session)) {
      state.lastTickAt = now.toISOString();
      await writeState(userId, state);
      return {
        id: flow.id,
        name: flow.name,
        enrolled,
        sent: 0,
        completed: 0,
        exited,
        failed: 0,
        active: state.active.length,
        error: "WhatsApp session is not ready, so no step was sent.",
      };
    }

    for (const enrolment of due) {
      const recipient = byKey.get(enrolment.customerKey);
      const step = flow.steps[enrolment.step];

      /*
       * Someone who has become unreachable — opted out, phone removed, no
       * longer in the data window — is dropped rather than retried forever. It
       * counts as an exit, not a failure: nothing went wrong, they simply are
       * not a person this flow may message any more.
       */
      if (!recipient || !step) {
        state.active = state.active.filter((e) => e.customerKey !== enrolment.customerKey);
        state.stats.exited += 1;
        continue;
      }

      /*
       * A limit reached here stops the tick rather than skipping this one
       * enrolment: nothing is marked sent, advanced or exited, so it stays
       * due and the next tick (once the month rolls over) picks it up again.
       */
      if (!(await checkSendAllowance(userId)).allowed) break;

      try {
        await send(client, step.message, recipient);
        await recordSend(userId);
        sent += 1;

        const next = advance(enrolment, flow, now);
        if (next) {
          state.active = state.active.map((e) =>
            e.customerKey === enrolment.customerKey ? next : e,
          );
        } else {
          state.active = state.active.filter((e) => e.customerKey !== enrolment.customerKey);
          completed += 1;
        }
      } catch (error) {
        /*
         * A failed send does not advance the step, so the next tick tries the
         * same message again. The error is recorded on the enrolment so a
         * customer stuck behind a permanent failure is visible rather than
         * silently retried forever.
         */
        failed += 1;
        const message = describe(error);
        state.active = state.active.map((e) =>
          e.customerKey === enrolment.customerKey ? { ...e, error: message } : e,
        );
      }
    }
  }

  state.stats.sent += sent;
  state.stats.completed += completed;
  state.stats.failed += failed;
  state.lastTickAt = now.toISOString();
  await writeState(userId, state);

  return {
    id: flow.id,
    name: flow.name,
    enrolled,
    sent,
    completed,
    exited: exited,
    failed,
    active: state.active.length,
  };
}

/**
 * The single recipient of a test flow.
 *
 * Returns nobody when the number cannot be parsed or has opted out, which makes
 * a mistyped test a flow that sends nothing rather than one that sends
 * somewhere unintended.
 */
function testRecipient(
  phone: string,
  defaultDialCode: string,
  optedOut: Set<string>,
): BroadcastRecipient[] {
  const normalised = normalisePhone(phone, { defaultDialCode });
  if (!normalised || optedOut.has(normalised.e164)) return [];

  return [
    {
      key: `test:${normalised.e164}`,
      chatId: normalised.chatId,
      name: "",
      // Placeholders, since there is no customer behind a test number. A
      // template that leans on {{product}} shows that plainly rather than
      // inventing a purchase this person never made.
      vars: { orders: "0", store: "your store" },
    },
  ];
}

/** Adds anyone newly matching the entry filter, and records them as seen. */
function enrol(
  flow: Flow,
  state: FlowState,
  recipients: BroadcastRecipient[],
  now: Date,
): number {
  const first = flow.steps[0];
  if (!first) return 0;

  const candidates = recipients.map((r) => ({
    key: r.key,
    chatId: r.chatId,
    orders: Number(r.vars.orders ?? 0),
  }));

  const fresh = pendingEnrolments(candidates, state, now, first.waitDays);
  if (fresh.length === 0) return 0;

  state.active.push(...fresh);
  state.seen.push(...fresh.map((e) => e.customerKey));
  state.stats.enrolled += fresh.length;
  return fresh.length;
}

function applyExits(
  flow: Flow,
  state: FlowState,
  customersByKey: Map<string, CustomerRecord>,
): { exited: number; remaining: Enrolment[] } {
  if (flow.exitOn === "none") return { exited: 0, remaining: state.active };

  const remaining = state.active.filter(
    (e) => !shouldExit(e, customersByKey.get(e.customerKey), flow.exitOn),
  );

  return { exited: state.active.length - remaining.length, remaining };
}

async function send(
  client: WhatsAppClient,
  message: Flow["steps"][number]["message"],
  recipient: BroadcastRecipient,
): Promise<void> {
  const body = renderMessage(message, recipient);
  const media = mediaFor(message, recipient);

  if (message.type === "text" || !media) {
    await client.sendText(recipient.chatId, body);
    return;
  }

  if (message.type === "video") {
    await client.sendVideo(recipient.chatId, media, body);
    return;
  }

  await client.sendImage(recipient.chatId, media, body);
}

function describe(error: unknown): string {
  if (isNotConnected(error) || isGatewayNotConnected(error)) return error.message;
  return error instanceof Error ? error.message : "Unknown error.";
}
