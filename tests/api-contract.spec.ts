import { expect, test } from "@playwright/test";

/**
 * The API's promises, checked without a store connected.
 *
 * Every assertion here is about a rule the code is supposed to enforce rather
 * than about a page rendering. An endpoint that half-works with nothing
 * configured is worse than one that refuses, because the failure surfaces later
 * and further away.
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

  test("a malformed body is rejected before any work happens", async ({ request }) => {
    const res = await request.post("/api/whatsapp/preview", {
      headers: { "Content-Type": "application/json" },
      data: "not json at all",
    });
    expect([400, 422]).toContain(res.status());
  });

  test("an unknown broadcast id is a 404, not a crash", async ({ request }) => {
    const res = await request.get("/api/whatsapp/broadcast/does-not-exist");
    expect(res.status()).toBe(404);
  });
});
