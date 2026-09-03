/**
 * OpenAPI description of this application's own HTTP API.
 *
 * Hand-written rather than generated. The routes are Next.js handlers with Zod
 * validation inside them, and no generator reads that combination faithfully —
 * a generated document that quietly drifts from the code is worse than one
 * somebody has to keep honest, because nobody checks the generated one.
 *
 * Served at /api/openapi, rendered at /api-docs.
 */

const json = (schema: unknown) => ({ "application/json": { schema } });

const error = {
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
} as const;

const errorResponse = (description: string) => ({
  description,
  content: json(error),
});

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "PulseCommerce API",
    version: "1.0.0",
    description:
      "Analytics and WhatsApp campaigns for a connected WooCommerce store.\n\n" +
      "Two rules run through the whole API and are worth knowing before reading it.\n\n" +
      "**Customer phone numbers are never returned.** Analytics carries a `hasPhone` " +
      "boolean; numbers are resolved server-side at the moment a message is sent.\n\n" +
      "**Audiences are described, never enumerated.** Sending endpoints accept a " +
      "filter and resolve recipients themselves, so no request can address someone " +
      "who is not a customer of the connected store or who has opted out.\n\n" +
      "## Authentication\n\n" +
      "Every endpoint requires an API key except the connect flow, the scheduler " +
      "hooks (which authenticate with `CRON_SECRET`), the first two legs of `pulse " +
      "login` (see the CLI login tag), and this document.\n\n" +
      "Each key belongs to an account, and an account owns its own WooCommerce " +
      "store and WhatsApp connection. A key therefore sees exactly one tenant's " +
      "data — yours — and there is no parameter that changes which.\n\n" +
      "Create a key in **Settings → API keys**, then send it on each request:\n\n" +
      "```bash\n" +
      "curl https://your-deployment/api/analytics \\\n" +
      '  -H "Authorization: Bearer pc_live_…"\n' +
      "```\n\n" +
      "A missing or invalid key returns 401; a key without the scope an endpoint " +
      "needs returns 403 naming it. Both include a `hint` field saying what to do.\n\n" +
      "Keys can neither create nor revoke keys — that requires a dashboard " +
      "session, so a leaked key cannot extend or replace itself.\n\n" +
      "## Freshness\n\n" +
      "Analytics are computed from a local mirror of your store rather than by " +
      "calling WooCommerce on each request, which is what makes them fast. The " +
      "mirror refreshes every two hours; `GET /api/sync` reports when it last " +
      "ran, and `POST /api/sync` pulls immediately.",
  },
  servers: [{ url: "/", description: "This deployment" }],
  /*
   * Applied to every operation. Endpoints that are genuinely public override it
   * with `security: []` rather than relying on the default being absent, so
   * "public" is always a decision someone wrote down.
   */
  security: [{ ApiKey: [] }, { Session: [] }],
  tags: [
    { name: "Analytics", description: "Computed metrics from the cached store snapshot" },
    { name: "Store", description: "WooCommerce connection and data window" },
    { name: "Reports", description: "Excel, PDF and CSV exports" },
    { name: "WhatsApp", description: "Gateway connection and session" },
    { name: "Campaigns", description: "Audience resolution and broadcasts" },
    { name: "Flows", description: "Multi-step campaigns advanced on a schedule" },
    { name: "Recovery", description: "Abandoned-checkout reminders over WhatsApp" },
    { name: "Assistant", description: "Reads the store and proposes actions for approval" },
    { name: "Inbox", description: "Conversations and replies" },
    { name: "Auth", description: "Optional password sessions" },
    { name: "API keys", description: "Credentials for calling this API from your own code" },
    { name: "CLI login", description: "Device-authorization login for `pulse login`" },
    { name: "Sync", description: "The local mirror of your WooCommerce store" },
    { name: "Billing", description: "Plans, usage, invoices and Razorpay subscriptions" },
    { name: "Order confirmations", description: "WhatsApp thank-you messages sent on new orders" },
  ],
  paths: {
    "/api/sync": {
      get: {
        tags: ["Sync"],
        summary: "How current the mirrored data is",
        description:
          "Every figure this API returns is as fresh as the last sync, so this is " +
          "what to check before treating a number as current. A failed run is " +
          "reported rather than hidden — stale figures labelled stale are better " +
          "than stale figures presented as live.",
        responses: {
          200: {
            description: "Row counts and the last run.",
            content: json({
              type: "object",
              properties: {
                lastSyncAt: { type: "string", format: "date-time", nullable: true },
                orders: { type: "integer" },
                customers: { type: "integer" },
                products: { type: "integer" },
                lastRun: {
                  type: "object",
                  nullable: true,
                  properties: {
                    status: { type: "string", enum: ["running", "succeeded", "failed"] },
                    mode: { type: "string", enum: ["full", "incremental"] },
                    error: { type: "string", nullable: true },
                    finishedAt: { type: "string", format: "date-time", nullable: true },
                  },
                },
              },
            }),
          },
          409: errorResponse("No store is connected."),
        },
      },
      post: {
        tags: ["Sync"],
        summary: "Pull from WooCommerce now",
        description:
          "Normally the schedule handles this. Use it after connecting a store, or " +
          "when something changed in WooCommerce that you want reflected " +
          "immediately.\n\nBy default only records modified since the last run are " +
          "fetched. `?full=1` re-reads the whole history, which on a large store " +
          "takes minutes.\n\nRequires the `write` scope: it causes real traffic " +
          "against the merchant's shop.",
        parameters: [
          {
            name: "full",
            in: "query",
            description: "Set to 1 to re-read the entire history.",
            schema: { type: "string", enum: ["1"] },
          },
        ],
        responses: {
          200: {
            description: "Finished.",
            content: json({
              type: "object",
              properties: {
                ok: { type: "boolean" },
                mode: { type: "string", enum: ["full", "incremental"] },
                orders: { type: "integer" },
                customers: { type: "integer" },
                products: { type: "integer" },
                warnings: { type: "array", items: { type: "string" } },
                durationMs: { type: "integer" },
              },
            }),
          },
          403: errorResponse("The key lacks the write scope."),
          409: errorResponse("No store is connected."),
          502: errorResponse("WooCommerce could not be reached, or refused the key."),
        },
      },
    },

    "/api/billing/status": {
      get: {
        tags: ["Billing"],
        summary: "Current plan, subscription status and this month's usage",
        responses: {
          200: {
            description: "Plan state.",
            content: json({
              type: "object",
              properties: {
                plan: { type: "string", enum: ["go", "plus"], nullable: true },
                subscriptionStatus: {
                  type: "string",
                  enum: ["none", "created", "authenticated", "active", "past_due", "halted", "cancelled"],
                  description:
                    "\"authenticated\" is Razorpay's own status for a mandate that's set up but " +
                    "not yet charged -- the live state of a 14-day free trial between mandate " +
                    "setup and the deferred first debit.",
                },
                currentPeriodEnd: { type: "string", format: "date-time", nullable: true },
                graceUntil: { type: "string", format: "date-time", nullable: true },
                legacyUnlimited: { type: "boolean" },
                usage: {
                  type: "object",
                  properties: {
                    sent: { type: "integer" },
                    limit: { type: "integer", nullable: true, description: "null means unlimited." },
                  },
                },
                trialEndsAt: {
                  type: "string",
                  format: "date-time",
                  nullable: true,
                  description: "Set once a trial mandate is authenticated; null before then or once real billing takes over.",
                },
                trialAvailable: {
                  type: "boolean",
                  description: "False once this account has ever authenticated a trial mandate, on either plan.",
                },
              },
            }),
          },
        },
      },
    },
    "/api/billing/checkout": {
      post: {
        tags: ["Billing"],
        summary: "Start (or change) a subscription, with a one-time 14-day free trial",
        description:
          "Session only — like managing API keys, a leaked API key must not be able " +
          "to change what the account is billed. Creates a Razorpay customer and a " +
          "UPI Autopay subscription for the requested plan, cancelling any existing " +
          "subscription first (a no-op if the account is already active or mid-trial " +
          "on exactly this plan). An account that has never authenticated a trial " +
          "mandate before gets one automatically: the UPI mandate is authorized now, " +
          "same as any subscription, but Razorpay defers the first charge 14 days " +
          "(`start_at`) -- nothing further is required from the customer or this app " +
          "for the real charge to happen automatically once the trial ends. Returns a " +
          "subscription id for Razorpay's Checkout.js to open; the mandate itself is " +
          "collected there, not by this app.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["plan"],
            properties: { plan: { type: "string", enum: ["go", "plus"] } },
          }),
        },
        responses: {
          200: {
            description: "Subscription created (or reused, if already active/trialing on this plan).",
            content: json({
              type: "object",
              properties: {
                subscriptionId: { type: "string" },
                trialDays: { type: "integer", description: "14 if a trial was granted on this call, otherwise 0." },
              },
            }),
          },
          401: errorResponse("Not signed in, or authenticated with an API key."),
          502: errorResponse("Razorpay rejected the subscription request (e.g. an out-of-range start_at)."),
          503: errorResponse("The plan's Razorpay plan id is not configured."),
        },
      },
    },
    "/api/billing/cancel": {
      post: {
        tags: ["Billing"],
        summary: "Revert an abandoned checkout attempt",
        description:
          "Session only. Cancels the account's Razorpay subscription and clears its " +
          "plan (and any pending trial), but only when that subscription isn't " +
          "already active or an authenticated trial — a checkout started and then " +
          "abandoned (the Checkout.js popup closed without completing the mandate) " +
          "leaves a \"created\" subscription behind with no webhook ever coming to " +
          "clean it up. Called automatically when that popup is dismissed. A no-op " +
          "if the account has no pending subscription, or if it's already active or " +
          "mid-trial (this route only reverts a pending attempt, not a real " +
          "subscription or a running trial).",
        responses: {
          200: { description: "Reverted, or nothing to revert.", content: json({ type: "object", properties: { ok: { type: "boolean" } } }) },
          401: errorResponse("Not signed in, or authenticated with an API key."),
        },
      },
    },
    "/api/billing/invoices": {
      get: {
        tags: ["Billing"],
        summary: "Past invoices, newest first",
        responses: {
          200: {
            description: "Invoice history.",
            content: json({
              type: "object",
              properties: {
                invoices: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      plan: { type: "string", enum: ["go", "plus"] },
                      amountPaise: { type: "integer" },
                      currency: { type: "string" },
                      status: { type: "string", enum: ["paid", "failed", "refunded"] },
                      periodStart: { type: "string", format: "date-time" },
                      periodEnd: { type: "string", format: "date-time" },
                      paidAt: { type: "string", format: "date-time" },
                      downloadUrl: { type: "string" },
                    },
                  },
                },
              },
            }),
          },
        },
      },
    },
    "/api/billing/invoices/{id}/pdf": {
      get: {
        tags: ["Billing"],
        summary: "One invoice as a PDF",
        description: "Scoped to the signed-in tenant in the query itself — an id for another account simply matches nothing.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "The invoice PDF.", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
          404: errorResponse("No such invoice."),
        },
      },
    },
    "/api/billing/webhook": {
      post: {
        tags: ["Billing"],
        summary: "Razorpay subscription and payment events",
        // Not open in the sense of unauthenticated — it verifies an HMAC
        // signature instead of a session or key, the same class of exception
        // as /api/auth/woo/callback.
        security: [],
        description:
          "Server-to-server from Razorpay, verified via the x-razorpay-signature " +
          "header (RAZORPAY_WEBHOOK_SECRET) rather than a session or API key. " +
          "Deliveries are deduplicated by a hash of the raw body, since Razorpay " +
          "sends at-least-once. Handles subscription.activated, " +
          "subscription.charged (records an invoice), payment.failed (a 3-day " +
          "grace period before sends are blocked), subscription.halted and " +
          "subscription.cancelled.",
        responses: {
          200: { description: "Processed (or already seen).", content: json({ type: "object" }) },
          401: errorResponse("Missing or invalid signature."),
          503: errorResponse("RAZORPAY_WEBHOOK_SECRET is not set."),
        },
      },
    },

    "/api/keys": {
      get: {
        tags: ["API keys"],
        summary: "List issued keys",
        description:
          "Metadata only — the keys themselves are not recoverable. Requires a " +
          "dashboard session; an API key cannot read this.",
        responses: {
          200: {
            description: "Every key ever issued, including revoked ones.",
            content: json({
              type: "object",
              properties: {
                keys: { type: "array", items: { $ref: "#/components/schemas/ApiKeyRecord" } },
              },
            }),
          },
          403: errorResponse("Authenticated with an API key rather than a session."),
        },
      },
      post: {
        tags: ["API keys"],
        summary: "Create a key",
        description:
          "The response contains the key in full. This is the only time it is ever " +
          "returned: only a SHA-256 digest is stored, so it cannot be shown again.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              name: {
                type: "string",
                maxLength: 60,
                description: "How you will recognise this key later.",
                examples: ["Reporting cron"],
              },
              scopes: {
                type: "array",
                minItems: 1,
                items: { type: "string", enum: ["read", "write"] },
              },
            },
            required: ["name", "scopes"],
          }),
        },
        responses: {
          201: {
            description: "Created. Copy the key now.",
            content: json({
              type: "object",
              properties: {
                key: {
                  type: "string",
                  description: "The secret. Shown once.",
                  examples: ["pc_live_x7Qa2M0pLd8vRt4WnJ6yBc1EgHs5UfZk9Ni3OqTr"],
                },
                record: { $ref: "#/components/schemas/ApiKeyRecord" },
              },
            }),
          },
          400: errorResponse("Missing name, or no scopes given."),
          403: errorResponse("Authenticated with an API key rather than a session."),
        },
      },
    },

    "/api/keys/{id}": {
      delete: {
        tags: ["API keys"],
        summary: "Revoke a key",
        description:
          "Takes effect within about thirty seconds: each running instance caches " +
          "the key list briefly, so a warm one can honour a revoked key until its " +
          "cache lapses. If a key is known to be compromised, re-authorize the " +
          "store as well.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Revoked.",
            content: json({ type: "object", properties: { revoked: { type: "boolean" } } }),
          },
          403: errorResponse("Authenticated with an API key rather than a session."),
          404: errorResponse("No active key with that id."),
        },
      },
    },

    "/api/cli/auth/start": {
      post: {
        tags: ["CLI login"],
        summary: "Begin a device-authorization login",
        // Public: there is no key to send yet — a device code stands in for
        // one until a human approves it in an already-signed-in browser.
        security: [],
        description:
          "Step one of `pulse login`. Returns a device code (the CLI holds this) and a " +
          "short user code and verification URL (the human visits this, and compares the " +
          "code shown there against what their terminal printed).",
        requestBody: {
          content: json({
            type: "object",
            properties: {
              scopes: {
                type: "array",
                items: { type: "string", enum: ["read", "write"] },
                description: "Defaults to read and write.",
              },
            },
          }),
        },
        responses: {
          200: {
            description: "A device code, a user code, and where to approve it",
            content: json({
              type: "object",
              properties: {
                deviceCode: { type: "string" },
                userCode: { type: "string", examples: ["WXYZ-2345"] },
                verificationUrl: { type: "string", format: "uri" },
                expiresIn: { type: "integer", description: "Seconds until the code expires" },
                interval: { type: "integer", description: "Minimum seconds between polls" },
              },
            }),
          },
          400: errorResponse("Invalid scopes"),
        },
      },
    },

    "/api/cli/auth/poll": {
      post: {
        tags: ["CLI login"],
        summary: "Check whether a device login has been approved",
        security: [],
        description:
          "Step three of `pulse login`, called on the interval `start` returned. Returns " +
          "`{ status: \"approved\", key, record }` exactly once — the key is minted at the " +
          "moment a poll first observes the login approved, and cannot be retrieved again.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: { deviceCode: { type: "string" } },
            required: ["deviceCode"],
          }),
        },
        responses: {
          200: {
            description: "pending, denied, expired, or approved with a key",
            content: json({
              oneOf: [
                { type: "object", properties: { status: { const: "pending" } } },
                { type: "object", properties: { status: { const: "denied" } } },
                { type: "object", properties: { status: { const: "expired" } } },
                {
                  type: "object",
                  properties: {
                    status: { const: "approved" },
                    key: { type: "string", examples: ["pc_live_…"] },
                    record: { $ref: "#/components/schemas/ApiKeyRecord" },
                  },
                },
              ],
            }),
          },
        },
      },
    },

    "/api/cli/auth/approve": {
      post: {
        tags: ["CLI login"],
        summary: "Approve or deny a device login",
        description:
          "Step two of `pulse login` — what the dashboard page at /cli-login calls once a " +
          "signed-in person clicks Approve or Deny. Requires a dashboard session, the same " +
          "reasoning as creating a key directly: an API key must not be able to mint a login " +
          "for itself or anyone else.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              userCode: { type: "string" },
              action: { type: "string", enum: ["approve", "deny"] },
            },
            required: ["userCode", "action"],
          }),
        },
        responses: {
          200: { description: "Recorded", content: json({ type: "object", properties: { ok: { type: "boolean" } } }) },
          401: errorResponse("Not signed in"),
          403: errorResponse("Authenticated with an API key rather than a session"),
          409: errorResponse("The code was already used, denied, or has expired"),
        },
      },
    },

    "/api/analytics": {
      get: {
        tags: ["Analytics"],
        summary: "Every metric for a date range",
        description:
          "Computed from the cached snapshot. A cold cache triggers a full pull from " +
          "WooCommerce, which can take minutes on a large store; every later request " +
          "is served from cache.",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          {
            name: "all",
            in: "query",
            description:
              "Set to 1 for the whole history, resolved fresh against the current " +
              "snapshot rather than a from/to pinned to whatever bounds were known " +
              "at some earlier point. Overrides from/to when set.",
            schema: { type: "string", enum: ["1"] },
          },
          {
            name: "granularity",
            in: "query",
            schema: { type: "string", enum: ["day", "week", "month"] },
          },
          {
            name: "refresh",
            in: "query",
            description: "Set to 1 to bypass every cache and re-pull.",
            schema: { type: "string", enum: ["1"] },
          },
        ],
        responses: {
          200: {
            description: "The full analytics payload",
            content: json({
              type: "object",
              properties: {
                meta: {
                  type: "object",
                  properties: {
                    storeName: { type: "string" },
                    currency: { type: "string" },
                    warnings: { type: "array", items: { type: "string" } },
                  },
                },
                kpis: { type: "object" },
                customers: { type: "object" },
                products: { type: "object" },
                orders: { type: "array", items: { type: "object" } },
              },
            }),
          },
          409: errorResponse("No WooCommerce store is connected"),
        },
      },
    },

    "/api/customers/{key}": {
      get: {
        tags: ["Analytics"],
        summary: "One customer, with order history",
        description:
          "Customer records ship without their orders, which is half a record's " +
          "weight. This fills it in for the one customer being looked at.",
        parameters: [
          { name: "key", in: "path", required: true, schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: {
          200: { description: "The customer and their orders", content: json({ type: "object" }) },
          404: errorResponse("No such customer in the selected range"),
        },
      },
    },

    "/api/settings": {
      get: {
        tags: ["Store"],
        summary: "Connected stores and the active one",
        responses: {
          200: {
            description: "Connection state, credentials redacted",
            content: json({
              type: "object",
              properties: {
                connected: { type: "boolean" },
                activeUrl: { type: "string", nullable: true },
                stores: { type: "array", items: { type: "object" } },
              },
            }),
          },
        },
      },
      patch: {
        tags: ["Store"],
        summary: "Switch store, or change the data window",
        requestBody: {
          required: true,
          content: json({
            oneOf: [
              {
                type: "object",
                properties: { activeUrl: { type: "string" } },
                required: ["activeUrl"],
              },
              {
                type: "object",
                properties: {
                  historyMonths: { type: "integer", minimum: 1, maximum: 120 },
                  maxPages: { type: "integer", minimum: 1, maximum: 500 },
                },
              },
            ],
          }),
        },
        responses: {
          200: { description: "Updated", content: json({ type: "object" }) },
          404: errorResponse("That store is not connected"),
          422: errorResponse("Invalid body"),
        },
      },
      delete: {
        tags: ["Store"],
        summary: "Disconnect one store, or all of them",
        description: "Wipes the stored key and every cached order for the store removed.",
        parameters: [
          {
            name: "url",
            in: "query",
            description: "Omit to disconnect every store.",
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Disconnected", content: json({ type: "object" }) } },
      },
    },

    "/api/reports/export": {
      post: {
        tags: ["Reports"],
        summary: "Generate an export",
        description: "Uses the date range supplied, so a download cannot disagree with the screen it came from.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              format: { type: "string", enum: ["xlsx", "pdf", "csv"] },
              reports: { type: "array", items: { type: "string" } },
              from: { type: "string", format: "date" },
              to: { type: "string", format: "date" },
            },
            required: ["format", "reports"],
          }),
        },
        responses: {
          200: {
            description: "The generated file",
            content: {
              "application/octet-stream": { schema: { type: "string", format: "binary" } },
            },
          },
          422: errorResponse("Invalid request"),
        },
      },
    },

    "/api/whatsapp/settings": {
      get: {
        tags: ["WhatsApp"],
        summary: "Gateway connection and live session state",
        responses: {
          200: {
            description: "Connection state, key masked",
            content: json({
              type: "object",
              properties: {
                connected: { type: "boolean" },
                fromEnv: { type: "boolean", description: "Set by environment variables" },
                ready: { type: "boolean", description: "Session linked and engine running" },
                config: { type: "object", nullable: true },
                session: { type: "object", nullable: true },
              },
            }),
          },
        },
      },
      put: {
        tags: ["WhatsApp"],
        summary: "Connect a gateway",
        description: "Verified against the gateway before being saved.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              baseUrl: { type: "string" },
              apiKey: { type: "string" },
              sessionId: { type: "string", description: "Adopted automatically if omitted" },
              defaultDialCode: { type: "string", example: "91" },
              delayBetweenMessagesMs: { type: "integer", minimum: 1000, maximum: 60000 },
            },
            required: ["baseUrl", "apiKey"],
          }),
        },
        responses: {
          200: { description: "Connected", content: json({ type: "object" }) },
          409: errorResponse("Set by environment variables, or the gateway has no usable session"),
          422: errorResponse("Invalid URL or body"),
        },
      },
      delete: {
        tags: ["WhatsApp"],
        summary: "Disconnect the gateway",
        responses: {
          200: { description: "Disconnected", content: json({ type: "object" }) },
          409: errorResponse("Set by environment variables"),
        },
      },
    },

    "/api/whatsapp/session": {
      get: {
        tags: ["WhatsApp"],
        summary: "Session state, and the pairing QR when one is offered",
        description:
          "The QR is proxied rather than linked, so the gateway key never reaches a page.",
        responses: {
          200: {
            description: "State, plus a QR while unlinked",
            content: json({
              type: "object",
              properties: {
                ready: { type: "boolean" },
                session: { type: "object" },
                qrCode: { type: "string", nullable: true, description: "PNG data URL" },
              },
            }),
          },
          409: errorResponse("No gateway connected"),
        },
      },
      post: {
        tags: ["WhatsApp"],
        summary: "Start the engine so it offers a QR",
        description: "Idempotent: a session already running is the wanted outcome, not an error.",
        responses: {
          200: { description: "Running", content: json({ type: "object" }) },
          409: errorResponse("No gateway connected"),
        },
      },
    },

    "/api/whatsapp/preview": {
      post: {
        tags: ["Campaigns"],
        summary: "Dry run — resolve recipients and send nothing",
        description:
          "Resolves exactly the list a broadcast would send to, so the destructive step " +
          "is never the first time anyone sees the numbers.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              filter: { $ref: "#/components/schemas/AudienceFilter" },
              range: { $ref: "#/components/schemas/DateRange" },
              customerKeys: { $ref: "#/components/schemas/CustomerKeys" },
              message: { $ref: "#/components/schemas/Message" },
            },
            required: ["filter"],
          }),
        },
        responses: {
          200: {
            description: "Counts, reasons and a masked sample",
            content: json({
              type: "object",
              properties: {
                matched: { type: "integer" },
                deliverable: { type: "integer" },
                skipped: {
                  type: "object",
                  properties: {
                    noPhone: { type: "integer" },
                    unparseable: { type: "integer" },
                    optedOut: { type: "integer" },
                    duplicate: { type: "integer" },
                  },
                },
                sample: { type: "array", items: { type: "string" }, description: "Masked" },
                preview: { type: "string", nullable: true },
                media: {
                  type: "string",
                  nullable: true,
                  description: "Photo the first recipient would receive, resolved as the send resolves it.",
                },
                estimatedMs: { type: "integer" },
              },
            }),
          },
          409: errorResponse("No store connected"),
        },
      },
    },

    "/api/whatsapp/test": {
      post: {
        tags: ["Campaigns"],
        summary: "Send one message to a number typed by hand",
        description:
          "Deliberately isolated from the audience machinery: there is no way to reach " +
          "a customer through this route. The opt-out list still applies.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              phone: { type: "string", example: "+91 98765 43210" },
              message: { $ref: "#/components/schemas/Message" },
            },
            required: ["phone", "message"],
          }),
        },
        responses: {
          200: {
            description: "Sent",
            content: json({
              type: "object",
              properties: {
                sent: { type: "boolean" },
                messageId: { type: "string" },
                timestamp: { type: "integer" },
              },
            }),
          },
          409: errorResponse("Session cannot send, or the number has opted out"),
          422: errorResponse("Unreadable number, or not on WhatsApp"),
        },
      },
    },

    "/api/ai/chat": {
      post: {
        tags: ["Assistant"],
        summary: "Ask the assistant",
        description:
          "Runs a tool-calling loop against Groq. Read tools execute server-side and their " +
          "results are fed back; action tools are never executed — the loop stops and the " +
          "call is returned as a proposal for a person to approve. Approving calls the " +
          "ordinary endpoint for that action, so an assistant is a route to those endpoints " +
          "rather than a way around their guards. There is deliberately no tool for sending " +
          "to an audience.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              messages: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    role: { type: "string", enum: ["user", "assistant", "tool"] },
                    content: { type: "string" },
                  },
                  required: ["role", "content"],
                },
              },
            },
            required: ["messages"],
          }),
        },
        responses: {
          200: {
            description: "The answer, what it read, and anything it proposes",
            content: json({
              type: "object",
              properties: {
                message: { type: "string" },
                toolsUsed: { type: "array", items: { type: "object" } },
                proposals: {
                  type: "array",
                  description: "Actions awaiting human approval. Nothing has happened yet.",
                  items: { type: "object" },
                },
              },
            }),
          },
          422: { description: "Malformed conversation" },
          502: { description: "Groq did not answer" },
          503: { description: "GROQ_API_KEY is not set, so the assistant is off" },
        },
      },
    },
    "/api/whatsapp/menu": {
      get: {
        tags: ["Flows"],
        summary: "The inbound menu bot's configuration",
        description:
          "Proxies the gateway's plugin API so the admin key stays on the server. " +
          "Reports whether the extension is installed and whether it is currently answering; " +
          "not installed is a normal state, not an error.",
        responses: {
          200: { description: "The menu, and whether it is on", content: json({ type: "object" }) },
          409: { description: "No gateway is connected" },
          502: { description: "The gateway did not respond" },
        },
      },
      put: {
        tags: ["Flows"],
        summary: "Save the menu, and turn it on or off",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              trigger: {
                type: "string",
                description:
                  "Matched exactly and case-insensitively. Empty means every text message " +
                  "opens the menu, so every customer who writes gets a menu instead of a person.",
              },
              greeting: { type: "string" },
              respondInGroups: { type: "boolean" },
              options: {
                type: "array",
                description:
                  "The menu tree. Each node has the key the customer types, the reply, and " +
                  "an optional submenu. Keys are renumbered server-side so a menu never " +
                  "offers 1, 2, 4 after a deletion.",
                items: { $ref: "#/components/schemas/MenuOption" },
              },
              enabled: {
                type: "boolean",
                description: "Omit to save without changing whether it is answering.",
              },
            },
            required: ["trigger", "greeting", "options", "respondInGroups"],
          }),
        },
        responses: {
          200: { description: "Saved" },
          422: { description: "Invalid menu — empty greeting, no options, or nested too deep" },
          502: { description: "The gateway did not respond" },
        },
      },
    },
    "/api/whatsapp/flows": {
      get: {
        tags: ["Flows"],
        summary: "Every flow, with its progress",
        responses: { 200: { description: "Flow summaries", content: json({ type: "object" }) } },
      },
      post: {
        tags: ["Flows"],
        summary: "Create a flow",
        description:
          "Always created as a draft. Designing a sequence and starting to send it are two " +
          "decisions; conflating them turns a typo in a filter into messages that cannot be recalled.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              name: { type: "string" },
              entry: { $ref: "#/components/schemas/AudienceFilter" },
              steps: {
                type: "array",
                description: "Sent in order. Each waits the given number of days after the one before it.",
                items: {
                  type: "object",
                  properties: {
                    waitDays: { type: "number", minimum: 0, maximum: 365 },
                    message: { $ref: "#/components/schemas/Message" },
                  },
                  required: ["waitDays", "message"],
                },
              },
              testPhone: {
                type: "string",
                description:
                  "Test mode. Every step goes to this one number and the entry audience is " +
                  "never read, so a sequence can be checked without messaging a customer. " +
                  "The opt-out list still applies.",
              },
              exitOn: {
                type: "string",
                enum: ["none", "ordered"],
                description:
                  "\"ordered\" removes anyone who buys after joining, so a win-back sequence " +
                  "stops nagging a customer who already came back.",
              },
            },
            required: ["name", "entry", "steps"],
          }),
        },
        responses: {
          201: { description: "Created, as a draft", content: json({ type: "object" }) },
          422: { description: "Invalid flow" },
        },
      },
    },
    "/api/whatsapp/flows/{id}": {
      get: {
        tags: ["Flows"],
        summary: "One flow, its steps and what is due next",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "The flow", content: json({ type: "object" }) },
          404: { description: "No such flow" },
        },
      },
      patch: {
        tags: ["Flows"],
        summary: "Rename, start, pause or resume",
        description:
          "Steps and the entry filter cannot be edited. People are already partway through, and " +
          "changing a later step under someone who has had the earlier ones gives them a sequence " +
          "nobody designed.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              name: { type: "string" },
              status: { type: "string", enum: ["draft", "active", "paused"] },
            },
          }),
        },
        responses: {
          200: { description: "Updated", content: json({ type: "object" }) },
          404: { description: "No such flow" },
        },
      },
      delete: {
        tags: ["Flows"],
        summary: "Delete a flow and everyone's place in it",
        description:
          "Pausing is the reversible option. Deleting discards the record of who has already been " +
          "messaged, so a flow recreated afterwards restarts everyone from step one.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Deleted" },
          404: { description: "No such flow" },
        },
      },
    },
    "/api/cron/sync": {
      post: {
        tags: ["Sync"],
        summary: "Sync every connected store",
        // Not open: authenticates with CRON_SECRET as a bearer token, checked
        // in the handler. The scheduler has no session and no API key.
        security: [],
        description:
          "Called by Supabase's scheduler (pg_cron, via the trigger_app_job helper in " +
          "supabase/migrations/20260811170000_cron.sql) every 10 minutes, with the project's " +
          "CRON_SECRET as a bearer token, and closed when that secret is unset. Up to 25 stores " +
          "are synced per run, ordered by staleness — never-synced stores first — so a run that " +
          "cannot finish everyone still makes progress on whoever is furthest behind rather than " +
          "repeatedly syncing the same few. One store's WooCommerce being unreachable does not " +
          "stop the rest. GET does the same work.",
        responses: {
          200: { description: "What each store's sync did", content: json({ type: "object" }) },
          401: { description: "Missing or wrong bearer token" },
          503: { description: "CRON_SECRET is not set, so scheduled sync is off" },
        },
      },
    },
    "/api/cron/flows": {
      post: {
        tags: ["Flows"],
        summary: "Advance every active flow",
        // Not open: authenticates with CRON_SECRET as a bearer token, checked
        // in the handler. The scheduler has no session and no API key.
        security: [],
        description:
          "Called by Supabase's scheduler (pg_cron, via the trigger_app_job helper in " +
          "supabase/migrations/20260811170000_cron.sql) with the project's CRON_SECRET as a bearer " +
          "token, and closed when that secret is unset. What is due is computed from stored " +
          "timestamps, so a tick that is skipped, retried or runs late sends the same messages, " +
          "once. GET does the same work.",
        responses: {
          200: { description: "What each flow did", content: json({ type: "object" }) },
          401: { description: "Missing or wrong bearer token" },
          503: { description: "CRON_SECRET is not set, so scheduled sending is off" },
        },
      },
    },
    "/api/cron/abandoned-checkouts": {
      post: {
        tags: ["Recovery"],
        summary: "Recover checkouts left pending, over WhatsApp",
        security: [],
        description:
          "Called by Supabase's scheduler every five minutes, the same trigger_app_job mechanism " +
          "as advance-flows and sync-stores, just far more often — a 30-minute recovery window " +
          "needs it. Reads WooCommerce live rather than the mirror, since the regular sync (every " +
          "two hours) is too infrequent for this, and only for stores with abandonedCheckoutEnabled " +
          "set — this makes no WooCommerce call at all for a store that hasn't turned it on. Only " +
          "orders placed after recovery was switched on are ever considered, so turning it on " +
          "never messages an existing backlog as a batch. An eligible order left pending, on-hold " +
          "or failed for 30 minutes to 24 hours gets one reminder, ever; the opt-out list and an " +
          "unreadable phone number both produce a skip, not a send.",
        responses: {
          200: { description: "What each opted-in store's check did", content: json({ type: "object" }) },
          401: { description: "Missing or wrong bearer token" },
          503: { description: "CRON_SECRET is not set, so recovery is off" },
        },
      },
    },
    "/api/whatsapp/abandoned-checkouts": {
      get: {
        tags: ["Recovery"],
        summary: "The on/off switch, and recent activity",
        description:
          "No phone number is ever in the response — only what happened to each order. See " +
          "POST /api/cron/abandoned-checkouts for the mechanism.",
        responses: {
          200: {
            description: "Current setting and recent history",
            content: json({
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                storeUrl: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      orderId: { type: "integer" },
                      status: { type: "string", enum: ["messaged", "skipped"] },
                      skipReason: { type: "string", nullable: true },
                      messagedAt: { type: "string", format: "date-time", nullable: true },
                      createdAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            }),
          },
          409: errorResponse("No WooCommerce store is connected"),
        },
      },
      patch: {
        tags: ["Recovery"],
        summary: "Turn recovery on or off",
        description: "Requires the write scope: turning this on makes live WooCommerce calls every five minutes.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: { enabled: { type: "boolean" } },
            required: ["enabled"],
          }),
        },
        responses: {
          200: { description: "Saved", content: json({ type: "object", properties: { enabled: { type: "boolean" } } }) },
          403: errorResponse("The key lacks the write scope"),
          409: errorResponse("No WooCommerce store is connected"),
          422: errorResponse("A boolean enabled is required"),
        },
      },
    },
    "/api/whatsapp/order-confirmations": {
      get: {
        tags: ["Order confirmations"],
        summary: "The on/off switch, and recent activity",
        description:
          "No phone number is ever in the response — only what happened to each order. See " +
          "POST /api/webhooks/woo/{storeId}/order-created for the mechanism.",
        responses: {
          200: {
            description: "Current setting and recent history",
            content: json({
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                storeUrl: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      orderId: { type: "integer" },
                      status: { type: "string", enum: ["sent", "skipped"] },
                      skipReason: { type: "string", nullable: true },
                      sentAt: { type: "string", format: "date-time", nullable: true },
                      createdAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            }),
          },
          409: errorResponse("No WooCommerce store is connected"),
        },
      },
      patch: {
        tags: ["Order confirmations"],
        summary: "Turn order confirmations on or off",
        description:
          "Requires the write scope. Turning this on registers two real webhooks on the " +
          "merchant's own WooCommerce store (via the store's existing API credentials), both " +
          "pointed back at this app: order.created and order.updated, sharing one per-store " +
          "secret used to verify each delivery. Both are needed because order.created alone " +
          "fires before an off-site payment gateway has confirmed anything — order.updated is " +
          "what actually delivers the transition into a paid status for any order that didn't " +
          "start out that way. Turning it off removes both webhooks. Enabling fails with 422 " +
          "if this app is not reachable from the public internet over HTTPS yet (APP_URL unset " +
          "or pointing at a local address), and with 502 if WooCommerce refuses either " +
          "registration — in either case the setting is not saved, so it can never read \"on\" " +
          "with no live webhook behind it.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: { enabled: { type: "boolean" } },
            required: ["enabled"],
          }),
        },
        responses: {
          200: { description: "Saved", content: json({ type: "object", properties: { enabled: { type: "boolean" }, warning: { type: "string" } } }) },
          403: errorResponse("The key lacks the write scope"),
          409: errorResponse("No WooCommerce store is connected"),
          422: errorResponse("A boolean enabled is required, or this app is not publicly reachable yet"),
          502: errorResponse("WooCommerce refused the webhook registration"),
        },
      },
    },
    "/api/webhooks/woo/{storeId}/order-created": {
      post: {
        tags: ["Order confirmations"],
        summary: "WooCommerce order.created and order.updated events",
        // Not open in the sense of unauthenticated — it verifies an HMAC
        // signature against a per-store secret instead of a session or key,
        // the same class of exception as /api/billing/webhook.
        security: [],
        description:
          "Server-to-server from the merchant's own WooCommerce store, verified via the " +
          "X-WC-Webhook-Signature header against a per-store secret generated when order " +
          "confirmations were enabled (Settings → Order confirmations, or " +
          "PATCH /api/whatsapp/order-confirmations). Receives both order.created and " +
          "order.updated deliveries at this one URL. A delivery is only actually sent once the " +
          "order's status is \"processing\" or \"completed\" — order.created alone fires before " +
          "an off-site payment gateway has confirmed anything, so a still-pending order.created " +
          "is acknowledged but not recorded, leaving the later order.updated that carries the " +
          "paid status free to send. Deliveries that do proceed are deduplicated by (store, " +
          "WooCommerce order id), since WooCommerce delivers at-least-once and may redeliver " +
          "after downtime. Sends the customer a WhatsApp thank-you message with a product photo " +
          "from the order's first line item, subject to the same allowance, opt-out and session " +
          "checks every other WhatsApp send path applies.",
        parameters: [
          { name: "storeId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Processed, already seen, or intentionally skipped.", content: json({ type: "object" }) },
          400: errorResponse("Invalid JSON body"),
          401: errorResponse("Missing or invalid signature"),
          404: errorResponse("No such store, or order confirmations were never enabled for it"),
        },
      },
    },
    "/api/whatsapp/broadcast": {
      get: {
        tags: ["Campaigns"],
        summary: "Recent broadcasts",
        responses: { 200: { description: "Newest first", content: json({ type: "object" }) } },
      },
      post: {
        tags: ["Campaigns"],
        summary: "Start a broadcast",
        description:
          "Sends nothing itself. The job is created and batches are handed over by the " +
          "tick endpoint, which keeps the request short and the send resumable.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              filter: { $ref: "#/components/schemas/AudienceFilter" },
              range: { $ref: "#/components/schemas/DateRange" },
              customerKeys: { $ref: "#/components/schemas/CustomerKeys" },
              message: { $ref: "#/components/schemas/Message" },
              confirm: {
                type: "integer",
                description:
                  "Must equal the deliverable count shown by the dry run. The audience is " +
                  "re-resolved and the send refused if it has changed.",
              },
            },
            required: ["filter", "message", "confirm"],
          }),
        },
        responses: {
          201: { description: "Job created", content: json({ $ref: "#/components/schemas/Progress" }) },
          409: { description: "Audience changed, or the session cannot send", content: json(error) },
          422: errorResponse("Nobody in this audience is reachable"),
        },
      },
    },

    "/api/whatsapp/broadcast/{id}": {
      get: {
        tags: ["Campaigns"],
        summary: "Progress for one broadcast",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Progress", content: json({ $ref: "#/components/schemas/Progress" }) },
          404: errorResponse("No such broadcast"),
        },
      },
      post: {
        tags: ["Campaigns"],
        summary: "Hand the next batch to the gateway",
        description:
          "One batch per call. The gateway paces its own sends, so a request that waited " +
          "for a batch to finish would outlive any serverless function. Recovers a stopped " +
          "engine automatically.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Progress, or waiting while the previous batch drains",
            content: json({ $ref: "#/components/schemas/Progress" }),
          },
          404: errorResponse("No such broadcast"),
          502: errorResponse("The gateway rejected the batch"),
        },
      },
      delete: {
        tags: ["Campaigns"],
        summary: "Stop a broadcast",
        description: "Batches already accepted by the gateway still go out.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Cancelled", content: json({ $ref: "#/components/schemas/Progress" }) },
          404: errorResponse("No such broadcast"),
        },
      },
    },

    "/api/whatsapp/chats": {
      get: {
        tags: ["Inbox"],
        summary: "Conversations, matched to customers where possible",
        description:
          "Customer matching is time-boxed. A cold snapshot would otherwise make opening " +
          "the inbox wait on a full order-history pull, so it degrades to raw numbers.",
        responses: {
          200: { description: "Conversations", content: json({ type: "object" }) },
          409: errorResponse("No gateway connected"),
        },
      },
    },

    "/api/whatsapp/chats/{chatId}": {
      get: {
        tags: ["Inbox"],
        summary: "Messages in one conversation",
        parameters: [
          { name: "chatId", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", maximum: 200 } },
        ],
        responses: { 200: { description: "Oldest first", content: json({ type: "object" }) } },
      },
      post: {
        tags: ["Inbox"],
        summary: "Reply, or start a conversation",
        description:
          "Accepts a chat id or a bare phone number. One-to-one, so no audience machinery " +
          "is involved, but the opt-out list still applies.",
        parameters: [{ name: "chatId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: json({ $ref: "#/components/schemas/Message" }) },
        responses: {
          200: { description: "Sent", content: json({ type: "object" }) },
          409: errorResponse("Session cannot send, or the number has opted out"),
        },
      },
    },

    "/api/whatsapp/products": {
      get: {
        tags: ["Campaigns"],
        summary: "Search the catalogue",
        description: "Served from the cached snapshot, so typing costs nothing upstream.",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", maximum: 50 } },
        ],
        responses: { 200: { description: "Best sellers first", content: json({ type: "object" }) } },
      },
    },

    "/api/whatsapp/coupons": {
      get: {
        tags: ["Campaigns"],
        summary: "Coupons in WooCommerce",
        description:
          "Read live rather than from the snapshot, so a code created moments ago is usable. " +
          "Expired and exhausted codes are returned with `usable: false` rather than hidden.",
        responses: { 200: { description: "Usable ones first", content: json({ type: "object" }) } },
      },
      post: {
        tags: ["Campaigns"],
        summary: "Create a coupon",
        description:
          "The only endpoint in this application that writes to the store, and the only " +
          "reason the authorization requests read_write.",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: {
              code: { type: "string", description: "Generated if omitted" },
              discountType: { type: "string", enum: ["percent", "fixed_cart", "fixed_product"] },
              amount: { type: "number" },
              expiresInDays: { type: "integer", minimum: 1, maximum: 365 },
              usageLimit: { type: "integer" },
              usageLimitPerUser: { type: "integer", default: 1 },
              productIds: { type: "array", items: { type: "integer" } },
            },
            required: ["amount"],
          }),
        },
        responses: {
          201: { description: "Created", content: json({ type: "object" }) },
          401: errorResponse("The store key is read-only — reconnect to re-approve it"),
          422: errorResponse("Invalid discount"),
        },
      },
    },

    "/api/whatsapp/opt-out": {
      get: {
        tags: ["Campaigns"],
        summary: "Numbers excluded from every send",
        description: "Returned masked, since this is read in a browser.",
        responses: { 200: { description: "Opt-outs", content: json({ type: "object" }) } },
      },
      post: {
        tags: ["Campaigns"],
        summary: "Add a number to the opt-out list",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: { phone: { type: "string" }, reason: { type: "string" } },
            required: ["phone"],
          }),
        },
        responses: { 200: { description: "Added", content: json({ type: "object" }) } },
      },
      delete: {
        tags: ["Campaigns"],
        summary: "Remove a number from the opt-out list",
        parameters: [{ name: "phone", in: "query", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Removed", content: json({ type: "object" }) } },
      },
    },

    "/api/auth/session": {
      get: {
        tags: ["Auth"],
        summary: "Whether password protection is on, and whether you are signed in",
        // Public: gating the endpoint that reports whether you are signed in
        // would be circular.
        security: [],
        responses: { 200: { description: "Session state", content: json({ type: "object" }) } },
      },
      post: {
        tags: ["Auth"],
        summary: "Sign in",
        security: [],
        requestBody: {
          required: true,
          content: json({
            type: "object",
            properties: { password: { type: "string" } },
            required: ["password"],
          }),
        },
        responses: {
          200: { description: "Signed in", content: json({ type: "object" }) },
          401: errorResponse("Incorrect password"),
          400: errorResponse("Password login is not configured"),
        },
      },
      delete: {
        tags: ["Auth"],
        summary: "Sign out",
        security: [],
        responses: { 200: { description: "Signed out", content: json({ type: "object" }) } },
      },
    },

    "/api/openapi": {
      get: {
        tags: ["Analytics"],
        summary: "This document",
        // Public: it describes the API's shape, carries no store data, and is
        // what a developer reads to learn how to authenticate.
        security: [],
        description:
          "Public and unauthenticated: it describes the API's shape and contains no " +
          "store data, credentials or customer information.",
        responses: {
          200: { description: "The OpenAPI document", content: json({ type: "object" }) },
        },
      },
    },

    "/api/auth/woo/start": {
      get: {
        tags: ["Store"],
        summary: "Begin WooCommerce app authorization",
        // Public: this is how a session comes to exist in the first place.
        security: [],
        description:
          "Redirects to the store's own authorize page. There is deliberately no endpoint " +
          "anywhere that accepts a consumer key directly.",
        parameters: [
          { name: "url", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: { 302: { description: "Redirect to the store" } },
      },
    },
  },

  components: {
    securitySchemes: {
      ApiKey: {
        type: "http",
        scheme: "bearer",
        description:
          "An API key, created in Settings → API keys. Send it as " +
          "`Authorization: Bearer pc_live_…`; the header `X-API-Key: pc_live_…` " +
          "is accepted as an alternative for clients that reserve `Authorization` " +
          "for something else.\n\n" +
          "The key is shown once, at creation, and only its digest is stored — " +
          "there is no way to recover it later. Lose it and issue a new one.\n\n" +
          "Each key carries scopes. `read` covers everything that reads the store " +
          "or renders from it, including report exports and the assistant. `write` " +
          "is required for anything that acts in the world: sending messages, " +
          "creating coupons, editing flows. Calling an endpoint outside a key's " +
          "scopes returns 403 naming the scope that was missing.",
      },
      Session: {
        type: "apiKey",
        in: "cookie",
        name: "pulse_session",
        description:
          "The dashboard's own session, established by completing the WooCommerce " +
          "authorization flow. Browsers get this automatically; it is documented " +
          "because it is what the UI uses, not because an integration should try " +
          "to obtain one.",
      },
    },
    schemas: {
      ApiKeyRecord: {
        type: "object",
        description: "A key's metadata. Never includes the key or its digest.",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          display: {
            type: "string",
            description: "Abbreviated key, for recognising it in a list.",
            examples: ["pc_live_a3Kd…9fQ2"],
          },
          scopes: { type: "array", items: { type: "string", enum: ["read", "write"] } },
          createdAt: { type: "string", format: "date-time" },
          lastUsedAt: {
            type: "string",
            format: "date-time",
            description: "Recorded at most hourly, so it lags real use.",
          },
          revokedAt: { type: "string", format: "date-time" },
        },
        required: ["id", "name", "display", "scopes", "createdAt"],
      },
      DateRange: {
        type: "object",
        properties: {
          from: { type: "string", format: "date" },
          to: { type: "string", format: "date" },
        },
        required: ["from", "to"],
      },
      Message: {
        type: "object",
        description: "Variables such as {{name}} and {{product}} resolve per recipient.",
        properties: {
          type: { type: "string", enum: ["text", "image", "video"] },
          text: { type: "string", maxLength: 4000 },
          mediaUrl: { type: "string", format: "uri" },
          useProductImage: {
            type: "boolean",
            description: "Attach each recipient's own product photo instead of one shared image.",
          },
          coupon: {
            type: "object",
            properties: { code: { type: "string" }, value: { type: "string" } },
          },
          product: {
            type: "object",
            description: "One product for the whole campaign, overriding per-customer choice.",
            properties: {
              name: { type: "string" },
              url: { type: "string" },
              image: { type: "string" },
              category: { type: "string" },
            },
          },
        },
        required: ["type", "text"],
      },
      MenuOption: {
        type: "object",
        description: "One menu entry. Omitting `options` makes choosing it end the conversation.",
        properties: {
          key: { type: "string", description: "What the customer replies to choose this." },
          text: { type: "string" },
          options: { type: "array", items: { $ref: "#/components/schemas/MenuOption" } },
        },
        required: ["key", "text"],
      },
      CustomerKeys: {
        type: "array",
        maxItems: 50000,
        items: { type: "string" },
        description:
          "Narrows the audience to these customers. Keys, never phone numbers — a key " +
          "only means anything against the connected store's own data, the server still " +
          "resolves the number, and opt-outs are still applied afterwards.",
      },
      AudienceFilter: {
        type: "object",
        description:
          "Describes who to reach. Recipients are resolved server-side from this; the API " +
          "never accepts a list of phone numbers.",
        properties: {
          segments: { type: "array", items: { type: "string" } },
          tiers: { type: "array", items: { type: "string" } },
          recencyMin: { type: "integer", nullable: true },
          recencyMax: { type: "integer", nullable: true },
          minSpend: { type: "number", nullable: true },
          minOrders: { type: "integer", nullable: true },
          churnRiskMin: { type: "number", minimum: 0, maximum: 1, nullable: true },
          countries: { type: "array", items: { type: "string" } },
          accountType: { type: "string", enum: ["any", "business", "consumer"] },
          boughtProduct: { type: "string" },
          requireEmail: { type: "boolean" },
          requirePhone: { type: "boolean" },
        },
      },
      Progress: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: {
            type: "string",
            enum: ["sending", "paused", "completed", "cancelled", "failed"],
          },
          total: { type: "integer" },
          handedOff: { type: "integer" },
          remaining: { type: "integer" },
          percent: { type: "integer" },
          skipped: { type: "object" },
          estimatedMsRemaining: { type: "integer" },
          error: { type: "string", nullable: true },
        },
      },
    },
  },
} as const;
