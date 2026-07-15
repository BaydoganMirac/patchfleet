# V0 provider observation contract

Status: Planned

Last updated: 2026-07-15

## Summary

Task card 0003 proposes one reusable, test-only conformance helper for the
normalized observation shape proven by Codex. It deliberately avoids a
production adapter abstraction until a second real provider proves the seam.

## Done

- Traced the Codex adapter through normalization, persistence, and its tests.
- Confirmed the production domain and storage still contain Codex-specific
  identity and error assumptions.
- Chose an executable test contract instead of prematurely refactoring those
  production assumptions.
- Drafted [Task card 0003](../plans/0003-provider-observation-conformance.md).

## In progress

- Owner review of Task card 0003.

## Next up

1. Obtain explicit owner approval.
2. Assign one Builder to the four owned files.
3. Start an independent Reviewer after the Builder commit.
4. Draft disjoint Claude Code, Gemini CLI, and integration-owner task cards
   only after conformance passes.

## Blockers

- Implementation is approval-gated.

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
