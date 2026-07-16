# V0 local-first control loop

Status: Completed

Owner: Patchfleet coordinator

Updated: 2026-07-16

Completed: 2026-07-16

Independent review: Passed across Task cards 0001-0008

## Completion

Task cards 0001-0008 are complete and independently reviewed. One manual
refresh observes Codex, Claude Code, and Gemini CLI through supported structured
surfaces, persists sanitized lifecycle facts through one append-only writer,
and rebuilds a provider-scoped dashboard projection after restart.

Codex uses the supported app-server protocol, Claude uses Agent View JSON, and
Gemini uses an explicit native extension with a sanitized lifecycle inbox.
Gemini's real link/status/uninstall smoke passed after adding compatibility for
Gemini CLI 0.43.0 structured extension output on stderr.

The closing evidence is 84 passing tests, a successful production build,
restart/recovery coverage, real provider smokes, and no unresolved P0-P3 review
finding. No Cloud call, provider control, prompt, transcript, source, diff,
tool output, token, credential, or absolute path enters the normalized state.

## Goal

Prove Patchfleet's core value without Cloud: one local screen shows real coding
agent activity through a durable, provider-neutral model.

Codex proved the reference contract first; Claude Code and Gemini CLI now pass
through the same fixed provider-neutral production boundary.

## Demo at completion

On a clean local installation, a user can:

1. start Patchfleet;
2. see whether Codex, Claude Code, and Gemini CLI are installed and observable;
3. see supported active and recent sessions with normalized status;
4. restart Patchfleet without losing previously acknowledged lifecycle facts;
5. inspect a clear unavailable or error reason when observation is impossible;
6. run the shared provider, persistence, recovery, and local-shell checks.

No Cloud account or network call is required.

## Scope

### Domain

Define only the fields the first screen needs:

- provider identifier and display name;
- installation state and version when available;
- capability flags;
- opaque provider session identifier stored locally;
- normalized lifecycle status;
- start, last-observed, and terminal timestamps;
- optional user-owned label;
- stable local error code and safe message.

Do not normalize transcripts, token usage, model reasoning, tool calls, diffs,
or provider-native configuration in this slice.

### Adapter

Create a small Codex adapter with two responsibilities:

- probe installation and observation capability;
- observe current and recently terminal sessions.

The adapter returns data; it does not write storage or render UI. Provider
process invocation and parsing stay inside its folder.

### Persistence

Use one append-only local JSON event log and an atomic derived projection.
Create event schemas for provider observed, session observed, session terminal,
and observation failed.

The writer must:

- serialize writes through one owner;
- assign unique event identifiers and schema version;
- flush acknowledged writes;
- tolerate an incomplete final line after a crash;
- rebuild projection deterministically.

### UI

The local dashboard shows:

- provider cards with installed, unavailable, and degraded states;
- session list grouped by active and recent;
- provider, lifecycle, last update, and safe error reason;
- loading, empty, stale, and fatal-storage states;
- a manual refresh action.

The first screen is operational, not decorative. Do not add charts, billing,
account menus, remote toggles, or fake controls.

### Tests

- domain schema parsing and rejection;
- event append, replay, incomplete-tail recovery, and deterministic projection;
- Codex fixture parsing;
- adapter unavailable, timeout, malformed-output, active, and terminal cases;
- UI state mapping;
- one integration test from adapter fixture through projection.

## Implementation sequence

1. Add domain types and fixtures.
2. Add event writer, replay, and projection tests.
3. Implement Codex probe and observation behind fixtures.
4. Connect observation changes to events and projection.
5. Replace the starter page with the operational dashboard.
6. Add recovery and unavailable-path integration tests.
7. Run build, typecheck, tests, and a manual restart drill.
8. Update state and record any contract change as an ADR.

## Acceptance criteria

- npm run build succeeds.
- The repository has a repeatable test command and it succeeds.
- No adapter imports UI or Cloud code.
- The UI reads the local projection, not raw provider output.
- Replaying the same observation does not create misleading lifecycle changes.
- A truncated final event does not erase earlier valid history.
- No network request to Patchfleet Cloud occurs.
- No raw prompt, transcript, source, diff, tool output, token, or absolute path
  enters the normalized projection.
- Unsupported provider conditions produce a stable, user-actionable state.

## Phase 1 closure

The conformance contract is frozen, all three provider adapters use supported
structured surfaces, production persistence and UI are provider-scoped, and
all three providers pass end to end. Work intake and control begin in Phase 2
through a new owner-approved task card.

## Explicitly deferred

- starting or cancelling provider work;
- work queue and questions;
- Cloud pairing or sync;
- background service installation;
- desktop wrapper;
- analytics, billing, notifications, and team accounts.

## Risks to investigate during implementation

- provider CLIs expose different concepts for active versus historical
  sessions;
- session discovery may require supported APIs rather than parsing unstable
  human output;
- provider process timeouts must not block the web request loop;
- browser/server hot reload must not create multiple event writers.

Resolve these with the smallest provider-supported mechanism. Do not solve them
with a generic plugin framework.
