# V0 Gemini lifecycle ingress

Status: Done

Last updated: 2026-07-16

## Summary

Task card 0008 connects the proven Gemini decoder through Gemini
CLI's native linked-extension mechanism and a sanitized local inbox. Automated
work does not mutate real extension state or user settings; the owner linked
and uninstalled the extension during the explicit smoke test. The final native
state is uninstalled.

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
- Preserved current Gemini hook sessions while the extension is active or its
  status probe fails transiently; verified missing/inactive setup and true CLI
  unavailability clear them without changing Codex, Claude, or immutable event
  history.
- Kept retained session IDs in the provider projection without rewriting old
  `session.observed` facts on every active refresh.
- Proved `AfterAgent` never creates `session.terminal` or `terminalAt`.
- Documented native link, restart, status, and uninstall steps without changing
  any real Gemini extension or user setting.
- `npm test` passed: 83 tests, 0 failures.
- `npm run build` passed.
- `git diff --check` passed.
- Independent re-review passed with no unresolved P0-P3 finding.
- Owner smoke linked the extension successfully and proved Gemini CLI 0.43.0
  emits its successful structured extension list on stderr with stdout empty.
- Updated the status probe to accept pure bounded JSON from either stdout or
  stderr while rejecting mixed-channel output; native fields remain discarded.
- Post-fix checks passed: focused Gemini adapter 19 tests, full suite 84 tests,
  production build, and `git diff --check`.
- Independent smoke-fix review passed with no P0-P3 finding.
- Production `observeGemini()` reported the linked extension `available` with
  both observation capabilities enabled.
- Native uninstall succeeded; production observation returned to the expected
  `GEMINI_HOOK_SETUP_REQUIRED` state.

## In progress

- None.

## Next up

1. Link the extension again only when the owner wants ongoing Gemini lifecycle
   observation.

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
- Builder and Reviewer automation ran no real extension lifecycle command and
  read no Gemini settings file; the later owner smoke used only native link,
  status, and uninstall commands.
- Review follow-up preserved sessions across transient probe failures while
  keeping setup-required and unavailable clearing honest, and stopped active
  refreshes from appending duplicate session facts.
- Independent re-review passed after commits `ee69add` and `6e66bdd`; no P0-P3
  finding remains.
- The first owner smoke linked the real extension, then exposed that Gemini CLI
  0.43.0 writes pure JSON extension-list output to stderr despite exit code 0.
  The compatibility fix passed independent review, production status reported
  `available`, and native uninstall restored the expected setup-required state.
