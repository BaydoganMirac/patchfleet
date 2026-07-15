# V0 Codex observation

Status: Done

Last updated: 2026-07-15

## Summary

Task card 0002 delivered the first real provider vertical slice: supported
Codex app-server observation, append-only local facts, a rebuildable projection,
and an honest local dashboard. Independent review passed after two P2
corrections.

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
  accepted for the honest lifecycle boundary.
- Added a bounded Codex CLI probe and one-shot app-server stdio JSONL observer.
- Added strict normalized data allowlists, safe error codes, append-only events,
  serialized durable writes, deterministic replay, and atomic projection files.
- Added a same-origin bodyless refresh route and a server-rendered dashboard for
  never-observed, unavailable, degraded, empty, populated, stale, and corrupt
  local states.
- Added adapter, recovery, redaction, request-boundary, production, and restart
  checks without changing dependencies or the lockfile.
- A sanitized real Codex smoke detected the installed version, observed 20
  recent sessions, and persisted no forbidden field or absolute path.
- Independent review found and the Builder fixed two fail-closed boundaries:
  `thread/read` now rejects a mismatched returned thread id, and terminal-event
  deduplication now preserves a real terminal state re-entry.
- Independent re-review passed with no remaining P0-P2 findings.

## In progress

- None. Task card 0002 is complete.

## Next up

1. Freeze the smallest shared observation conformance contract proven by Codex.
2. Draft disjoint Claude Code and Gemini CLI adapter task cards plus one
   integration-owner task.
3. Obtain owner approval before provider-parallel implementation starts.

## Blockers

- None.

## Open questions

- Will Codex expose a supported shared live-session surface for work owned by
  other clients, or will a later managed app-server mode be required?
- Which equivalent structured lifecycle fields can Claude Code and Gemini CLI
  prove after the Codex contract is complete?

## Decisions applied

- Use only app-server stdio JSONL; never inspect Codex private state files.
- Observe 20 recent interactive sessions instead of adding pagination or a
  7/30-day retention setting.
- Preserve unknown when active or terminal state is not explicit.
- Use same-origin POST for manual refresh and no background polling.

## Session log

### 2026-07-15

- Completed provider-surface discovery and drafted the approval-gated first
  Codex observation slice.
- Owner approved Task card 0002 and ADR 0009; Builder implementation started.
- Builder completed the supported read-only observation, durable projection,
  local dashboard, request boundary, recovery checks, production smoke, and a
  sanitized real-provider smoke without adding dependencies.
- Independent review reported two P2 findings; the Builder added exact
  request/response thread-id correlation and consecutive-state terminal
  deduplication regressions without widening the event schema.
- Independent re-review passed with no remaining P0-P2 findings.
