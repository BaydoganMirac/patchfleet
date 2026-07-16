# Task card 0008: Gemini native extension lifecycle ingress

Status: Approved

Coordinator: Patchfleet coordinator

Builder: one integration owner after approval

Reviewer: one independent reviewer after the builder commit

Updated: 2026-07-16

Approved by owner: 2026-07-16

Depends on: Task cards 0004, 0006, and 0007 completed and independently reviewed

## Objective

Connect the proven Gemini hook decoder to the existing single-writer runtime
through a native linked Gemini extension and a sanitized local inbox.

No real Gemini extension is linked or removed by the Builder. The repository
ships the extension and documented commands; the owner performs the native
consent-bearing setup separately.

## Observable outcome

A synthetic extension hook invocation persists only a normalized lifecycle
signal in the inbox. One manual refresh drains it idempotently into the
existing event log and projection, after which the dashboard shows the Gemini
session without exposing any raw hook field. Missing or inactive setup remains
an honest degraded provider state and does not affect Codex or Claude data.

## Approved design

- Use accepted [ADR 0012](../decisions/0012-gemini-native-extension-lifecycle-inbox.md).
- Register only `SessionStart`, `BeforeAgent`, and `AfterAgent` in a checked-in
  `patchfleet-gemini` extension.
- Reuse the existing decoder; do not duplicate its allowlist.
- Write one validated signal per atomic inbox file with owner-only modes.
- Drain signals only during the existing manual refresh; add no watcher,
  daemon, HTTP ingress, token, or background polling.
- Revalidate at the runtime boundary and persist through the existing
  serialized writer.
- Treat an exact previously persisted signal as an idempotent retry.
- Preserve at most 20 recent Gemini sessions while the extension is active.
- Do not emit `session.terminal` or invent `terminalAt` from `AfterAgent` or
  `SessionEnd`.
- Let Gemini CLI own link, consent, enablement, and uninstall state. Never
  merge the user's settings file.

## Owned files

The Builder may change only:

- `extensions/patchfleet-gemini/**`;
- `lib/providers/gemini.mjs`;
- one new inbox module under `lib/runtime/`;
- `lib/runtime/observation-store.mjs`;
- `lib/runtime/observe.mjs`;
- `tests/gemini-adapter.test.mjs`;
- `tests/observation-store.test.mjs`;
- one focused inbox test under `tests/`;
- `tests/local-shell.test.js` only if the dashboard path needs end-to-end proof;
- `README.md`;
- `docs/state/v0-gemini-lifecycle-ingress.md`.

Any additional production file requires coordinator approval. Shared
protocol, Cloud, command-intent, UI-control, middleware, package, dependency,
and lock files are read-only.

## Read-only inputs

- `AGENTS.md`;
- `docs/product.md`;
- `docs/architecture.md`;
- [ADR 0004](../decisions/0004-append-only-local-events.md);
- [ADR 0008](../decisions/0008-browser-originated-local-request-boundary.md);
- [ADR 0010](../decisions/0010-supported-provider-observation-surfaces.md);
- [ADR 0011](../decisions/0011-multi-provider-observation-projection.md);
- accepted [ADR 0012](../decisions/0012-gemini-native-extension-lifecycle-inbox.md);
- [Task card 0006](0006-gemini-cli-hook-observation.md);
- [Task card 0007](0007-multi-provider-production-observation.md);
- `.agents/skills/provider-adapters/SKILL.md`;
- `.agents/skills/local-runtime-state/SKILL.md`;
- `.agents/skills/team-task-contract/SKILL.md`;
- `lib/domain/provider-lifecycle-signal.mjs`.

## Required behavior

### Native extension

- Use a valid `patchfleet-gemini` manifest and `hooks/hooks.json`.
- Use Gemini's `${extensionPath}` and platform separator variables rather than
  embedding a checkout path in repository files.
- Keep hook timeout bounded and run no shell command derived from hook input.
- Emit exactly `{}` on stdout and no raw stderr on success or failure.
- Document native link, Gemini restart, status, and uninstall commands.

