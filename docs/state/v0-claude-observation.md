# V0 Claude Code observation

Status: Planned

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

## In progress

- None. The task is approved and waiting for Task card 0004.

## Next up

1. Complete and review Task card 0004.
2. Assign one Claude adapter Builder to the three owned files.
3. Produce a sanitized nonempty Agent View smoke.
4. Start an independent Reviewer after the Builder commit.

## Blockers

- Implementation depends on approved, completed Task card 0004.
- A nonempty real snapshot is required before Task card 0005 can complete; the
  discovery snapshot was an empty array.

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
