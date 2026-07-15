# V0 provider lifecycle contract

Status: In review

Last updated: 2026-07-16

## Summary

Claude Code and Gemini CLI discovery proved one shared timestamp gap and one
Gemini-specific ingress need. Task card 0004 implements a nullable provider
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
- Recorded [ADR 0010](../decisions/0010-supported-provider-observation-surfaces.md).
- Drafted [Task card 0004](../plans/0004-provider-lifecycle-contract.md).
- Owner approved ADR 0010 and Task cards 0004-0006.
- Added a strict five-field lifecycle-signal validator for the three known
  providers and existing normalized lifecycle states.
- Extended provider observation conformance so required `createdAt` accepts a
  canonical ISO timestamp or `null` without changing production normalization
  or persistence.
- Added focused rejection coverage for malformed, oversized, missing, extra,
  incorrectly typed, and forbidden lifecycle-signal values.
- Passed 27/27 full tests and the production build.

## In progress

- Independent review of the Task card 0004 Builder commit.

## Next up

1. Complete independent review of the Task card 0004 Builder commit.
2. Start Claude and Gemini adapter proofs in parallel only after review passes.

## Blockers

- None.

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
- Owner approved ADR 0010 and Task cards 0004-0006; Task card 0004 started.
- Completed the bounded five-file Builder implementation without changing the
  production observation normalizer, store, runtime, or UI.
- One initial full-suite run hit an existing timing-sensitive Codex fixture;
  the clean rerun passed all 27 tests.
