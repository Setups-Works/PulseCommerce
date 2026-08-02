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
      "who is not a customer of the connected store or who has opted out.",
  },
  servers: [{ url: "/", description: "This deployment" }],
  tags: [
    { name: "Analytics", description: "Computed metrics from the cached store snapshot" },
    { name: "Store", description: "WooCommerce connection and data window" },
    { name: "Reports", description: "Excel, PDF and CSV exports" },
    { name: "WhatsApp", description: "Gateway connection and session" },
    { name: "Campaigns", description: "Audience resolution and broadcasts" },
    { name: "Flows", description: "Multi-step campaigns advanced on a schedule" },
    { name: "Inbox", description: "Conversations and replies" },
    { name: "Auth", description: "Optional password sessions" },
  ],
  paths: {
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
    "/api/cron/flows": {
      post: {
        tags: ["Flows"],
        summary: "Advance every active flow",
        description:
          "Called by Vercel Cron with the project's CRON_SECRET as a bearer token, and closed when " +
          "that secret is unset. What is due is computed from stored timestamps, so a tick that is " +
          "skipped, retried or runs late sends the same messages, once. GET does the same work.",
        responses: {
          200: { description: "What each flow did", content: json({ type: "object" }) },
          401: { description: "Missing or wrong bearer token" },
          503: { description: "CRON_SECRET is not set, so scheduled sending is off" },
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
        responses: { 200: { description: "Session state", content: json({ type: "object" }) } },
      },
      post: {
        tags: ["Auth"],
        summary: "Sign in",
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
        responses: { 200: { description: "Signed out", content: json({ type: "object" }) } },
      },
    },

    "/api/openapi": {
      get: {
        tags: ["Analytics"],
        summary: "This document",
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
    schemas: {
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
