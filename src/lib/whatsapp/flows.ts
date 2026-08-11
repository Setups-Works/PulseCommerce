import { randomUUID } from "node:crypto";
import type { AudienceFilter } from "@/lib/audience";
import type { CustomerRecord } from "@/lib/analytics/types";
import { db } from "@/lib/db/client";
import type { BroadcastMessage } from "./broadcast";

/**
 * Multi-step campaign flows.
 *
 * A broadcast is one message to a list, now. A flow is a sequence: enter an
 * audience, wait, send, wait, send, and leave early if the customer does the
 * thing the flow was trying to make them do. The difference that matters is
 * time — a flow spends most of its life waiting, which nothing in a serverless
 * request can do.
 *
 * So the same shape as the broadcast engine: all state is durable, and progress
 * happens in ticks driven by cron. A tick that never runs delays a step; it
 * cannot lose one, because what is due is computed from timestamps rather than
 * from having been awake at the right moment.
 *
 * What this deliberately is not: an inbound bot. Nothing here reacts to a
 * customer's reply. Flows are outbound and time-based, and they read the store
 * snapshot to decide who enters and who leaves.
 */

export interface FlowStep {
  /**
   * Days to wait before sending this step — from enrolment for the first step,
   * from the previous step's send for the rest. Zero sends on the next tick.
   */
  waitDays: number;
  message: BroadcastMessage;
}

/**
 * Why someone leaves a flow before finishing it.
 *
 * "ordered" is the one that matters: a win-back sequence that keeps nagging
 * someone who already came back is worse than not running at all.
 */
export type FlowExit = "none" | "ordered";

export type FlowStatus = "draft" | "active" | "paused";

