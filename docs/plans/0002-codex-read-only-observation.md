# Task card 0002: Codex read-only observation vertical slice

Status: Proposed — owner approval required

Coordinator: Patchfleet coordinator

Builder: one implementation owner after approval

Reviewer: independent reviewer after the builder commit

Updated: 2026-07-15

## Objective

Replace the static shell with the smallest real Patchfleet control-loop slice:
probe the installed Codex CLI, observe recent interactive Codex sessions through
the supported app-server JSONL protocol, persist normalized lifecycle facts,
and render a restart-safe local dashboard.

The slice is read-only toward Codex. It does not start, resume, steer, interrupt,
archive, or otherwise mutate a Codex thread.

## Evidence and constraint

The official Codex app-server surface supports a stdio JSONL transport,
`initialize`, generated version-specific schemas, thread listing, and thread
reading. A sanitized local probe confirmed that the installed CLI exposes
`thread/list`, `thread/read`, thread status, turn status, and timestamps.

A fresh app-server process reports persisted sessions as `notLoaded`; it does
not prove that work running in another Codex client is live. Patchfleet must not
turn recency, `idle`, or `notLoaded` into a fake running or completed state.
[Proposed ADR 0009](../decisions/0009-codex-observation-uses-supported-app-server-metadata.md)
records this boundary.

## Observable outcome

After one same-origin refresh, the local page shows:

- whether Codex is installed and its reported CLI version;
- whether the app-server observation contract is supported;
- the observation time and a safe unavailable/degraded reason;
- up to the 20 most recent non-archived interactive sessions;
- only lifecycle states explicitly supported by thread or latest-turn metadata;
- the last durable projection after Patchfleet restarts.

The page never shows a prompt preview, thread title, working directory,
repository path, transcript, tool output, diff, model reasoning, token value, or
provider credential.

## Owned files

The builder may change only:

- `package.json`;
- `app/page.tsx`;
- `app/globals.css`;
- `app/api/observe/route.ts`;
- `lib/domain/observation.mjs`;
- `lib/providers/codex.mjs`;
- `lib/runtime/observation-store.mjs`;
- `lib/runtime/observe.mjs`;
- `tests/local-shell.test.js`;
- `tests/codex-adapter.test.mjs`;
- `tests/observation-store.test.mjs`;
- `README.md`;
- `docs/state/v0-codex-observation.md`.

Any additional file requires coordinator approval before editing. The builder
must not change this task card, an ADR, a shared protocol, or the roadmap.

## Read-only inputs

