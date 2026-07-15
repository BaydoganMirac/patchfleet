# Task card 0005: Claude Code Agent View observation proof

Status: Completed

Coordinator: Patchfleet coordinator

Builder: one Claude Code adapter owner after Task card 0004

Reviewer: independent reviewer after the builder commit

Updated: 2026-07-16

Approved by owner: 2026-07-16

Implementation: 2026-07-16

Independent review: Passed after focused empty-id and real timestamp corrections

Real-provider smoke: Passed with one sanitized nonempty Agent View snapshot

Depends on: Task card 0004 completed and independently reviewed

## Objective

Implement a read-only Claude Code adapter proof using only the supported Agent
View JSON surface. The adapter probes the installed CLI, executes one bounded
`claude agents --json --all` snapshot, discards sensitive and human-facing
fields, and returns the provider-neutral observation shape.

This task proves the adapter boundary only. It does not connect Claude to the
Codex-specific production store, refresh route, or dashboard.

## Observable outcome

`npm test` executes Claude available, degraded, unavailable, active, terminal,
blocked, malformed, timeout, cap, ordering, and forbidden-data cases. Available,
degraded, and unavailable results visibly consume the shared provider
observation conformance helper.

A sanitized real smoke validates one nonempty Agent View snapshot before the
task is marked complete. If no nonempty supported snapshot can be produced, the
implementation may remain a reviewed local commit but the task stays blocked.

## Supported surface

The adapter may invoke only:

- `claude --version`;
- `claude agents --json --all`.

Use `execFile`, a bounded timeout, a bounded output buffer, and no shell. The
adapter must never call `attach`, `logs`, `resume`, `stop`, `rm`, Remote Control,
headless prompt execution, or a human TUI command.

Do not read Claude settings, transcripts, history, daemon logs, roster, job
state, process tables, sockets, credentials, or environment values.

## Owned files

The builder may change only:

- `lib/providers/claude.mjs`;
- `tests/claude-adapter.test.mjs`;
- `docs/state/v0-claude-observation.md`.

Any additional file requires coordinator approval. The builder must not edit a
shared domain file, conformance helper, Codex or Gemini adapter, runtime, store,
route, UI, package metadata, ADR, plan, or another feature state.

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
- `tests/support/provider-observation-conformance.mjs`;
- [Claude Code Agent View](https://code.claude.com/docs/en/agent-view).

## Probe and error contract

Probe `claude --version` and accept only the documented semantic version form.
Return fixed safe errors for:

- executable unavailable;
- probe timeout or failure;
- malformed version;
- Agent View timeout, non-zero exit, malformed JSON, unsupported entry, or
  unsupported version/surface.

Raw stdout, stderr, paths, command lines, and native errors must never enter the
returned observation or test diagnostics.

## Snapshot normalization

Accept only a JSON array with at most a bounded input size. Select and validate:

- `id` for a background session, namespaced as `job:<id>`;
- otherwise an explicit `sessionId`, namespaced as `session:<sessionId>`;
- `startedAt` as the provider creation timestamp, accepting canonical ISO or
  the validated 13-digit Unix-millisecond form emitted by Agent View and
  normalizing either to canonical ISO;
- documented background `state` or supported live process status.

Do not derive identity from name, cwd, pid, time, array position, or summary.
An entry without a stable supported identifier or valid `startedAt` degrades
the whole snapshot rather than being silently mislabeled.

Lifecycle mapping is:

- `working` or explicit live `running` -> `running`;
- `done` -> `completed`;
- `failed` -> `failed`;
- `stopped` -> `interrupted`;
- `blocked`, live `waiting`, or an explicitly non-running idle condition ->
  `unknown`;
- undocumented state -> degraded observation.

Do not infer `terminalAt`; Agent View JSON supplies no terminal timestamp.
Discard cwd, kind, name, pid, waiting details, summaries, status text, and every
unknown field before returning.

Return no more than 20 sessions. Prefer non-terminal sessions, then order by
validated `startedAt` descending with a deterministic id tie-break.

## Runnable checks

Tests use fake executables/process runners and cover:

- unavailable, timeout, non-zero, malformed version, and malformed JSON;
- empty and nonempty snapshots;
- every documented background state and supported live status;
- missing, duplicate, oversized, or invalid identifiers;
- invalid timestamps and unsupported entry shapes;
- deterministic ordering and the 20-session cap;
- child cleanup/buffer bounds relevant to the chosen Node primitive;
- prompt, summary, cwd, transcript, token, environment, and native payload
  canaries absent from normalized output;
- shared conformance for successful, degraded, and unavailable results.

## Acceptance

- Task card 0004 is completed and independently reviewed first.
- `npm test` succeeds without a new dependency.
- `npm run build` succeeds.
- `git diff --check` succeeds.
- only the three owned files change.
- one sanitized nonempty real-provider smoke validates documented ids, state,
  and `startedAt` without printing or persisting forbidden fields.
- the adapter does not mutate provider configuration or sessions; the
  owner-authorized one-shot smoke setup remains outside adapter code.
- worktree is clean after the builder commit.

## Completion evidence

- Claude adapter checks pass 32/32; the exact repository suite passes 68/68.
- `npm run build` and `git diff --check` pass.
- A sanitized real Claude Code 2.1.170 snapshot returned one session with an
  explicit state and a valid 13-digit Unix-millisecond `startedAt`; the adapter
  returned `available` and canonicalized the timestamp without printing an id
  or native field.
- The owner explicitly authorized one harmless background session solely to
  make the required nonempty smoke possible. The adapter itself still invokes
  only the two read-only supported commands in this task.
- Independent re-review of correction commit `8173c72` passed with no P0-P2
  findings.

## Stop conditions

Stop and return to the coordinator if:

- the installed version lacks the JSON/`--all` surface or documented ids and
  states;
- a nonempty real snapshot contradicts the official schema;
- a required field is available only from TUI output, transcript, private state,
  process inspection, or a mutating command;
- a stable identifier or valid `startedAt` is absent;
- a lifecycle difference requires widening the shared contract.

## Forbidden scope

- hook installation or hook parsing;
- Claude attach, reply, dispatch, control, or Remote Control;
- generalized production normalizer, persistence, runtime, route, or UI work;
- Gemini, Codex, Cloud, telemetry, auth, packaging, or new dependencies;
- a provider base class, registry, plugin system, or polling daemon.

## Handoff

The builder updates `docs/state/v0-claude-observation.md`, creates one focused
local commit, and reports its hash, changed files, exact checks, sanitized smoke
result, and remaining risks. The builder must not push.

The reviewer starts only after that commit exists and checks supported-surface
use, lifecycle honesty, field stripping, process bounds, conformance reuse,
real-smoke evidence, and exact file scope.
