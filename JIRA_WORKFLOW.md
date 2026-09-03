# AI agent feature workflow (Jira)

The canonical, step-by-step protocol an AI coding agent (Claude Code,
Antigravity, or similar) follows when asked to build a new feature for
PulseCommerce. It exists so any agent — regardless of session, regardless of
which developer is driving — reaches the same Jira state at the same point
in the work, without being told this from scratch each time.

Read [AGENTS.md](AGENTS.md) first for repo-specific gotchas (including *why*
a branch+PR is required instead of a direct push) and
[CONTRIBUTING.md](CONTRIBUTING.md) for local setup and checks. This file is
specifically about *when to touch Jira* while doing the work.

## Prerequisite

Your own personal Jira API token, exported locally (`JIRA_EMAIL` /
`JIRA_API_TOKEN`, or whatever your tooling expects) — see AGENTS.md's "Jira
workflow for AI agents" section. Without it you cannot create issues or
transition status; ask the developer directing you if you don't have one
rather than silently skipping the Jira steps.

Jira site: `setups-works.atlassian.net`, project key `PUL`.

## The flow

### 1. No Jira issue exists yet → create one

If a developer asks for a new feature and there's no matching PUL issue,
create it before writing any code:

```
POST /rest/api/3/issue
{
  "fields": {
    "project": {"key": "PUL"},
    "summary": "<short, specific summary>",
    "description": <ADF doc — see "Writing the description" below>,
    "issuetype": {"name": "Task"}
  }
}
```

New issues start in **To Do**. Don't skip this even for a small feature — an
issue with no Jira record is invisible to the rest of the team and to
whoever reviews the PR later.

**Writing the description:** written for another developer, or another
agent in a different session with no memory of this conversation, to pick
up cold — the same bar as this board's existing "Agent prompt" comments.
Include the concrete context/problem, real file paths likely involved, and
a "done when" checklist. A one-line summary is not a description.

### 2. About to start writing code → transition to In Progress

Before the first line of implementation code (not before research or
exploration — before you start changing files):

```
GET  /rest/api/3/issue/{key}/transitions   # find the "In Progress" id
POST /rest/api/3/issue/{key}/transitions
{ "transition": { "id": "<in-progress-id>" } }
```

This is what tells a human glancing at the board that an agent is actively
working on it right now, not just that it's assigned and untouched.

### 3. Do the work

Branch off `main`, named with the issue key (e.g. `feature/pul-14-...`).
Commit with the issue key at the start of every commit message
(`PUL-14: ...`). This has to be a branch, not a direct push to `main` — see
AGENTS.md: a direct push was observed sitting unlinked to its issue for
15+ minutes on this repo, while a PR linked within seconds.

### 4. Push and open the PR → transition to In Review

The moment the PR is open — not after it's merged:

```
POST /rest/api/3/issue/{key}/transitions
{ "transition": { "id": "<in-review-id>" } }
```

PR title starts with the issue key, matching the commit convention. This is
the signal for a human reviewer: code is written, checks pass locally, it's
their turn now.

### 5. After merge → transition to Done

Once the PR is actually merged — by human review approval, or by the agent
only if the developer explicitly authorized merging for this specific
task — transition to Done. Don't self-merge and self-mark-Done without that
authorization: merging is a real, visible action on shared history and
needs the same confirmation any other merge does, task-by-task, not a
standing blanket approval.

## Status reference

| Status | Meaning | Who moves it, and when |
|---|---|---|
| To Do | Issue exists, no work started | Whoever files it |
| In Progress | An agent (or developer) is actively writing code for it | Agent, right before the first code change |
| In Review | PR is open, code is written | Agent, the moment the PR is created |
| Done | Merged and complete | Agent or reviewer, after merge |

## What NOT to do

- Don't jump to In Progress or In Review without the issue existing first —
  the issue is what a developer or reviewer follows, not the PR alone.
- Don't transition to Done before the PR is actually merged — an open PR is
  not done work.
- Don't skip a transition because "it'll get there eventually" — a board
  that only reflects state at the end isn't useful mid-flight, which is the
  entire reason this protocol exists.
