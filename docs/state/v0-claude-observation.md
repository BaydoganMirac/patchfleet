# V0 Claude Code observation

Status: Blocked

Last updated: 2026-07-16

## Summary

Claude Code 2.1.170 exposes a supported, read-only Agent View JSON snapshot via
`claude agents --json --all`. Task card 0005 proposes an adapter-only proof
after Task card 0004 resolves the shared timestamp and lifecycle contract.

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
- Passed all 24 Claude adapter checks and the production build.
- Ran the sanitized real smoke against Claude Code 2.1.170 without printing
  native output; the supported snapshot was valid but contained zero sessions.

## In progress

- Independent review of the Builder commit.

## Next up

1. Stabilize the shared bare test runner outside this provider-owned task.
2. Produce a sanitized nonempty Agent View smoke when an existing background
   session is available; do not create one for the smoke.
3. Complete independent review of the Builder commit.

## Blockers

- A nonempty real snapshot is required before Task card 0005 can complete; the
  discovery and Builder snapshots were empty arrays.
- Bare `npm test` currently exhausts the Codex suite's existing 500 ms fake-CLI
  deadlines and makes its local Next.js fixture exit under parallel test-file
  load. The Claude target remains 24/24 green; the coordinator owns shared test
  runner stabilization.

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
  and recorded the empty sanitized real smoke plus shared runner blocker.
