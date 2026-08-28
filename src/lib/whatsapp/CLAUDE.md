# src/lib/whatsapp — orientation for AI agents

Everything here talks to a gateway you (the merchant) run yourself, never to
a third-party messaging API — see `AGENTS.md` and `README.md` § WhatsApp
campaigns for why. The gotchas below are specific to this directory.

## config.ts is per-tenant. It must stay that way.

`whatsapp_config` (single-tenant) was dropped for `whatsapp_connections`
(per-user) in the multi-tenant migration, and every exported function here
takes `userId` as its first real parameter as a result —
`readWhatsAppConfig(userId)`, `writeWhatsAppConfig(userId, config)`,
`clearWhatsAppConfig(userId)`, `rememberAdoptedSession(userId, sessionId)`.
This was a real, long-lived production bug (see `AGENTS.md` § "Known-shape
bug"): every WhatsApp route silently broke until it was fixed. If you add a
new function to this file, or a new per-tenant config table anywhere in the
app, it needs a real `userId`/tenant parameter — a config helper with no id
parameter in a multi-tenant app has no way to be correct.

## client.ts — shapes are checked against a live gateway, not the schema

This app's gateway is a self-hosted fork of OpenWA at
**https://github.com/rmyndharis/OpenWA** — that repo, not the upstream
OpenWA project or its published docs, is the actual source of truth for
every endpoint, plugin, and response shape this client talks to. If you're
adding a new gateway call or a new plugin integration, read the route
handler in that repo first; don't infer behavior from OpenWA's general
documentation, which this fork has already been found to disagree with.

The comment at the top of this file is not decorative: this gateway's
documented schema and its actual behavior disagree in at least one place
that matters (session state lives on `GET /api/sessions/{id}`, not
`/status`, which is the WhatsApp Stories API and returns `{"statuses":[]}`
regardless of what the session is doing). If you add a new gateway call,
verify the response shape against a real running instance of the gateway
(or the fork's own source) before trusting any docs — the existing shapes
in this file already paid that cost once.

`isSessionSendable(session)` is the one gate every send path checks before
calling `sendText`/`sendMedia`. `ensureSendable()` reconciles the persisted
`status` column against the gateway's live state — after a gateway restart
the database can still say `ready` while the engine is actually gone, and a
send in that state fails for every recipient. Don't add a second path that
sends without going through this check.

## phone.ts — conservative on purpose

`normalisePhone` returns `null` far more often than it guesses. This is
deliberate: a recipient dropped for being unparseable is recoverable (it
shows up as a skip, with a reason); a message sent to a re-normalised wrong
number is not. If you're tempted to make this "smarter" for one store's
number format, check whether that assumption holds for every other
connected store first — it almost certainly doesn't.

## opt-out.ts — enforced at send time, not in the UI

The opt-out list is checked server-side, after the audience is resolved,
inside every send path (broadcast, flow step, abandoned-checkout reminder,
assistant-approved send) — never as a UI-only filter. If you add a new way
to send a message to a WhatsApp number, it must check this list itself; there
is no shared middleware that does it for you, only the discipline of every
existing send path checking it explicitly.

## recipients.ts / broadcast.ts / flows.ts

`resolveAudience` (recipients.ts) is the only place a filter becomes an
actual phone number — the browser never sends or receives numbers, only a
filter and a `customerKey`. Broadcasts and flows both re-resolve the
audience at send time rather than trusting a count computed earlier (see
`README.md` § Broadcast pipeline for why: "the audience changed" must refuse
the send, not silently send to a stale list).

## menu.ts, templates.ts, schema.ts, errors.ts

Smaller, more self-explanatory. `templates.ts`'s `TemplateVariables` shape is
about a customer's past purchase history for a campaign message — it is a
different shape from a one-off transactional message (like the
abandoned-checkout reminder), which deliberately does not reuse it. Don't
force the two together; they answer different questions.
