# Task card 0003: Provider observation conformance freeze

Status: Approved

Coordinator: Patchfleet coordinator

Builder: one integration-contract owner after approval

Reviewer: independent reviewer after the builder commit

Updated: 2026-07-15

Approved by owner: 2026-07-15

## Objective

Freeze the smallest provider-neutral observation contract already proven by
the completed Codex slice as one reusable Node.js assertion helper. Codex tests
must execute that helper before Claude Code or Gemini CLI adapter work starts.

This task does not generalize production code. A second real adapter must prove
which production seams need to change.

## Observable outcome

`npm test` runs the same provider-neutral output assertions against successful,
degraded, and unavailable Codex observations. A later provider test can import
the helper, supply its fixed identity and safe error catalog, and exercise the
same assertions without editing the helper.

## Evidence boundary

The shared contract contains only facts already represented by
`lib/domain/observation.mjs` and emitted by `lib/providers/codex.mjs`:

- schema version `1`;
- one validated provider identity and display name supplied by the test;
- provider state `available`, `degraded`, or `unavailable`;
- nullable semantic version;
- boolean `recentObservation` and `explicitLiveStatus` capabilities;
- an optional error selected from a test-supplied safe catalog;
- one observation timestamp;
- at most 20 sessions with unique opaque ids;
- session state `running`, `completed`, `failed`, `interrupted`, or `unknown`;
- created, last-observed, and optional terminal timestamps.

Provider discovery, process invocation, native lifecycle mapping, and the
contents of each safe error catalog remain provider-specific.

## Owned files

The builder may change only:

- `tests/support/provider-observation-conformance.mjs`;
- `tests/provider-observation-conformance.test.mjs`;
- `tests/codex-adapter.test.mjs`;
- `docs/state/v0-provider-observation-contract.md`.

Any additional file requires coordinator approval before editing. In
particular, the builder must not edit `lib/`, `app/`, package metadata, an ADR,
the roadmap, or another feature state.

## Read-only inputs

- `AGENTS.md`;
- `docs/product.md`;
- `docs/architecture.md`;
- `docs/agent-operating-model.md`;
- `docs/plans/v0-local-first-control-loop.md`;
- [Task card 0002](0002-codex-read-only-observation.md);
- [ADR 0002](../decisions/0002-provider-adapters.md);
- [ADR 0009](../decisions/0009-codex-observation-uses-supported-app-server-metadata.md);
- `.agents/skills/provider-adapters/SKILL.md`;
- `.agents/skills/team-task-contract/SKILL.md`;
- `lib/domain/observation.mjs`;
- `lib/providers/codex.mjs`.

## Assertion helper contract

Export one assertion function that accepts:

1. an observation value;
2. the expected provider id and display name;
3. a fixed map of allowed error codes to curated safe messages.

Use only `node:assert`. Do not add a schema library, adapter base class,
registry, factory, fixture framework, or snapshot dependency.

The helper must reject:

- missing, extra, or incorrectly typed fields at every shared level;
- a mismatched provider identity or display name;
- an unknown provider state, capability, or session state;
- an invalid or non-null non-semantic version;
- an error code or message outside the supplied safe catalog;
- an available provider with an error, or a degraded/unavailable provider
  without one;
- an unavailable provider with sessions;
- more than 20 sessions, duplicate or non-opaque ids, or invalid timestamps;
- `terminalAt` on a non-terminal session.

The helper validates normalized output only. It must not know how a provider is
installed, invoked, parsed, timed out, or cleaned up.

## Runnable checks

### Helper self-check

The dedicated test file must prove one minimal valid observation passes and
focused invalid cases fail for:

- an extra field;
- unsafe error content;
- duplicate session ids;
- invalid lifecycle state;
- invalid timestamp;
- a terminal timestamp on a non-terminal session.

### Codex conformance

The existing Codex adapter test must call the shared helper for at least:

- one successful lifecycle observation;
- one degraded observation;
- the executable-unavailable observation shape.

Existing Codex protocol, cleanup, lifecycle precedence, and forbidden-canary
checks remain intact and provider-specific.

## Acceptance

- `npm test` succeeds without changing dependencies or the lockfile.
- `npm run build` succeeds.
- `git diff --check` succeeds.
- only the four owned files change.
- no production behavior, event schema, projection schema, or UI changes.
- the Codex tests visibly consume the shared helper rather than duplicate its
  structural assertions.
- no prompt, transcript, source, diff, tool output, token, credential,
  environment value, or absolute path becomes an allowed contract field.
- worktree is clean after the builder commit.

## Stop conditions

Stop and return to the coordinator if:

- satisfying the helper requires changing production code or persisted data;
- a proposed shared field is not already emitted and validated by Codex;
- conformance requires provider-specific process or parsing knowledge;
- an existing Codex behavior contradicts Task card 0002 or ADR 0009.

Do not widen the task to solve a future Claude Code or Gemini CLI difference.

## Forbidden scope

- Claude Code or Gemini CLI discovery, fixtures, or adapters;
- production adapter, domain, persistence, route, or UI changes;
- a generic provider SDK, registry, class hierarchy, or plugin system;
- local controls, work intake, Cloud, telemetry, auth, or packaging;
- new runtime or test dependencies.

## Handoff

The builder must update `docs/state/v0-provider-observation-contract.md`, create
one focused local commit, and report its hash, changed files, exact checks, and
remaining risks. The builder must not push.

The reviewer starts only after that commit exists. The reviewer independently
checks contract minimality, strict rejection, Codex reuse, security boundaries,
and exact file scope without rewriting the builder commit.
