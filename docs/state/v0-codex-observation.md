# V0 Codex observation

Status: Proposed

Last updated: 2026-07-15

## Summary

Task card 0002 proposes the first real provider vertical slice: supported Codex
app-server observation, append-only local facts, a rebuildable projection, and
an honest local dashboard. No provider runtime code has started.

## Done

- Current official Codex app-server documentation reviewed.
- Installed CLI generated version-specific JSON schemas containing
  `thread/list`, `thread/read`, thread status, turn status, and timestamps.
- Sanitized read-only probes confirmed recent thread listing and latest-turn
  lifecycle metadata without printing prompt, path, or transcript fields.
- A fresh observer reports persisted threads as `notLoaded`, so cross-client
  live detection is explicitly not claimed.
- [Task card 0002](../plans/0002-codex-read-only-observation.md) drafted.
- [ADR 0009](../decisions/0009-codex-observation-uses-supported-app-server-metadata.md)
  proposed for the honest lifecycle boundary.

## In progress

- Owner review of Task card 0002 and proposed ADR 0009.

## Next up

1. Approve or revise Task card 0002 and ADR 0009.
2. Record the approval before product code starts.
3. Run the Builder and independent Reviewer workflow.

## Blockers

- Explicit owner approval is required before implementation.

## Open questions

- Will Codex expose a supported shared live-session surface for work owned by
  other clients, or will a later managed app-server mode be required?
- Which equivalent structured lifecycle fields can Claude Code and Gemini CLI
  prove after the Codex contract is complete?

## Decisions proposed

- Use only app-server stdio JSONL; never inspect Codex private state files.
- Observe 20 recent interactive sessions instead of adding pagination or a
  7/30-day retention setting.
- Preserve unknown when active or terminal state is not explicit.
- Use same-origin POST for manual refresh and no background polling.

## Session log

### 2026-07-15

- Completed provider-surface discovery and drafted the approval-gated first
  Codex observation slice.
