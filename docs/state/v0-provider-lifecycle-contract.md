# V0 provider lifecycle contract

Status: Planned

Last updated: 2026-07-16

## Summary

Claude Code and Gemini CLI discovery proved one shared timestamp gap and one
Gemini-specific ingress need. Task card 0004 proposes a nullable provider
creation timestamp in the test contract plus a five-field ephemeral lifecycle
signal. It deliberately leaves the Codex production runtime and persistence
unchanged.

## Done

- Verified installed Claude Code 2.1.170 and Gemini CLI 0.43.0.
- Confirmed Claude exposes a supported Agent View JSON snapshot.
- Confirmed Gemini session listing is human-facing, sensitive, and may mutate
  summary metadata.
- Confirmed Gemini hooks expose structured lifecycle events but not trustworthy
  original creation time for resumed sessions.
- Drafted [Proposed ADR 0010](../decisions/0010-supported-provider-observation-surfaces.md).
- Drafted [Task card 0004](../plans/0004-provider-lifecycle-contract.md).

## In progress

- Owner review of ADR 0010 and Task card 0004.

## Next up

1. Obtain explicit owner approval.
2. Assign one integration-contract Builder to Task card 0004.
3. Start an independent Reviewer after the Builder commit.
4. Start Claude and Gemini adapter proofs in parallel only after review passes.

## Blockers

- Implementation is approval-gated.

## Open questions

- None for the bounded contract bridge. Production migration and ingestion
  transport remain deliberately deferred until both adapter proofs exist.

## Decisions applied

- Do not fabricate provider creation time from receipt time.
- Do not add `waiting` from a single provider; map it to `unknown` for now.
- Keep lifecycle signals ephemeral and persistence single-writer-owned.
- Do not generalize the Codex production runtime before the second real adapter.

## Session log

### 2026-07-16

- Completed supported-surface discovery and proposed the integration-owner
  contract bridge for owner approval.