export interface Flow {
  id: string;
  name: string;
  status: FlowStatus;
  /** Who enters. Evaluated against the snapshot on every tick. */
  entry: AudienceFilter;
  steps: FlowStep[];
  exitOn: FlowExit;
  /**
   * Test mode: every step goes to this one number and the entry audience is
   * ignored entirely.
   *
   * A flow is otherwise only addressable as a segment, which makes "try it and
   * see" mean "message real customers". This exists so the sequence, the timing
   * and the copy can be checked against your own phone first, and it is a
   * property of the flow rather than a runtime flag so a flow built as a test
   * cannot later be started against an audience by accident.
   */
  testPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Enrolment {
  customerKey: string;
  chatId: string;
  enrolledAt: string;
  /** Index of the next step to send. */
  step: number;
  /** When that step becomes due. */
  dueAt: string;
  /** Order count when they entered, which is what "ordered since" compares to. */
  ordersAtEntry: number;
  lastSentAt?: string;
  error?: string;
}

export interface FlowStats {
  enrolled: number;
  sent: number;
  completed: number;
  exited: number;
  failed: number;
}

export interface FlowState {
  flowId: string;
  /** In flight. Anyone finished, exited or failed is removed and counted. */
  active: Enrolment[];
  /**
   * Every customer key ever enrolled, so nobody enters twice.
   *
   * Kept as bare keys rather than whole enrolments: this has to persist for the
   * life of the flow, and it is the difference between a few hundred kilobytes
   * and several megabytes on a store with tens of thousands of customers.
   */
  seen: string[];
  stats: FlowStats;
  lastTickAt: string | null;
}

/**
 * Ceilings, so one tick cannot outgrow a serverless invocation.
 *
 * Anything not done this tick is done on the next one — a flow that enrols
 * slowly is correct, just slower, whereas a tick that times out mid-send leaves
 * state nobody can reason about.
 */
export const MAX_ENROLMENTS_PER_TICK = 500;
export const MAX_SENDS_PER_TICK = 60;
/** Total in flight at once, per flow. */
export const MAX_ACTIVE = 5_000;
export const MAX_STEPS = 10;

/*
 * Flows and their enrolments are two tables, not one document.
 *
 * The definition — name, steps, entry filter — is written whole and never
 * queried into, so it stays as jsonb. The enrolments are the opposite: one row
 * per customer, read by "who is due", written one at a time as people advance.
 *
 * As a single document they shared a read-modify-write cycle, and two
 * enrolments advancing in the same tick would overwrite each other. A row each
 * cannot collide, and "who is due now" becomes an index scan rather than
 * deserialising every enrolment in the flow to filter in JavaScript.
 */

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Timing. Pure, because this is the part that decides whether a real customer
// gets a message today or in three days, and it has to be checkable without a
// store, a gateway or a clock that happens to be right.
// ---------------------------------------------------------------------------

/** When a step waiting `waitDays` from `from` becomes due. */
export function dueAt(from: Date | string, waitDays: number): string {
  const base = typeof from === "string" ? new Date(from) : from;
  const days = Number.isFinite(waitDays) && waitDays > 0 ? waitDays : 0;
  return new Date(base.getTime() + days * DAY_MS).toISOString();
}

export function isDue(enrolment: Enrolment, now: Date): boolean {
  return new Date(enrolment.dueAt).getTime() <= now.getTime();
}

/**
 * Moves an enrolment past the step just sent.
 *
 * Returns null when the flow is finished for this person — the caller counts a
 * completion and drops them, rather than keeping a finished enrolment around
 * pretending to be in flight.
 */
export function advance(enrolment: Enrolment, flow: Flow, now: Date): Enrolment | null {
  const next = enrolment.step + 1;
  if (next >= flow.steps.length) return null;

  return {
    ...enrolment,
    step: next,
    // Measured from this send, not from enrolment: "wait three days" means
    // three days of silence, and a delayed tick must not compress the gap.
    dueAt: dueAt(now, flow.steps[next].waitDays),
    lastSentAt: now.toISOString(),
  };
}

/**
 * Whether this customer should leave the flow early.
 *
 * Compares against the order count recorded at entry rather than a date, so it
 * is true exactly when they have bought something since joining — no timezone
 * or snapshot-lag question to get wrong.
 */
export function shouldExit(
  enrolment: Enrolment,
  customer: CustomerRecord | undefined,
  exitOn: FlowExit,
): boolean {
  if (exitOn !== "ordered") return false;
  if (!customer) return false;
  return customer.orders > enrolment.ordersAtEntry;
}

/**
 * Who should be enrolled from the current audience.
 *
 * Anyone already seen is skipped for the life of the flow, so re-running the
 * entry filter every tick cannot re-enrol the same person. Capped twice: per
 * tick, and by how many are already in flight.
 */
export function pendingEnrolments(
  audience: { key: string; chatId: string; orders: number }[],
  state: FlowState,
  now: Date,
  firstStepWaitDays: number,
): Enrolment[] {
  const seen = new Set(state.seen);
  const room = Math.max(0, MAX_ACTIVE - state.active.length);
  const limit = Math.min(MAX_ENROLMENTS_PER_TICK, room);

  const fresh: Enrolment[] = [];
  for (const candidate of audience) {
    if (fresh.length >= limit) break;
    if (seen.has(candidate.key)) continue;

    fresh.push({
      customerKey: candidate.key,
      chatId: candidate.chatId,
      enrolledAt: now.toISOString(),
      step: 0,
      dueAt: dueAt(now, firstStepWaitDays),
      ordersAtEntry: candidate.orders,
    });
  }

  return fresh;
}

/** Due enrolments, oldest first, capped at what one tick will send. */
export function dueNow(state: FlowState, now: Date): Enrolment[] {
  return state.active
    .filter((e) => isDue(e, now))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, MAX_SENDS_PER_TICK);
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export function emptyState(flowId: string): FlowState {
  return {
    flowId,
    active: [],
    seen: [],
    stats: { enrolled: 0, sent: 0, completed: 0, exited: 0, failed: 0 },
    lastTickAt: null,
  };
}

interface FlowRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  definition: {
    entry: AudienceFilter;
    steps: FlowStep[];
    exitOn: FlowExit;
    testPhone?: string;
    stats?: FlowStats;
    lastTickAt?: string | null;
  };
  created_at: Date;
  updated_at: Date;
}

