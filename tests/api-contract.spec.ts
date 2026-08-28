import { expect, test } from "@playwright/test";

/**
 * The API's promises, checked for a real tenant with no store connected.
 *
 * Every assertion here is about a rule the code is supposed to enforce rather
 * than about a page rendering. An endpoint that half-works with nothing
 * configured is worse than one that refuses, because the failure surfaces later
 * and further away.
 *
 * Requests in this file carry an API key (see playwright.config.ts) for a
 * seeded CI-only identity that has never connected a store — not the "no
 * database configured at all" state, which src/proxy.ts deliberately answers
 * with 503 before checking who's asking. Both states are real; this file
 * tests the one where someone is actually signed in.
 */

test.describe("OpenAPI document", () => {
  test("is served and describes the real surface", async ({ request }) => {
    const res = await request.get("/api/openapi");
    expect(res.ok()).toBeTruthy();

    const doc = await res.json();
    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.info.title).toBe("PulseCommerce API");

    // Endpoints that exist must be documented; the document is only useful if
    // it stays in step with the routes.
    for (const path of [
      "/api/analytics",
      "/api/settings",
      "/api/whatsapp/settings",
      "/api/whatsapp/preview",
      "/api/whatsapp/broadcast",
      "/api/whatsapp/coupons",
    ]) {
      expect(doc.paths, `${path} should be documented`).toHaveProperty(path);
    }
  });

  test("never documents an endpoint that accepts phone numbers for an audience", async ({
    request,
  }) => {
    const doc = await (await request.get("/api/openapi")).json();
    const filter = doc.components.schemas.AudienceFilter;
    // The audience is described, never enumerated. A `recipients` or `phones`
    // property here would mean a client could address arbitrary numbers.
    expect(Object.keys(filter.properties)).not.toContain("recipients");
    expect(Object.keys(filter.properties)).not.toContain("phones");
  });
});

test.describe("with nothing connected", () => {
  test("analytics reports that no store is connected", async ({ request }) => {
    const res = await request.get("/api/analytics");
    expect(res.status()).toBe(409);
    expect((await res.json()).code).toBe("not_connected");
  });

  test("settings reports disconnected rather than erroring", async ({ request }) => {
    const res = await request.get("/api/settings");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.connected).toBe(false);
    expect(body.config).toBeNull();
  });

  test("the WhatsApp gateway reports disconnected", async ({ request }) => {
    const res = await request.get("/api/whatsapp/settings");
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).connected).toBe(false);
  });

  test("session and chats refuse instead of throwing", async ({ request }) => {
    for (const path of ["/api/whatsapp/session", "/api/whatsapp/chats"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(409);
      expect((await res.json()).error, path).toContain("gateway");
    }
  });
});