- `AGENTS.md`;
- `docs/product.md`;
- `docs/architecture.md`;
- `docs/plans/v0-local-first-control-loop.md`;
- ADRs 0002, 0004, 0005, 0008, and proposed ADR 0009;
- `.agents/skills/provider-adapters/SKILL.md`;
- `.agents/skills/local-runtime-state/SKILL.md`;
- [official Codex app-server manual](https://learn.chatgpt.com/docs/app-server.md).

## Provider contract

### Probe

The adapter must:

1. invoke `codex --version` with a bounded timeout;
2. distinguish missing executable, timeout, non-zero exit, and malformed
   version output through stable safe error codes;
3. start `codex app-server` over stdio only when observation is requested;
4. send `initialize` and `initialized` without experimental API opt-in;
5. close the child process after the snapshot or failure.

Do not read Codex SQLite, rollout JSONL, config, authentication files, process
memory, terminal output, or private Desktop APIs directly.

### Observe

Use one app-server connection to:

1. request the 20 most recent, non-archived sessions from interactive source
   kinds `cli`, `vscode`, `exec`, and `appServer`;
2. call `thread/read` with `includeTurns: true` only to inspect lifecycle
   metadata for those sessions;
3. discard every item, preview, name, path, cwd, git field, source payload,
   error detail, and other unapproved provider-native field before returning
   from the adapter;
4. return only validated normalized observations.

Twenty is the V0 ceiling. Do not add pagination or a 7/30-day retention policy
until real use proves the need.

### Lifecycle normalization

Use this precedence:

1. latest turn `completed`, `failed`, or `interrupted` becomes the same terminal
   normalized state, even if the top-level thread status is stale;
2. explicit thread `active` or latest turn `inProgress` becomes `running`;
3. `systemError` degrades observation but does not invent a failed session;
4. `idle`, `notLoaded`, missing turns, or unknown values become `unknown`.

Do not infer a terminal timestamp when Codex does not provide one. Do not infer
running state from timestamps or a recent update.

## Normalized data ceiling

The shared projection may contain only:

- provider id `codex` and display name;
- installed/available/degraded state;
- CLI version;
- capability flags for recent observation and explicit live status;
- opaque provider session id stored locally;
- normalized lifecycle status;
- provider-created timestamp when valid;
- Patchfleet last-observed timestamp;
- provider terminal timestamp only when supplied;
- optional stable safe error code and curated safe message.

The UI may shorten the opaque id for display. No provider title or preview may
be reused as a label.

## Durable local state

Use Node.js file and crypto primitives only:

- default data directory: ignored repository-local `.patchfleet/`;
- test override: `PATCHFLEET_DATA_DIR`;
- one serialized writer in the Next.js process;
- newline-delimited versioned events with random UUID identifiers;
- acknowledged append only after file sync succeeds;
- atomic derived projection write;
- deterministic replay;
- ignore only an incomplete final line;
- reject corruption anywhere else;
- emit a terminal transition only once for the same session state.

The minimum event types remain those in the active V0 plan: provider observed,
session observed, session terminal, and observation failed. Do not add a
database, event framework, migration framework, or background daemon.

Manual refresh may append repeated observation facts. This is the deliberate
V0 ceiling; compaction starts only after measured log growth.

## Local request boundary

The refresh action is the first local write path. Implement it as a bodyless
`POST /api/observe` followed by a `303` redirect to `/`.

Before spawning Codex or writing state, require:

- the existing allowed Host boundary;
- a present HTTP `Origin` whose scheme and host exactly match the request;
- rejection of missing, malformed, opaque, or cross-origin values.

No authentication is added for this read-only loopback action. Authentication
and stronger authorization remain mandatory before provider control, Cloud
pairing, or a non-loopback listener.

## UI states

The server-rendered page must cover:

- never observed;
- loading through native form submission feedback where practical;
- Codex unavailable;
- observation degraded with a curated safe reason;
- empty recent sessions;
- running and recent terminal sessions;
- unknown/not-live-observed sessions;
- stale durable projection after restart;
- fatal local-storage corruption.

Use semantic HTML, visible focus, responsive layout, and system light/dark
colors. Do not add charts, animation, client state management, a component
library, or decorative agent mock data.

## Runnable checks

### Adapter conformance

A fake JSONL app-server check covers:

- executable unavailable;
- startup/request timeout;
- initialize or method error;
- invalid JSON and malformed response;
- active, completed, failed, interrupted, `notLoaded`, and `systemError` input;
- stale top-level active with a terminal latest turn;
- child cleanup after success and failure;
- canary prompt/path/transcript/tool fields absent from adapter output.

### Persistence and projection

Node tests cover:

- append and replay;
- duplicate event id rejection;
- incomplete final-line recovery;
- middle corruption failure;
- deterministic projection rebuild;
- repeated observation without a duplicate terminal transition;
- atomic projection replacement;
- forbidden canary data absent from event log and projection.

### Web boundary and vertical slice

The existing local-shell integration check is extended to cover:

- same-origin POST accepted and redirected;
- missing and cross-origin POST rejected before adapter invocation;
- security headers remain present;
- never-observed, empty, unavailable, degraded, populated, and fatal-storage UI
  mapping through controlled local data;
- one fake adapter observation reaching a durable projection and page.

## Acceptance

- `npm test` succeeds without a new dependency.
- `npm run build` succeeds.
- `git diff --check` succeeds.
- package lock and dependency sets are unchanged.
- a real local smoke detects the installed Codex version and completes a
  sanitized observation without printing or persisting forbidden fields.
- restart drill proves the dashboard reads the last projection without
  re-running Codex.
- running and terminal labels appear only from the lifecycle rules above.
- a cross-origin refresh cannot spawn Codex or change local state.
- no Cloud or other network request exists.
- worktree is clean after the builder commit.

## Stop conditions

Stop and return to the coordinator if:

- the installed Codex version lacks `thread/list` or `thread/read`;
- only human-formatted output can satisfy a required field;
- a provider response cannot be reduced without persisting forbidden data;
- Next.js cannot prove the same-origin refresh gate;
- concurrent writer ownership cannot be guaranteed in dev and production;
- the real provider contradicts ADR 0009 lifecycle semantics.

Do not widen the adapter, read private Codex files, or add a daemon to work
around a stop condition.

## Forbidden scope

- starting, resuming, steering, interrupting, or deleting Codex work;
- Claude Code or Gemini adapters;
- prompts, responses, reasoning, transcripts, tools, diffs, tokens, cwd, or
  repository metadata in normalized state;
- automatic polling or a background service;
- provider file scraping or OS process heuristics;
- Cloud pairing, sync, auth, billing, analytics, or telemetry;
- desktop packaging;
- pagination, search, labels, filtering controls, or retention settings;
- new runtime or test dependencies.

## Handoff

The builder must update `docs/state/v0-codex-observation.md`, create one focused
local commit, and report the commit hash, files, exact checks, sanitized real
smoke result, and remaining risks. The builder must not push.

The reviewer starts only after that commit exists. The reviewer independently
checks protocol truth, data minimization, recovery, same-origin enforcement,
scope, and every acceptance command without rewriting the builder commit.
