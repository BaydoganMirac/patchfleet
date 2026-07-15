# Task card 0004: Provider lifecycle contract bridge

Status: Approved

Coordinator: Patchfleet coordinator

Builder: one integration-contract owner after approval

Reviewer: independent reviewer after the builder commit

Updated: 2026-07-16

Approved by owner: 2026-07-16

## Objective

Resolve the two shared contract differences proven by Claude Code and Gemini
CLI discovery without generalizing the Codex production runtime:

1. allow a normalized observation session to have `createdAt: null` when the
   provider supplies no trustworthy original creation time;
2. define one strict ephemeral lifecycle signal that a future opt-in Gemini
   hook decoder can return to the existing single-writer runtime.

## Observable outcome

`npm test` proves the existing observation conformance accepts a nullable
provider creation timestamp but still rejects missing, malformed, or fabricated
timestamp values. A new pure validator accepts only the five-field lifecycle
signal and rejects forbidden or provider-native additions.

The Codex adapter and all existing Codex tests remain unchanged and passing.
No event, projection, route, UI, hook installation, or provider process changes.

## Evidence boundary

The bridge contains only facts supported by the completed Codex slice and the
official Claude/Gemini discovery:

- provider id;
- opaque provider session id;
- normalized lifecycle status `running`, `completed`, `failed`,
  `interrupted`, or `unknown`;
- Patchfleet/provider observation time;
- nullable provider-declared creation time in observation snapshots.

Do not add `waiting`, hook event names, setup state, transport metadata, source,
reason, process state, or arbitrary provider extensions to the shared contract.

## Owned files

The builder may change only:

- `lib/domain/provider-lifecycle-signal.mjs`;
- `tests/provider-lifecycle-signal.test.mjs`;
- `tests/support/provider-observation-conformance.mjs`;
- `tests/provider-observation-conformance.test.mjs`;
- `docs/state/v0-provider-lifecycle-contract.md`.

Any additional file requires coordinator approval. In particular, the builder
must not edit the Codex adapter, production observation normalizer, event store,
runtime, UI, package metadata, an ADR, or another feature state.

## Read-only inputs

- `AGENTS.md`;
- `docs/product.md`;
- `docs/architecture.md`;
- `docs/agent-operating-model.md`;
- [Task card 0003](0003-provider-observation-conformance.md);
- [ADR 0002](../decisions/0002-provider-adapters.md);
- [ADR 0009](../decisions/0009-codex-observation-uses-supported-app-server-metadata.md);
- [ADR 0010](../decisions/0010-supported-provider-observation-surfaces.md);
- `.agents/skills/provider-adapters/SKILL.md`;
- `.agents/skills/team-task-contract/SKILL.md`;
- `lib/domain/observation.mjs`;
- `lib/runtime/observation-store.mjs`.

## Lifecycle signal contract

Export one validator with this exact normalized output:

- `schemaVersion: 1`;
- `providerId`: `claude`, `codex`, or `gemini`;
- `providerSessionId`: an opaque id using the existing bounded id rule;
- `status`: one existing normalized lifecycle value;
- `observedAt`: a canonical ISO timestamp.

The validator must return a new allowlisted object rather than the input object.
It must reject missing, extra, incorrectly typed, oversized, or malformed
fields. Use Node.js only; do not add a schema library.

The signal is not a durable event and has no reducer, transport, file, queue,
network endpoint, or side effect in this task.

## Observation conformance change

The shared test assertion must accept either:

- a canonical ISO provider creation timestamp; or
- `null` when the provider does not supply one.

The field remains required. `undefined`, absence, receipt time substituted by a
test helper, non-canonical timestamps, and extra time fields remain invalid.
Codex conformance must continue to pass with its real non-null timestamp.

## Runnable checks

The lifecycle-signal test covers:

- one valid signal for each known provider;
- every normalized lifecycle state;
- unknown provider, state, and schema version;
- invalid and oversized opaque ids;
- invalid timestamps;
- missing and extra fields;
- forbidden canaries for prompt, response, transcript, cwd, environment, token,
  source, and native payload.

The observation-conformance test proves:

- a valid non-null `createdAt` still passes;
- a valid `createdAt: null` passes;
- missing, `undefined`, malformed, and non-canonical creation values fail;
- existing Codex available, degraded, and unavailable conformance remains
  unchanged.

## Acceptance

- `npm test` succeeds without changing dependencies or the lockfile.
- `npm run build` succeeds.
- `git diff --check` succeeds.
- only the five owned files change.
- the signal validator returns no forbidden canary value.
- current production behavior and persisted schemas do not change.
- worktree is clean after the builder commit.

## Stop conditions

Stop and return to the coordinator if:

- a useful signal requires a path, prompt, response, transcript, hook payload,
  process identifier, or provider-native event name;
- nullable `createdAt` requires changing persisted Codex events in this task;
- implementing the validator requires a transport, daemon, HTTP endpoint, or
  second writer;
- a lifecycle state outside the existing shared enum appears necessary.

## Forbidden scope

- Claude Code or Gemini process invocation and parsing;
- hook configuration, installation, removal, or settings mutation;
- event migration, persistence, runtime, route, or dashboard integration;
- a provider SDK, base class, registry, plugin system, or dependency;
- local control, work intake, Cloud, telemetry, auth, or packaging.

## Handoff

The builder updates `docs/state/v0-provider-lifecycle-contract.md`, creates one
focused local commit, and reports its hash, changed files, exact checks, and
remaining risks. The builder must not push.

The reviewer starts only after that commit exists and checks strict field
selection, nullable-time honesty, Codex compatibility, exact scope, and the
absence of runtime or persistence changes.
