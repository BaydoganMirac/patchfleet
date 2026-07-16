# V0 Gemini lifecycle ingress

Status: In progress

Last updated: 2026-07-16

## Summary

Task card 0008 connects the proven Gemini decoder through Gemini
CLI's native linked-extension mechanism and a sanitized local inbox. No real
extension or user setting has been changed.

## Done

- Traced the decoder -> lifecycle signal -> event writer -> projection path.
- Verified local Gemini CLI 0.43.0 and its bundled official hook and extension
  documentation without reading user settings.
- Confirmed native extension link, JSON list, enable/disable, and uninstall
  surfaces exist.
- Rejected direct settings merge, loopback HTTP ingress, direct event-log
  append, daemon, watcher, and new dependency designs.
- Drafted proposed [ADR 0012](../decisions/0012-gemini-native-extension-lifecycle-inbox.md).
- Drafted approval-gated
  [Task card 0008](../plans/0008-gemini-native-extension-lifecycle-ingress.md).
- Owner approved ADR 0012 and Task card 0008 on 2026-07-16.

## In progress

- Builder implementation of the approved extension, inbox, and manual-refresh
  ingestion design.

## Next up

1. Complete the Builder implementation and local commit.
2. Start the independent Reviewer only after the Builder commit exists.
3. Let the owner perform the first real extension link/uninstall smoke after
   reviewed code exists.

## Blockers

- None.

## Open questions

- None in the approved V0 scope. Packaged extension installation replaces the
  source-linked extension when Patchfleet packaging becomes real work.

## Decisions accepted

- Gemini CLI owns extension registration and removal.
- Patchfleet never merges the user settings file.
- Hooks write only sanitized signals to an atomic inbox.
- Manual refresh is the only inbox drain trigger in V0.
- The existing runtime remains the only canonical event writer.

## Session log

### 2026-07-16

- Generated a temporary Graphify map outside the repository: 371 nodes, 564
  edges, and 20 communities.
- Official and installed Gemini 0.43.0 references confirmed hook stdin/stdout,
  native extension lifecycle, exact lifecycle matchers, and source-link
  behavior.