test.describe("refusals that protect customers", () => {
  test("a test send is refused without a gateway, not silently dropped", async ({ request }) => {
    const res = await request.post("/api/whatsapp/test", {
      data: { phone: "+919999999999", message: { type: "text", text: "hello" } },
    });
    expect(res.status()).toBe(409);
  });

  test("a broadcast without a confirmation count is rejected", async ({ request }) => {
    const res = await request.post("/api/whatsapp/broadcast", {
      data: { filter: {}, message: { type: "text", text: "hi" } },
    });
    // 422 for the missing confirm field, before anything about stores is considered.
    expect(res.status()).toBe(422);
  });

  test("an image message without media or a product is rejected", async ({ request }) => {
    const res = await request.post("/api/whatsapp/test", {
      data: { phone: "+919999999999", message: { type: "image", text: "hi" } },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).error).toMatch(/media|product photo/i);
  });

  test("a product photo is enough — no media URL is needed", async ({ request }) => {
    /*
     * The panel leaves the media URL blank when a campaign product supplies the
     * photo. Sending it as "" failed the URL check and surfaced as "Invalid URL"
     * at the moment of sending, so this pins that the field may be absent.
     *
     * 409 is the pass: no store is connected in the test environment, and the
     * body got far enough to be asked about one. A 422 would mean it was
     * rejected as malformed, which is the bug.
     */
    const res = await request.post("/api/whatsapp/preview", {
      headers: { "Content-Type": "application/json" },
      data: {
        filter: {},
        message: {
          type: "image",
          text: "Hi {{name}}, {{product}} is back.",
          product: {
            name: "Example Soap",
            url: "https://example.com/product/example-soap",
            image: "https://example.com/wp-content/uploads/example-soap.jpg",
            category: "Skin Care",
          },
        },
      },
    });
    expect(res.status()).not.toBe(422);
    expect([409, 200]).toContain(res.status());

    // And the other half of the contract: an empty string is not a URL, and is
    // meant to be rejected. The caller omits the field; it does not blank it.
    const blank = await request.post("/api/whatsapp/preview", {
      headers: { "Content-Type": "application/json" },
      data: { filter: {}, message: { type: "image", text: "hi", mediaUrl: "" } },
    });
    expect(blank.status()).toBe(422);
  });

  test("a malformed body is rejected before any work happens", async ({ request }) => {
    const res = await request.post("/api/whatsapp/preview", {
      headers: { "Content-Type": "application/json" },
      data: "not json at all",
    });
    expect([400, 422]).toContain(res.status());
  });

  test("the cron endpoint is closed, not open, when its secret is unset", async ({ request }) => {
    /*
     * This route sends real messages to real customers. The failure mode of a
     * missing environment variable must never be "anyone on the internet can
     * trigger the sends", so an absent CRON_SECRET has to refuse rather than
     * wave the request through. The test server sets no secret.
     */
    const res = await request.post("/api/cron/flows");
    expect([401, 503]).toContain(res.status());

    const wrong = await request.post("/api/cron/flows", {
      headers: { Authorization: "Bearer definitely-not-the-secret" },
    });
    expect([401, 503]).toContain(wrong.status());
  });

  test("a flow with no steps is refused", async ({ request }) => {
    const res = await request.post("/api/whatsapp/flows", {
      headers: { "Content-Type": "application/json" },
      data: { name: "Empty", entry: {}, steps: [] },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).error).toMatch(/step/i);
  });

  test("the assistant is off, not open, when its key is unset", async ({ request }) => {
    /*
     * No key must mean unavailable rather than erroring in some other way, so
     * the screen can say "not configured" instead of showing a stack trace.
     */
    const res = await request.post("/api/ai/chat", {
      headers: { "Content-Type": "application/json" },
      data: { messages: [{ role: "user", content: "hello" }] },
    });
    expect(res.status()).toBe(503);
    expect((await res.json()).code).toBe("no_api_key");
  });

  test("the assistant has no tool for sending to an audience", async () => {
    /*
     * The safety property worth pinning in a test rather than a comment. If a
     * broadcast tool is ever added to the list, this fails — which is the
     * moment to think hard, because no prompt should be able to message
     * thousands of customers.
     */
    const { ACTION_TOOLS, READ_TOOLS } = await import("@/lib/ai/tools");
    const names = [...ACTION_TOOLS, ...READ_TOOLS].map((t) => t.name);

    for (const forbidden of ["broadcast", "send_campaign", "send_audience", "send_bulk"]) {
      expect(names).not.toContain(forbidden);
    }
    // Every action is a proposal, by name as well as by behaviour.
    for (const tool of ACTION_TOOLS) {
      expect(tool.name.startsWith("propose_")).toBe(true);
    }
  });

  test("an unknown flow id is a 404, not a crash", async ({ request }) => {
    const res = await request.get("/api/whatsapp/flows/does-not-exist");
    expect(res.status()).toBe(404);
  });

  test("an unknown broadcast id is a 404, not a crash", async ({ request }) => {
    const res = await request.get("/api/whatsapp/broadcast/does-not-exist");
    expect(res.status()).toBe(404);
  });
});