### Inbox

- Persist only the validated lifecycle-signal object, never raw stdin.
- Resolve the data directory from `PATCHFLEET_DATA_DIR` when set; otherwise
  resolve the source checkout from the hook module's real path and use the
  existing repository-local `.patchfleet` directory. Never use Gemini's
  workspace cwd or a path supplied by hook stdin.
- Use a private directory, owner-readable files, unique names, and atomic
  replacement.
- Ignore unknown filenames; reject and remove invalid Patchfleet inbox files
  without appending an event.
- Leave a valid file in place when the canonical append fails so refresh can
  retry it.
- Delete a valid file only after the durable event append succeeds.

### Events and projection

- Reuse event schema version 1 and existing event meanings.
- Scope sessions to Gemini and preserve Codex/Claude projections.
- Accept `createdAt: null`; never substitute receipt time.
- Keep the 20-session limit deterministic.
- Deduplicate a retried identical signal without creating a second observed
  event.
- Preserve hook-observed Gemini sessions when a later active-extension probe
  refreshes provider version and capabilities.
- Clear current Gemini sessions only when setup is absent or inactive; retain
  their immutable history in the event log.

## Runnable checks

Tests cover:

- valid extension manifest and three exact hook registrations;
- bounded status probe for active, missing, inactive, timeout, malformed,
  unavailable, blank, and empty-array extension-list results; blank and empty
  mean setup required rather than probe corruption;
- raw prompt, response, cwd, transcript, tool, token, environment, credential,
  and path canaries absent from every inbox file, event, projection, stdout,
  stderr, and error;
- one valid atomic inbox signal and one invalid inbox file;
- refresh drain, retry after failed append, exact-signal idempotency, and
  cleanup only after durable success;
- `SessionStart -> unknown`, `BeforeAgent -> running`, and
  `AfterAgent -> completed` without `session.terminal`;
- nullable creation time and deterministic 20-session retention;
- active extension preserving Gemini sessions across refresh;
- missing setup clearing only current Gemini sessions;
- existing crash-tail, corruption, legacy Codex, route, Codex, and Claude
  checks remaining green.

## Acceptance

- `npm test` succeeds.
- `npm run build` succeeds.
- `git diff --check` succeeds.
- no dependency or lockfile change.
- no actual user Gemini settings or installed-extension state changes during
  Builder or automated test work.
- only owned files change.
- independent review reports no unresolved P0-P2 finding.
- worktree is clean after local commits.

## Stop conditions

Stop and return to the coordinator if:

- hook input must cross HTTP or Cloud before sanitization;
- setup requires direct user-settings mutation or parsing human CLI output;
- persistence requires a new event meaning, second event log, database,
  watcher, daemon, or lock service;
- a path, prompt, response, transcript, tool payload, token, environment value,
  or native hook object must enter durable state;
- reliable lifecycle requires treating `SessionEnd` as success/failure or
  `AfterAgent` as CLI process exit;
- a new dependency is required.

## Forbidden scope

- automatically linking, enabling, disabling, or uninstalling the owner's real
  Gemini extension;
- direct `~/.gemini/settings.json` reads or writes;
- browser setup buttons or mutating setup routes;
- background polling, filesystem watchers, daemon, desktop packaging, or
  service installation;
- local control, work intake, questions, Cloud, pairing, auth, billing,
  telemetry, notifications, or remote intents;
- provider registry, base class, plugin SDK, database, or new dependency.

## Handoff

The Builder updates `docs/state/v0-gemini-lifecycle-ingress.md`, creates one
focused local commit, and reports its hash, changed files, exact checks, and
remaining risks. The Builder does not push.

The Reviewer starts only after the Builder commit exists and checks native
extension validity, settings non-mutation, fail-open hook behavior, field
selection, inbox atomicity, retry/idempotency, single-writer persistence,
Gemini lifecycle honesty, provider isolation, exact scope, and test evidence.
