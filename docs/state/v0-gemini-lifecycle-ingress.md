# V0 Gemini lifecycle ingress

Status: Builder complete; review pending

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
- Added the native `patchfleet-gemini` linked extension with exactly
  `SessionStart`, `BeforeAgent`, and `AfterAgent` hooks.
- Added a bounded fail-open hook that emits only `{}` and writes only the
  validated five-field signal to private atomic inbox files.
- Added a bounded JSON extension-status probe; blank, empty, missing, and
  inactive results remain honest setup-required states.
- Drained valid signals during manual refresh through the existing serialized
  event writer with runtime revalidation, exact-signal idempotency, durable
  cleanup, nullable creation time, and deterministic 20-session retention.
- Preserved current Gemini hook sessions only while the extension is active;
  missing setup clears current Gemini sessions without changing Codex, Claude,
  or immutable event history.
- Proved `AfterAgent` never creates `session.terminal` or `terminalAt`.
- Documented native link, restart, status, and uninstall steps without changing
  any real Gemini extension or user setting.
- `npm test` passed: 83 tests, 0 failures.
- `npm run build` passed.
- `git diff --check` passed.

## In progress

- Independent review of the stable Builder commit.

## Next up

1. Start the independent Reviewer after the Builder commit exists.
2. Resolve any P0-P2 review finding in a focused follow-up commit.
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
- Builder completed the approved extension, inbox, adapter-status, serialized
  persistence, retention, setup-clearing, documentation, and focused checks.
- No real extension lifecycle command ran and no Gemini settings file was read
  or changed.
