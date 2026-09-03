# Contributing to PulseCommerce

This project is built and reviewed with AI coding agents (Claude Code, Codex,
and similar) in the loop, not as an afterthought — the files below exist
because of that, and using them is part of how work gets done here, not
optional reading.

## Before you write any code

1. Read [README.md](README.md) — architecture, every pipeline, every feature,
   deployment, troubleshooting. It is long because the system is not simple;
   skimming it costs you more time later than reading it now.
2. Read [AGENTS.md](AGENTS.md) — the things a careful read of the code alone
   won't surface fast enough: real gotchas from real incidents in this
   codebase (the pg_cron-not-Vercel-Cron mixup, the per-tenant config bug
   shape, the tenant-scoping chokepoint). `CLAUDE.md` at the repo root loads
   this automatically for AI agents; read it yourself too.
3. If you're about to touch one of these subsystems, its own `CLAUDE.md`
   has the local gotchas AGENTS.md doesn't repeat:
   - [src/lib/auth/CLAUDE.md](src/lib/auth/CLAUDE.md) — the tenant-scoping chokepoint
   - [src/lib/whatsapp/CLAUDE.md](src/lib/whatsapp/CLAUDE.md) — gateway sessions, per-tenant config
   - [src/lib/woo/CLAUDE.md](src/lib/woo/CLAUDE.md) — WooCommerce client, field trimming, scope
   - [src/lib/analytics/CLAUDE.md](src/lib/analytics/CLAUDE.md) — the pure engine and its cache
   - [src/app/api/CLAUDE.md](src/app/api/CLAUDE.md) — route conventions, OpenAPI, auth
   - [supabase/migrations/CLAUDE.md](supabase/migrations/CLAUDE.md) — pg_cron, migration workflow
   - [packages/sdk/CLAUDE.md](packages/sdk/CLAUDE.md) and [packages/cli/CLAUDE.md](packages/cli/CLAUDE.md)

## Working with an AI agent on this repo

- **Give it the same reading list above.** An agent that hasn't read
  `AGENTS.md` will confidently reintroduce bugs this project already paid to
  fix once — the Vercel Cron assumption and the `whatsapp_config` table are
  the two most likely to come back from training-data priors alone.
- **The tenant chokepoint is not negotiable.** Any agent-written handler that
  queries a tenant-owned table must go through `resolveTenant` /
  `requireTenant` / `requireStore` / `activeStore`
  (`src/lib/auth/tenant.ts`). Review every new route for this specifically —
  it is the one shortcut that turns into a cross-tenant data leak, and an
  agent optimizing for "does it work" has no reason to know that on its own.
- **New routes need an OpenAPI entry in the same commit.**
  `scripts/check-openapi.mjs` fails CI otherwise. Point the agent at
  `src/lib/openapi.ts` and an existing route of the same shape.
- **The WhatsApp gateway is a specific fork, not upstream OpenWA.**
  Everything WhatsApp-facing talks to
  https://github.com/rmyndharis/OpenWA, and that repo's source is the
  source of truth for its behavior — not OpenWA's own docs, which this fork
  has already been found to disagree with. Point the agent at that repo
  before it adds a new gateway call or plugin integration; see
  `src/lib/whatsapp/CLAUDE.md`.
- **Anything that can message a real phone number needs a human in the
  loop.** Test sends go to one established test number, never a number read
  from real WooCommerce order/customer data, unless a person in the
  conversation explicitly names a different recipient. This applies to
  agent-run verification the same as it applies to a person testing by hand.
- **Don't let an agent turn on `abandoned_checkout_enabled` for a store with
  a real backlog** without understanding the `enabled_at` boundary in
  AGENTS.md first — the whole point of that column is that flipping the
  switch never messages an existing backlog as a batch.

## Picking up a Jira issue

Work is tracked on the [PulseCommerce Jira board](https://setups-works.atlassian.net/jira/software/projects/PUL/boards/2),
not GitHub Issues. Most issues carry an **"Agent prompt" comment** — hand
that to your coding agent (Claude Code, Antigravity, or similar) directly
rather than just the issue title; it already has the file pointers and a
"done when" checklist so the agent doesn't need to re-derive scope.

- **Branch, commit, and open a PR — don't push straight to `main`.** Start
  every commit message and the PR title with the issue key (`PUL-12: ...`).
  GitHub for Jira links a PR to its issue within seconds; a direct push to
  `main` was observed sitting unlinked for 15+ minutes on this repo even
  with a correctly-keyed commit message, so branch + PR is the reliable
  path, not just the tidier one.
- **You need your own personal Jira API token for any agent tooling that
  calls Jira directly** (transitioning an issue, commenting, filing a
  sub-task) — generate one at
  `id.atlassian.com/manage-profile/security/api-tokens` and export it in
  your own shell/agent config. This is separate from `.env.local` (that's
  app runtime config the Next.js app reads; Jira credentials never are).
  Never commit a token, never use someone else's.
- Filing a new feature or bug: add it to the Jira board yourself if you
  have access, or open a GitHub issue with
  [the feature-request template](.github/ISSUE_TEMPLATE/feature_request.md) —
  it gets triaged into a Jira issue from there.
- **Asking an agent to build a feature that has no issue yet?** It should
  create the issue itself, move it to In Progress before writing code, and
  to In Review the moment its PR is open — see
  [JIRA_WORKFLOW.md](JIRA_WORKFLOW.md) for the exact protocol. It should not
  self-merge and mark Done without you having authorized that for the
  specific task.

## Local setup, code style, and checks

See [README.md § Quick start](README.md#quick-start) for getting a dev
environment running, and [README.md § Scripts](README.md#scripts) for the
full script list. In short:

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # Playwright end-to-end suite
```

All four must pass before a PR is reviewable. CI
([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the same four
checks plus the OpenAPI coverage check, so failures surface there even if
skipped locally — but running them yourself first is faster than waiting on
CI to tell you.

There is no separate style guide beyond what ESLint and the existing code
enforce: match the file you're editing, prefer the pattern already used
elsewhere in the same subsystem over inventing a new one, and read the
subsystem's `CLAUDE.md` before assuming a shortcut is safe.

## Opening a PR

- Start the PR title with the Jira issue key (`PUL-12: ...`) — see
  [Picking up a Jira issue](#picking-up-a-jira-issue) above for why this
  needs to be a PR and not a direct push.
- Keep the "why" in the commit message and PR description, not just the
  "what" — this project's own commit history is written that way
  deliberately, and an AI agent reviewing the diff later benefits from the
  same context a human reviewer does.
- If your change affects a documented behavior in `README.md` (a pipeline, a
  cron cadence, an environment variable), update the README in the same PR.
  A README claim that quietly goes stale is exactly the kind of bug this
  project has already been bitten by once (see the Vercel Cron history in
  `AGENTS.md`).
