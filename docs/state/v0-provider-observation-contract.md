# V0 provider observation contract

Status: In progress

Last updated: 2026-07-15

## Summary

Task card 0003 defines one approved, reusable, test-only conformance helper for the
normalized observation shape proven by Codex. It deliberately avoids a
production adapter abstraction until a second real provider proves the seam.

## Done

- Traced the Codex adapter through normalization, persistence, and its tests.
- Confirmed the production domain and storage still contain Codex-specific
  identity and error assumptions.
- Chose an executable test contract instead of prematurely refactoring those
  production assumptions.
- Drafted [Task card 0003](../plans/0003-provider-observation-conformance.md).
- Owner approved Task card 0003.

## In progress

- Builder implementation inside the four approved files.

## Next up

1. Assign one Builder to the four owned files.
2. Start an independent Reviewer after the Builder commit.
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