function toFlow(row: FlowRow): Flow {
  return {
    id: row.id,
    name: row.name,
    status: row.status as FlowStatus,
    entry: row.definition.entry,
    steps: row.definition.steps,
    exitOn: row.definition.exitOn,
    ...(row.definition.testPhone ? { testPhone: row.definition.testPhone } : {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function readFlow(userId: string, id: string): Promise<Flow | null> {
  try {
    const [row] = await db()<FlowRow[]>`
      select id, user_id, name, status, definition, created_at, updated_at
      from whatsapp_flows where id = ${id} and user_id = ${userId}
    `;
    return row ? toFlow(row) : null;
  } catch {
    return null;
  }
}

export async function writeFlow(userId: string, flow: Flow): Promise<void> {
  await db()`
    update whatsapp_flows set
      name = ${flow.name},
      status = ${flow.status},
      definition = ${db().json({
        entry: flow.entry,
        steps: flow.steps,
        exitOn: flow.exitOn,
        ...(flow.testPhone ? { testPhone: flow.testPhone } : {}),
      } as never)}
    where id = ${flow.id} and user_id = ${userId}
  `;
}

/**
 * The live state of a flow, assembled from its enrolment rows.
 *
 * `seen` is every customer ever enrolled, which is what stops the entry filter
 * re-enrolling somebody each tick. It is derived from the rows rather than
 * kept as a separate list, so the two can never disagree.
 */
export async function readState(userId: string, id: string): Promise<FlowState> {
  try {
    const rows = await db()<
      {
        customer_key: string;
        chat_id: string | null;
        step_index: number;
        status: string;
        orders_at_entry: number;
        enrolled_at: Date;
        last_sent_at: Date | null;
        due_at: Date | null;
      }[]
    >`
      select customer_key, chat_id, step_index, status, orders_at_entry,
             enrolled_at, last_sent_at, due_at
      from whatsapp_enrolments e
      where e.flow_id = ${id}
        and exists (select 1 from whatsapp_flows f
                    where f.id = e.flow_id and f.user_id = ${userId})
    `;

    const active: Enrolment[] = [];
    const seen: string[] = [];
    const stats: FlowStats = { enrolled: 0, sent: 0, completed: 0, exited: 0, failed: 0 };

    for (const row of rows) {
      seen.push(row.customer_key);
      stats.enrolled += 1;
      if (row.last_sent_at) stats.sent += 1;

      if (row.status === "active") {
        active.push({
          customerKey: row.customer_key,
          chatId: row.chat_id ?? "",
          enrolledAt: row.enrolled_at.toISOString(),
          step: row.step_index,
          dueAt: (row.due_at ?? row.enrolled_at).toISOString(),
          ordersAtEntry: row.orders_at_entry,
          ...(row.last_sent_at ? { lastSentAt: row.last_sent_at.toISOString() } : {}),
        });
      } else if (row.status === "completed") stats.completed += 1;
      else if (row.status === "exited") stats.exited += 1;
      else if (row.status === "failed") stats.failed += 1;
    }

    const [meta] = await db()<{ definition: { lastTickAt?: string | null } }[]>`
      select definition from whatsapp_flows where id = ${id} and user_id = ${userId}
    `;

    return { flowId: id, active, seen, stats, lastTickAt: meta?.definition?.lastTickAt ?? null };
  } catch {
    return emptyState(id);
  }
}

/**
 * Persists a tick's outcome.
 *
 * Each enrolment is written as its own upsert rather than the whole state
 * being replaced, which is the entire point of the table: a tick that fails
 * halfway has still advanced the people it got to, and a concurrent tick
 * cannot undo them.
 */
export async function writeState(userId: string, state: FlowState): Promise<void> {
  const owned = await db()`
    select 1 from whatsapp_flows where id = ${state.flowId} and user_id = ${userId}
  `;
  if (owned.length === 0) return;

  await db().begin(async (tx) => {
    for (const e of state.active) {
      await tx`
        insert into whatsapp_enrolments
          (flow_id, customer_key, chat_id, step_index, status, orders_at_entry, enrolled_at, last_sent_at, due_at)
        values (
          ${state.flowId}, ${e.customerKey}, ${e.chatId}, ${e.step}, 'active',
          ${e.ordersAtEntry}, ${e.enrolledAt}, ${e.lastSentAt ?? null}, ${e.dueAt}
        )
        on conflict (flow_id, customer_key) do update set
          step_index = excluded.step_index,
          status = 'active',
          last_sent_at = excluded.last_sent_at,
          due_at = excluded.due_at
      `;
    }

    // Anyone in `seen` but no longer active has left the flow. Recording that
    // is what keeps them from being re-enrolled by the entry filter.
    const activeKeys = new Set(state.active.map((e) => e.customerKey));
    const departed = state.seen.filter((k) => !activeKeys.has(k));
    if (departed.length) {
      await tx`
        update whatsapp_enrolments set status = 'completed'
        where flow_id = ${state.flowId}
          and customer_key in ${tx(departed)}
          and status = 'active'
      `;
    }

    await tx`
      update whatsapp_flows
      set definition = definition || ${tx.json({ lastTickAt: state.lastTickAt } as never)}
      where id = ${state.flowId}
    `;
  });
}

export async function createFlow(
  userId: string,
  input: {
    name: string;
    entry: AudienceFilter;
    steps: FlowStep[];
    exitOn: FlowExit;
    testPhone?: string;
    status?: FlowStatus;
  },
): Promise<Flow> {
  const [row] = await db()<FlowRow[]>`
    insert into whatsapp_flows (user_id, name, status, definition)
    values (
      ${userId},
      ${input.name},
      -- Draft by default: creating a flow and starting to send to thousands of
      -- people should never be the same action.
      ${input.status ?? "draft"},
      ${db().json({
        entry: input.entry,
        steps: input.steps,
        exitOn: input.exitOn,
        ...(input.testPhone ? { testPhone: input.testPhone } : {}),
      } as never)}
    )
    returning id, user_id, name, status, definition, created_at, updated_at
  `;
  return toFlow(row);
}

export async function deleteFlow(userId: string, id: string): Promise<void> {
  // Enrolments go with it through the cascade.
  await db()`delete from whatsapp_flows where id = ${id} and user_id = ${userId}`;
}

export async function listFlows(userId: string): Promise<Flow[]> {
  const rows = await db()<FlowRow[]>`
    select id, user_id, name, status, definition, created_at, updated_at
    from whatsapp_flows where user_id = ${userId}
    order by created_at desc
  `;
  return rows.map(toFlow);
}

/** Flows with at least one enrolment due, for the scheduler. */
export async function flowsWithWork(): Promise<{ flowId: string; userId: string }[]> {
  const rows = await db()<{ id: string; user_id: string }[]>`
    select distinct f.id, f.user_id
    from whatsapp_flows f
    where f.status = 'active'
      and (
        -- Either somebody is due a step...
        exists (select 1 from whatsapp_enrolments e
                where e.flow_id = f.id and e.status = 'active'
                  and e.due_at is not null and e.due_at <= now())
        -- ...or the flow has never run, so its entry filter needs evaluating.
        or not exists (select 1 from whatsapp_enrolments e where e.flow_id = f.id)
      )
  `;
  return rows.map((r) => ({ flowId: r.id, userId: r.user_id }));
}

/** What the UI shows about a flow without loading every enrolment. */
export function summarise(flow: Flow, state: FlowState) {
  return {
    id: flow.id,
    name: flow.name,
    status: flow.status,
    steps: flow.steps.length,
    exitOn: flow.exitOn,
    testPhone: flow.testPhone ?? null,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
    active: state.active.length,
    stats: state.stats,
    lastTickAt: state.lastTickAt,
    /** Soonest step still to go out, so a quiet flow can be told from a stuck one. */
    nextDueAt:
      state.active.length === 0
        ? null
        : state.active.reduce((soonest, e) => (e.dueAt < soonest ? e.dueAt : soonest), state.active[0].dueAt),
  };
}
