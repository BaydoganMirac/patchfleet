# V0 Claude Code observation

Status: Done

Last updated: 2026-07-16

## Summary

Claude Code 2.1.170 exposes a supported, read-only Agent View JSON snapshot via
`claude agents --json --all`. Task card 0005 is complete: its adapter-only proof
normalizes the real 13-digit Unix-millisecond `startedAt` form to canonical ISO,
and a sanitized nonempty real smoke plus independent review passed.

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
- Passed all 32 Claude adapter checks, all 68 repository tests, and the
  production build.
- Ran the sanitized real smoke against Claude Code 2.1.170 without printing
  native output; the supported snapshot was valid but contained zero sessions.
- Added and independently reviewed a focused guard for empty native background
  and live-session identifiers.
- With explicit owner authorization, created one harmless background session
  outside the adapter solely to produce the required nonempty smoke.
- Confirmed the real Agent View entry supplies a stable id, documented
  `blocked` state, and a 13-digit Unix-millisecond `startedAt`.
- Added a fail-closed Unix-millisecond normalizer while preserving canonical
  ISO support and rejecting numeric strings, seconds, fractions, short or long
  values, and non-finite numbers (`8173c72`).
- Sanitized real smoke returned an available provider, one `unknown` session,
  and a canonical creation timestamp without printing native identifiers or
  fields.
- Independent re-review passed with no remaining P0-P2 findings.

## In progress

- None. Code and review are complete.

## Next up

1. Draft the owner-approved production integration task that connects the
   proven Claude and Gemini boundaries to the existing single-writer runtime.

## Blockers

- None.

## Open questions

- None for the completed adapter proof.

## Decisions applied

- Use only `--version` and `agents --json --all`.
- Accept only canonical ISO or validated 13-digit Unix milliseconds for
  `startedAt`, then expose canonical ISO at the normalized boundary.
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
- Owner authorized a harmless one-shot background session outside the adapter.
  The nonempty real smoke exposed Unix-millisecond `startedAt`; correction
  `8173c72`, 32/32 targeted tests, 68/68 full tests, build, sanitized smoke, and
  independent re-review all passed. Task card 0005 completed.
