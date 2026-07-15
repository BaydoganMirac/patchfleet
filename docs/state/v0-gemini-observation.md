# V0 Gemini CLI observation

Status: Planned

Last updated: 2026-07-16

## Summary

Gemini CLI 0.43.0 has no safe machine-readable cross-client session inventory.
Task card 0006 proposes a version probe and pure command-hook decoder proof,
with configuration, ingestion, persistence, and UI integration deferred to
separate owner-approved work.

## Done

- Verified `gemini --version` reports 0.43.0.
- Confirmed `--list-sessions` is human-facing, includes a prompt preview, and
  may generate/persist missing summary metadata.
- Confirmed JSON output modes, headless mode, and ACP start or own work rather
  than observing other clients.
- Confirmed documented command hooks provide session id, lifecycle event, and
  ISO timestamp alongside forbidden sensitive fields.
- Confirmed Gemini does not guarantee failed/interrupted terminal hook events.
- Drafted [Task card 0006](../plans/0006-gemini-cli-hook-observation.md).

## In progress

- Owner review of the proposed task sequence.

## Next up

1. Complete and review Task card 0004.
2. Assign one Gemini adapter Builder to the three owned files.
3. Review the pure decoder proof independently.
4. Only then draft explicit hook setup and secure single-writer ingestion work.

## Blockers

- Implementation depends on approved, completed Task card 0004.
- Dashboard availability depends on later explicit setup and integration tasks.

## Open questions

- The secure local hook transport and reversible settings-ownership policy are
  intentionally deferred until the decoder proof exists.

## Decisions applied

- Never execute or parse `gemini --list-sessions`.
- Never infer failed/interrupted or original creation time.
- Keep hook setup explicit, reversible, and separate from adapter discovery.
- Discard raw hook payloads and preserve the existing single-writer boundary.

## Session log

### 2026-07-16

- Completed official/source discovery and proposed the safe hook decoder proof.
