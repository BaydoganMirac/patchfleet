# V0 provider production integration

Status: In progress

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

## In progress

- Integration-owner implementation of multi-provider validation, persistence,
  refresh, projection, dashboard, and compatibility checks.

## Next up

1. Produce one focused Builder commit and exact test/build evidence.
2. Run independent review and close any P0-P2 findings.
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
