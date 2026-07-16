# V0 provider production integration

Status: In review

Last updated: 2026-07-16

## Summary

Task card 0007 connects the three completed provider proofs to the existing
single-writer runtime and dashboard through a backward-compatible
multi-provider projection. Gemini hook setup and lifecycle ingress remain a
separate later task.

## Done

- Traced the production path from refresh route through runtime, event writer,
  projection, and dashboard.
- Confirmed production code is Codex-specific while the three provider proofs
  already share the normalized observation contract.
- Recorded [ADR 0011](../decisions/0011-multi-provider-observation-projection.md).
- Drafted and owner-approved
  [Task card 0007](../plans/0007-multi-provider-production-observation.md).
- Generalized the normalized observation boundary and safe error catalog to
  the three fixed provider identities without changing adapter output shapes.
- Preserved event schema version 1 while scoping replay, terminal
  deduplication, and equal native session ids by provider.
- Added projection schema version 2 with deterministic Codex, Claude Code,
  Gemini CLI ordering and legacy Codex projection compatibility.
- Connected one manual refresh and the local dashboard to all three provider
  observations without adding hooks, polling, controls, or dependencies.
- Added multi-provider durability, isolation, compatibility, field-stripping,
  browser-boundary, dashboard, and fake-CLI refresh coverage.
- Verified `npm test` (71 tests), `npm run build`, and `git diff --check`.

## In progress

- Independent review of the focused implementation commit.

## Next up

1. Close any independent-review P0-P2 findings.
2. Mark Task 0007 and this state complete after the final verification.
3. Draft Gemini hook setup and secure ingress only after Task 0007 completes.

## Blockers

- None.

## Open questions

- None for Task 0007. Gemini settings ownership and ingress transport are
  deliberately deferred.

## Decisions applied

- [ADR 0002](../decisions/0002-provider-adapters.md)
- [ADR 0004](../decisions/0004-append-only-local-events.md)
- [ADR 0010](../decisions/0010-supported-provider-observation-surfaces.md)
- [ADR 0011](../decisions/0011-multi-provider-observation-projection.md)

## Session log

### 2026-07-16

- Graph trace confirmed the smallest production seam is route -> refresh ->
  event writer -> projection -> dashboard.
- Owner authorized the next task; ADR 0011 and Task card 0007 were prepared.
- Integrated the three fixed adapters through the existing single-writer
  runtime and projection boundary.
- Full verification passed: `npm test` (71/71), `npm run build`, and
  `git diff --check`.
