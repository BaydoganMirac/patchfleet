# Task card 0007: Multi-provider production observation

Status: Completed

Coordinator: Patchfleet coordinator

Builder: one integration owner

Reviewer: one independent reviewer after the builder commit

Updated: 2026-07-16

Approved by owner: 2026-07-16

Completed: 2026-07-16

Independent review: Passed with no unresolved P0-P2 findings

Depends on: Task cards 0003-0006 completed and independently reviewed

## Objective

Connect the proven Codex, Claude Code, and Gemini CLI observation results to
the existing production runtime, append-only event writer, projection, refresh
route, and local dashboard.

This task integrates pull/probe observations only. Gemini hook installation
and lifecycle-signal ingestion remain a separate approval-gated task.

## Observable outcome

One same-origin manual refresh observes all three providers. The local
dashboard renders one truthful card and session list per provider from a single
rebuildable projection. A missing or setup-required provider does not erase
the other providers' durable state.

## Approved design

- Keep every adapter's schema version 1 normalized observation unchanged.
- Generalize production validation to the three fixed provider identities and
  their fixed safe error catalogs.
- Keep event schema version 1; validate its existing `providerId` for all three
  providers and scope session replay by provider.
- Write projection schema version 2 as `{ schemaVersion, observations }`, where
  each observation is the existing normalized provider shape.
- Read existing Codex projection schema version 1 by wrapping it in version 2
  in memory; event replay writes version 2.
- Refresh the three fixed adapters without adding a provider registry, plugin
  SDK, polling daemon, or dependency.

## Owned files

The Builder may change only:

- `lib/domain/observation.mjs`;
- `lib/providers/codex.mjs`;
- `lib/runtime/observation-store.mjs`;
- `lib/runtime/observe.mjs`;
- `app/api/observe/route.ts`;
- `app/page.tsx`;
- `tests/codex-adapter.test.mjs`;
- `tests/observation-store.test.mjs`;
- `tests/local-shell.test.js`;
- one focused runtime test under `tests/` only if existing tests cannot cover
  the refresh seam cleanly;
- `docs/state/v0-provider-integration.md`.

Any additional production file requires coordinator approval.

## Read-only inputs

- `AGENTS.md`;
- `docs/product.md`;
- `docs/architecture.md`;
- [ADR 0002](../decisions/0002-provider-adapters.md);
- [ADR 0004](../decisions/0004-append-only-local-events.md);
- [ADR 0010](../decisions/0010-supported-provider-observation-surfaces.md);
- [ADR 0011](../decisions/0011-multi-provider-observation-projection.md);
- [Task card 0007](0007-multi-provider-production-observation.md);
- `.agents/skills/provider-adapters/SKILL.md`;
- `.agents/skills/local-runtime-state/SKILL.md`;
- `lib/providers/claude.mjs`;
- `lib/providers/gemini.mjs`;
- `lib/domain/provider-lifecycle-signal.mjs`;
- `tests/support/provider-observation-conformance.mjs`.

Claude and Gemini proof files are immutable inputs in this task.

## Required behavior

### Domain and safe errors

- Accept only `codex`, `claude`, and `gemini` with their exact display names.
- Reconstruct error messages from a fixed provider-specific allowlist.
- Continue stripping unknown and forbidden observation fields.
- Reject duplicate provider entries and invalid projection shapes.

### Events and projection

- Preserve existing event meanings and schema version.
- Allow equal provider-native session ids across different providers without
  collision or lifecycle leakage.
- Preserve terminal deduplication within one provider only.
- Order projected observations deterministically as Codex, Claude, Gemini.
- Keep the log single-writer-owned and the projection atomic/rebuildable.
- Read existing Codex version 1 projection files and replay existing Codex
  version 1 events without data loss.

### Runtime and UI

- Manual refresh invokes the three fixed adapters and persists only normalized
  outputs.
- The route retains its existing same-origin, bodyless request boundary.
- The page reads only the projection and shows provider-specific availability,
  version, capabilities, safe error, snapshot time, and sessions.
- Gemini shows its explicit hook-setup-required state; no fake lifecycle or
  control is rendered.

## Runnable checks

Tests cover:

- three-provider normalization and safe error catalogs;
- multi-provider persistence, replay, restart recovery, and deterministic
  ordering;
- equal native session ids isolated by provider;
- legacy Codex version 1 projection compatibility;
- terminal deduplication remaining provider-scoped;
- one manual refresh calling all three adapters;
- dashboard cards for Codex, Claude Code, and Gemini CLI;
- unavailable/degraded provider isolation;
- forbidden-data canaries absent from events and projection;
- existing browser request, crash-tail, corruption, and adapter checks.

## Acceptance

- `npm test` succeeds.
- `npm run build` succeeds.
- `git diff --check` succeeds.
- no dependency or lockfile changes.
- no raw prompt, response, transcript, source, diff, tool output, token,
  environment value, credential, or absolute path enters durable state.
- existing Codex data remains readable.
- only owned files change.
- independent review reports no unresolved P0-P2 finding.
- worktree is clean after the local commits.

## Stop conditions

Stop and return to the coordinator if:

- existing Codex events cannot be replayed without changing their meaning;
- integration requires a new event meaning or destructive migration;
- Gemini active lifecycle requires hook configuration or settings access;
- an adapter must expose a forbidden native field;
- a provider difference requires widening the shared lifecycle contract;
- the UI would need to read adapters or raw provider output directly.

## Forbidden scope

- Gemini hook installation, settings ownership, lifecycle ingestion, or IPC;
- starting, cancelling, resuming, or answering provider work;
- background polling or a daemon;
- Cloud sync, auth, billing, telemetry, or protocol changes;
- provider registry, base class, plugin SDK, database, or new dependency;
- desktop packaging or visual redesign.

## Handoff

The Builder updates `docs/state/v0-provider-integration.md`, creates one
focused local commit, and reports its hash, changed files, exact checks, and
remaining risks. The Builder does not push.

The Reviewer starts only after that commit exists and checks compatibility,
provider/session isolation, error allowlisting, single-writer durability,
field stripping, route security, UI honesty, test coverage, and exact scope.
