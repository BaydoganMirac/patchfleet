# V0 provider observation contract

Status: Builder complete; independent review pending

Last updated: 2026-07-15

## Summary

Task card 0003 defines one approved, reusable, test-only conformance helper for the
normalized observation shape proven by Codex. It deliberately avoids a
production adapter abstraction until a second real provider proves the seam.
The Builder implementation is complete and awaiting independent review.

## Done

- Traced the Codex adapter through normalization, persistence, and its tests.
- Confirmed the production domain and storage still contain Codex-specific
  identity and error assumptions.
- Chose an executable test contract instead of prematurely refactoring those
  production assumptions.
- Drafted [Task card 0003](../plans/0003-provider-observation-conformance.md).
- Owner approved Task card 0003.
- Added one strict `node:assert` helper for the provider-neutral normalized
  observation shape.
- Added focused pass/fail self-checks for extra fields, unsafe errors, duplicate
  ids, invalid lifecycle and timestamps, and invalid terminal metadata.
- Reused the helper from Codex available, degraded, and executable-unavailable
  observations without changing production code.
- Passed all 24 tests, the production build, and `git diff --check`.

## In progress

- Independent review of the stable Builder commit.

## Next up

1. Start an independent Reviewer after the Builder commit.
2. Address only review findings within the approved scope.
3. Draft disjoint Claude Code, Gemini CLI, and integration-owner task cards
   only after conformance passes.

## Blockers

- None.

## Open questions

- Whether Claude Code or Gemini CLI lacks a required timestamp remains provider
  discovery work; adapters must report a real conflict instead of inventing it.

## Decisions applied

- Freeze shared behavior as executable assertions, not a new production SDK.
- Keep provider invocation and error catalogs provider-specific.
- Preserve current Codex runtime and persisted schemas unchanged.

## Session log

### 2026-07-15

- Completed the post-Codex contract trace and proposed the minimum conformance
  slice for owner approval.
- Owner approved Task card 0003; Builder implementation is authorized.
- Builder added the test-only conformance helper and consumed it from Codex
  available, degraded, and unavailable paths; all tests and the build passed.
