# Task card 0006: Gemini CLI hook observation proof

Status: Completed

Coordinator: Patchfleet coordinator

Builder: one Gemini CLI adapter owner after Task card 0004

Reviewer: independent reviewer after the builder commit

Updated: 2026-07-16

Approved by owner: 2026-07-16

Completed: 2026-07-16

Independent review: Passed after shared test-runner stabilization

Depends on: Task card 0004 completed and independently reviewed

## Objective

Implement the smallest honest Gemini CLI observation proof: a bounded version
probe, a safe setup-required provider observation, and a pure decoder for
explicitly configured Gemini command-hook JSON.

The task does not install hooks, accept HTTP, persist lifecycle signals, or
claim historical/current session inventory. It proves the provider-specific
decoder that a later owner-approved setup and integration task can invoke.

## Observable outcome

`npm test` proves Gemini unavailable and setup-required observations pass the
shared observation conformance, while supported synthetic hook inputs produce
only the lifecycle-signal contract from Task card 0004. Forbidden hook fields
and canaries are absent from every returned value and diagnostic.

## Supported surface

The adapter may invoke only `gemini --version` for a bounded probe. It must not
execute or parse `gemini --list-sessions`.

The decoder accepts one bounded JSON value shaped like Gemini's documented
command-hook stdin. It selects only:

- `session_id`;
- `hook_event_name`;
- `timestamp`.

It ignores and discards every other field before returning. It never reads the
`transcript_path`, cwd, prompt, response, tool, model, environment, or any path
named by the payload.

## Owned files

The builder may change only:

- `lib/providers/gemini.mjs`;
- `tests/gemini-adapter.test.mjs`;
- `docs/state/v0-gemini-observation.md`.

Any additional file requires coordinator approval. The builder must not edit a
shared domain file, conformance helper, Codex or Claude adapter, runtime, store,
route, UI, settings, package metadata, ADR, plan, or another feature state.

## Read-only inputs

- `AGENTS.md`;
- `docs/product.md`;
- `docs/architecture.md`;
- `docs/agent-operating-model.md`;
- [Task card 0003](0003-provider-observation-conformance.md);
- [Task card 0004](0004-provider-lifecycle-contract.md);
- [ADR 0010](../decisions/0010-supported-provider-observation-surfaces.md);
- `.agents/skills/provider-adapters/SKILL.md`;
- `.agents/skills/team-task-contract/SKILL.md`;
- `lib/domain/provider-lifecycle-signal.mjs`;
- `tests/support/provider-observation-conformance.mjs`;
- [Gemini CLI hook reference](https://geminicli.com/docs/hooks/reference/).

## Probe and setup state

Probe `gemini --version` with `execFile`, a bounded timeout, a bounded output
buffer, and no shell. Validate a semantic version and return fixed safe errors
for unavailable, timeout, failure, and malformed version cases.

An installed CLI without a configured Patchfleet hook returns a degraded
observation with `GEMINI_HOOK_SETUP_REQUIRED`, no sessions, and both observation
capabilities false. This is an honest setup state, not a fake available
snapshot. The adapter must not inspect settings to guess whether setup exists.

## Hook decoding

The pure decoder maps:

- `SessionStart` -> `unknown` signal;
- `BeforeAgent` -> `running` signal;
- `AfterAgent` -> `completed` signal;
- `SessionEnd` -> no lifecycle signal.

`AfterAgent` means the current agent turn produced a final response; it does
not prove that the interactive CLI process exited. `SessionEnd` reason does not
prove success or failure, so it cannot overwrite a prior explicit state.

Failed and interrupted are unsupported because Gemini 0.43.0 does not
guarantee an equivalent hook on model error or abort. Do not infer either from
missing `AfterAgent`, elapsed time, exit reason, or process state.

The provider hook command that eventually wraps this decoder must emit exactly
`{}` to stdout and no raw stderr. Creating that executable and registering it
are outside this task.

## Runnable checks

Tests cover:

- executable unavailable, timeout, non-zero, malformed, and valid versions;
- setup-required degraded and unavailable shared conformance;
- valid `SessionStart`, `BeforeAgent`, `AfterAgent`, and `SessionEnd` fixtures;
- invalid JSON, oversized input, missing fields, invalid ids, invalid timestamp,
  and unsupported hook event;
- `SessionEnd` producing no lifecycle transition;
- no failed/interrupted inference on error/abort/missing events;
- prompt, response, cwd, transcript, tool input/output, model, token,
  environment, credential, source, reason, and native payload canaries absent
  from decoder output and errors;
- proof that no test or production path invokes `--list-sessions`, ACP,
  headless prompt mode, or a settings command.

## Acceptance

- Task card 0004 is completed and independently reviewed first.
- `npm test` succeeds without a new dependency.
- `npm run build` succeeds.
- `git diff --check` succeeds.
- only the three owned files change.
- a sanitized real `gemini --version` smoke succeeds without starting a prompt.
- no user, project, system, or extension settings are read or changed.
- no hook payload is logged or persisted.
- worktree is clean after the builder commit.

Completion of this proof does not make Gemini observation available in the
dashboard. Setup, secure local ingestion, single-writer persistence, restart
recovery, and UI integration remain approval-gated follow-on work.

## Stop conditions

Stop and return to the coordinator if:

- satisfying observation requires session-list output, transcript/history
  files, ACP, headless prompt execution, process inspection, or private state;
- a hook field outside the three-field allowlist is required;
- the decoder would need to store raw stdin or write a second lifecycle log;
- setup cannot be explicit, reversible, and ownership-preserving;
- reliable status requires invented timestamps, failed/interrupted inference,
  or a shared contract change.

## Forbidden scope

- hook installation, settings mutation, extensions, or project file changes;
- stdin executable, HTTP listener, authentication, queue, file, or database;
- production persistence, runtime, route, UI, or migration work;
- Claude, Codex, Cloud, telemetry, auth, packaging, or new dependencies;
- a provider base class, registry, plugin system, ACP client, or polling daemon.

## Handoff

The builder updates `docs/state/v0-gemini-observation.md`, creates one focused
local commit, and reports its hash, changed files, exact checks, version smoke,
and remaining risks. The builder must not push.

The reviewer starts only after that commit exists and checks that the human
session list is never used, payload selection is strict, lifecycle claims are
honest, settings remain untouched, conformance is reused, and file scope is
exact.
