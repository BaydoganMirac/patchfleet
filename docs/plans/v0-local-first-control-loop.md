# V0 local-first control loop

Status: in progress

Owner: Patchfleet coordinator

Updated: 2026-07-15

## Progress

The Codex read-only reference slice is implemented and independently reviewed.
It probes the supported app-server protocol, persists sanitized lifecycle facts,
rebuilds the local projection, and preserves `unknown` when cross-client live
state is not explicit. Completed
[Task card 0003](0003-provider-observation-conformance.md) adds the independently
reviewed shared test-only conformance contract. Claude Code and Gemini CLI
adapters remain pending.

## Goal

Prove Patchfleet's core value without Cloud: one local screen shows real coding
agent activity through a durable, provider-neutral model.

The first implementation uses Codex end to end. Claude Code and Gemini CLI are
added only after the contract is proven by real Codex behavior.

## Demo at completion

On a clean local installation, a user can:

1. start Patchfleet;
2. see whether Codex is installed and observable;
3. see active and recently terminal Codex sessions with normalized status;
4. restart Patchfleet without losing previously acknowledged lifecycle facts;
5. inspect a clear unavailable or error reason when observation is impossible;
6. run the same conformance suite that later Claude and Gemini adapters must
   satisfy.

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

## Follow-on slice

When Codex passes:

1. freeze the smallest conformance contract;
2. implement Claude Code and Gemini CLI adapters in bounded parallel tasks;
3. change the shared contract only through the integration owner and a recorded
   decision;
4. declare Phase 1 complete only when all three providers pass.

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
