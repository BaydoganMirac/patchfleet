# V0 provider observation contract

Status: Done

Last updated: 2026-07-16

## Summary

Task card 0003 delivered one reusable, test-only conformance helper for the
normalized observation shape proven by Codex. It deliberately avoids a
production adapter abstraction until a second real provider proves the seam.
Independent review passed after one focused SemVer correction.

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
- Replaced the permissive version pattern after review with the official
  ECMAScript-compatible SemVer 2.0.0 expression and covered leading zeroes,
  empty prerelease identifiers, and valid prerelease plus build metadata.
- Independent re-review passed with no remaining P0-P2 findings.

## In progress

- None. Task card 0003 is complete.

## Next up

- None for Task card 0003. Production integration and Gemini lifecycle ingress
  are complete in Task cards 0007 and 0008.

## Blockers

- None.

## Open questions

- None for the completed conformance freeze. Gemini's nullable creation time
  and hook ingress are implemented by the completed follow-on tasks.

## Decisions applied

- Freeze shared behavior as executable assertions, not a new production SDK.
- Keep provider invocation and error catalogs provider-specific.
- Preserve current Codex runtime and persisted schemas unchanged.
- Route proven provider differences through the integration owner before
  provider implementation.

## Session log

### 2026-07-15

- Completed the post-Codex contract trace and proposed the minimum conformance
  slice for owner approval.
- Owner approved Task card 0003; Builder implementation is authorized.
- Builder added the test-only conformance helper and consumed it from Codex
  available, degraded, and unavailable paths; all tests and the build passed.
- Independent review found the version expression accepted invalid leading
  zero and empty prerelease forms and rejected combined prerelease/build forms;
  the follow-up fix now covers all three cases.
- Independent re-review passed with no remaining P0-P2 findings.

### 2026-07-16

- Completed Claude Code and Gemini CLI supported-surface discovery.
- Proposed ADR 0010 and disjoint Task cards 0004-0006; follow-on work now lives
  in provider-specific and lifecycle-contract state files.
- Task card 0004 and Gemini Task card 0006 completed with independent review;
  Claude Task card 0005 had completed code and review before its real smoke.
- Claude Task card 0005 completed after an owner-authorized nonempty smoke
  exposed Unix-millisecond `startedAt`; the focused correction and independent
  re-review passed without widening the shared contract.
