import { expect, test } from "@playwright/test";
import {
  advance,
  dueAt,
  dueNow,
  emptyState,
  isDue,
  pendingEnrolments,
  shouldExit,
  MAX_SENDS_PER_TICK,
  type Enrolment,
  type Flow,
} from "@/lib/whatsapp/flows";

/**
 * The scheduling logic, tested directly.
 *
 * This is the part that decides whether a real customer is messaged today or in
 * three days, and whether they are messaged twice. It is pure on purpose so it
 * can be checked without a store, a gateway, or waiting three days.
 */

const NOW = new Date("2026-08-02T10:00:00.000Z");

function flow(steps: number[], exitOn: Flow["exitOn"] = "ordered"): Flow {
  return {
    id: "f1",
    name: "Test flow",
    status: "active",
    entry: {} as Flow["entry"],
    steps: steps.map((waitDays) => ({
      waitDays,
      message: { type: "text" as const, text: "hi" },
    })),
    exitOn,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  };
}

function enrolment(over: Partial<Enrolment> = {}): Enrolment {
  return {
    customerKey: "c1",
    chatId: "911111111111@c.us",
    enrolledAt: NOW.toISOString(),
    step: 0,
    dueAt: NOW.toISOString(),
    ordersAtEntry: 2,
    ...over,
  };
}

test.describe("when a step comes due", () => {
  test("waiting three days lands three days later", () => {
    expect(dueAt(NOW, 3)).toBe("2026-08-05T10:00:00.000Z");
  });

  test("a zero wait is due immediately, not skipped", () => {
    expect(isDue(enrolment({ dueAt: dueAt(NOW, 0) }), NOW)).toBe(true);
  });

  test("a negative or nonsense wait cannot pull a send into the past", () => {
    expect(dueAt(NOW, -5)).toBe(NOW.toISOString());
    expect(dueAt(NOW, Number.NaN)).toBe(NOW.toISOString());
  });

  test("a step one second in the future is not yet due", () => {
    const soon = new Date(NOW.getTime() + 1000).toISOString();
    expect(isDue(enrolment({ dueAt: soon }), NOW)).toBe(false);
  });
});

test.describe("advancing through the steps", () => {
  test("the next wait is measured from this send, not from enrolment", () => {
    /*
     * The distinction that matters when a tick runs late. Enrolled on the 2nd,
     * step two waits 3 days, but the send only happened on the 6th — step two
     * is due on the 9th, not the 5th. Measuring from enrolment would fire two
     * messages almost at once to make up lost time.
     */
    const late = new Date("2026-08-06T10:00:00.000Z");
    const next = advance(enrolment({ step: 0 }), flow([0, 3]), late);

    expect(next?.step).toBe(1);
    expect(next?.dueAt).toBe("2026-08-09T10:00:00.000Z");
  });

  test("the last step finishes the flow rather than looping", () => {
    expect(advance(enrolment({ step: 1 }), flow([0, 3]), NOW)).toBeNull();
  });
});

test.describe("who leaves early", () => {
  test("someone who ordered after joining is dropped", () => {
    const customer = { orders: 3 } as never;
    expect(shouldExit(enrolment({ ordersAtEntry: 2 }), customer, "ordered")).toBe(true);
  });

  test("an unchanged order count keeps them in", () => {
    const customer = { orders: 2 } as never;
    expect(shouldExit(enrolment({ ordersAtEntry: 2 }), customer, "ordered")).toBe(false);
  });

  test("exitOn none keeps everyone, however much they buy", () => {
    const customer = { orders: 99 } as never;
    expect(shouldExit(enrolment({ ordersAtEntry: 2 }), customer, "none")).toBe(false);
  });

  test("a customer who has vanished from the snapshot is not treated as having ordered", () => {
    expect(shouldExit(enrolment(), undefined, "ordered")).toBe(false);
  });
});

test.describe("enrolment", () => {
  const audience = [
    { key: "a", chatId: "1@c.us", orders: 1 },
    { key: "b", chatId: "2@c.us", orders: 4 },
  ];

  test("nobody enters the same flow twice", () => {
    const state = emptyState("f1");
    state.seen = ["a"];

    const fresh = pendingEnrolments(audience, state, NOW, 0);
    expect(fresh.map((e) => e.customerKey)).toEqual(["b"]);
  });

  test("the order count at entry is recorded, since that is what exit compares to", () => {
    const fresh = pendingEnrolments(audience, emptyState("f1"), NOW, 0);
    expect(fresh.find((e) => e.customerKey === "b")?.ordersAtEntry).toBe(4);
  });

  test("the first step's wait is honoured from the moment they join", () => {
    const fresh = pendingEnrolments(audience, emptyState("f1"), NOW, 7);
    expect(fresh[0].dueAt).toBe("2026-08-09T10:00:00.000Z");
  });
});

test.describe("what one tick takes on", () => {
  test("due sends are capped, and the longest waiting go first", () => {
    const state = emptyState("f1");
    // Everyone due, enrolled at staggered times, deliberately out of order.
    state.active = Array.from({ length: MAX_SENDS_PER_TICK + 25 }, (_, i) =>
      enrolment({
        customerKey: `c${i}`,
        dueAt: new Date(NOW.getTime() - i * 60_000).toISOString(),
      }),
    );

    const due = dueNow(state, NOW);
    expect(due).toHaveLength(MAX_SENDS_PER_TICK);
    // Oldest due first, so nobody is starved by a queue that never empties.
    expect(due[0].dueAt < due[1].dueAt).toBe(true);
  });

  test("nothing not yet due is picked up", () => {
    const state = emptyState("f1");
    state.active = [
      enrolment({ customerKey: "later", dueAt: dueAt(NOW, 2) }),
      enrolment({ customerKey: "now", dueAt: NOW.toISOString() }),
    ];

    expect(dueNow(state, NOW).map((e) => e.customerKey)).toEqual(["now"]);
  });
});
