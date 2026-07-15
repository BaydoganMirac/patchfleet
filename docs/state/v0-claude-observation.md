# V0 Claude Code observation

Status: Blocked

Last updated: 2026-07-16

## Summary

Claude Code 2.1.170 exposes a supported, read-only Agent View JSON snapshot via
`claude agents --json --all`. Task card 0005 delivered a review-clean
adapter-only proof after Task card 0004 resolved the shared timestamp and
lifecycle contract. Completion awaits one sanitized nonempty real snapshot.

## Done

- Verified `claude --version` reports 2.1.170.
- Verified `claude agents --json --all` exits successfully with a JSON array.
- Confirmed the official surface exposes stable background ids, `startedAt`,
  and documented lifecycle state.
- Confirmed the surface is Agent View/background inventory, not full Claude
  interactive history.
- Drafted [Task card 0005](../plans/0005-claude-code-agent-view-observation.md).
- Implemented the bounded `execFile` probe and Agent View snapshot adapter.
- Added strict identity, timestamp, lifecycle, ordering, cap, field-stripping,
  timeout cleanup, and shared-conformance checks.
- Passed all 26 Claude adapter checks, all 62 repository tests, and the
  production build.
- Ran the sanitized real smoke against Claude Code 2.1.170 without printing
  native output; the supported snapshot was valid but contained zero sessions.
- Added and independently reviewed a focused guard for empty native background
  and live-session identifiers.
- Independent review passed with no remaining P0-P2 findings.

## In progress

- None. Code and review are complete.

## Next up

1. Produce a sanitized nonempty Agent View smoke when an existing background
   session is available; do not create one for the smoke.
2. Mark Task card 0005 complete if the documented id, state, and `startedAt`
   fields validate without exposing native data.

## Blockers

- A nonempty real snapshot is required before Task card 0005 can complete; the
  discovery and Builder snapshots were empty arrays.

## Open questions

- Whether installed real entries match every documented live/background shape
  will be answered by the required sanitized nonempty smoke.

## Decisions applied

- Use only `--version` and `agents --json --all`.
- Map blocked/waiting to `unknown` until a shared waiting semantic is proven.
- Never read Claude transcript, daemon, roster, job, settings, or process state.

## Session log

### 2026-07-16

- Completed official and installed-CLI discovery and proposed the bounded
  Agent View adapter proof.
- Owner approved Task card 0005; Task card 0004 passed review and the Builder
  implementation started.
- Implemented and targeted-tested the adapter, verified the production build,
  and recorded the empty sanitized real smoke.
- Coordinator serialized the Node test files and separated real timeout
  fixtures from non-timeout process deadlines; the exact suite passes 62/62.
- Focused review correction rejected empty native ids before namespacing;
  independent re-review passed with no P0-P2 findings.
