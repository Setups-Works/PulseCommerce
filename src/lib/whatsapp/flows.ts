import { randomUUID } from "node:crypto";
import type { AudienceFilter } from "@/lib/audience";
import type { CustomerRecord } from "@/lib/analytics/types";
import { getStore } from "@/lib/store/kv";
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

const FLOW_PREFIX = "whatsapp-flow";
const STATE_PREFIX = "whatsapp-flow-state";
const INDEX_KEY = "whatsapp-flow-index";

const flowKey = (id: string) => `${FLOW_PREFIX}-${id}`;
const stateKey = (id: string) => `${STATE_PREFIX}-${id}`;

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

export async function readFlow(id: string): Promise<Flow | null> {
  try {
    const raw = await getStore().get(flowKey(id));
    return raw ? (JSON.parse(raw) as Flow) : null;
  } catch {
    return null;
  }
}

export async function writeFlow(flow: Flow): Promise<void> {
  flow.updatedAt = new Date().toISOString();
  await getStore().set(flowKey(flow.id), JSON.stringify(flow));
}

export async function readState(id: string): Promise<FlowState> {
  try {
    const raw = await getStore().get(stateKey(id));
    return raw ? (JSON.parse(raw) as FlowState) : emptyState(id);
  } catch {
    return emptyState(id);
  }
}

export async function writeState(state: FlowState): Promise<void> {
  await getStore().set(stateKey(state.flowId), JSON.stringify(state));
}

export async function listFlowIds(): Promise<string[]> {
  try {
    const raw = await getStore().get(INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createFlow(input: {
  name: string;
  entry: AudienceFilter;
  steps: FlowStep[];
  exitOn: FlowExit;
  status?: FlowStatus;
}): Promise<Flow> {
  const now = new Date().toISOString();
  const flow: Flow = {
    id: randomUUID(),
    name: input.name,
    // Draft by default: creating a flow and starting to send to thousands of
    // people should never be the same action.
    status: input.status ?? "draft",
    entry: input.entry,
    steps: input.steps,
    exitOn: input.exitOn,
    createdAt: now,
    updatedAt: now,
  };

  await writeFlow(flow);
  const ids = [flow.id, ...(await listFlowIds()).filter((x) => x !== flow.id)];
  await getStore().set(INDEX_KEY, JSON.stringify(ids));
  return flow;
}

export async function deleteFlow(id: string): Promise<void> {
  const ids = (await listFlowIds()).filter((x) => x !== id);
  await getStore().set(INDEX_KEY, JSON.stringify(ids));
  await getStore().delete(flowKey(id)).catch(() => {});
  await getStore().delete(stateKey(id)).catch(() => {});
}

export async function listFlows(): Promise<Flow[]> {
  const ids = await listFlowIds();
  const flows = await Promise.all(ids.map((id) => readFlow(id)));
  return flows.filter((f): f is Flow => f !== null);
}

/** What the UI shows about a flow without loading every enrolment. */
export function summarise(flow: Flow, state: FlowState) {
  return {
    id: flow.id,
    name: flow.name,
    status: flow.status,
    steps: flow.steps.length,
    exitOn: flow.exitOn,
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
