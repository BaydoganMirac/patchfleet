# V0 Gemini CLI observation

Status: Review pending

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
- Added a bounded `gemini --version` probe with fixed unavailable, timeout,
  failure, malformed-version, and setup-required results.
- Added a pure bounded hook decoder that selects only session id, event name,
  and timestamp before returning the shared lifecycle signal.
- Proved `SessionStart`, `BeforeAgent`, and `AfterAgent` map only to `unknown`,
  `running`, and `completed`; `SessionEnd` produces no transition.
- Proved forbidden hook values do not enter returned signals or errors and no
  provider settings, history, prompt, ACP, or headless surface is used.
- Passed 9 targeted tests, 60 serial full-suite tests, the production build,
  and a real version-only smoke against Gemini CLI 0.43.0.

## In progress

- Independent review of the Task card 0006 Builder commit.

## Next up

1. Review the pure decoder proof independently.
2. Resolve the existing default-parallel test-runner timeout flake across the
   provider suites in coordinator-owned test configuration or provider tasks.
3. Only then draft explicit hook setup and secure single-writer ingestion work.

## Blockers

- Dashboard availability depends on later explicit setup and integration tasks.
- Bare `npm test` can exhaust the 500 ms fake-process timeouts when the Claude,
  Codex, Gemini, and Next.js test files run concurrently. The same 60 tests pass
  with Node's built-in `--test-concurrency=1`; changing shared test
  configuration is outside this task's owned files.

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
- Owner approved Task card 0006; Task card 0004 passed review and the Builder
  implementation started.
- Completed the three-file Builder implementation without hook installation,
  persistence, settings access, or a new dependency; independent review is
  pending.
