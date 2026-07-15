# ADR 0009: Codex observation uses supported app-server metadata

Status: Accepted

Date: 2026-07-15

## Context

Patchfleet needs a read-only view of Codex session lifecycle without reading
private Codex storage or parsing human terminal output. The supported app-server
JSONL protocol exposes thread listing, thread reading, runtime thread status,
latest-turn status, and timestamps.

A fresh observer process can list persisted sessions but reports them as
`notLoaded`; it cannot prove that a thread owned by another Codex client is
currently live. Recency is not execution state.

## Options considered

1. Read Codex SQLite or rollout files and inspect operating-system processes:
   rejected because private formats and heuristic process matching are not a
   public provider contract.
2. Treat recent, `idle`, or `notLoaded` sessions as active or completed:
   rejected because it invents lifecycle truth.
3. Use supported app-server metadata and expose unknown where live state is not
   explicit: proposed as the smallest honest boundary.

## Decision

Patchfleet uses `codex app-server` over stdio JSONL for Codex probe and
read-only observation. It initializes without experimental API opt-in and uses
`thread/list` plus `thread/read`.

Lifecycle precedence is:

1. an explicit terminal latest-turn status wins over stale thread status;
2. explicit thread active or turn in-progress becomes running;
3. system error degrades observation;
4. idle, not-loaded, missing, and unknown values remain unknown.

The adapter discards prompt previews, titles, cwd, paths, git data, items,
errors, and all unapproved native fields before returning normalized data. It
does not read Codex private files or inspect processes.

The first slice observes at most 20 recent non-archived interactive sessions.
It does not paginate or define time-based retention.

## Consequences

- Recent and terminal work can be shown through a supported structured API.
- Patchfleet will not falsely claim cross-client live detection.
- A future managed app-server or provider-supported shared live surface may
  improve liveness without changing stored unknown states retroactively.
- Codex CLI upgrades may change the generated schema; malformed or unsupported
  responses fail closed as a degraded provider state.
- Claude Code and Gemini must prove their own mappings before the shared
  contract grows.

## Out of scope

- Starting or controlling Codex work.
- Installing or managing a Codex daemon.
- Direct access to Codex state databases or rollout files.
- Parsing terminal UI output.
- Cloud projection or remote control.

## References

- [Task card 0002](../plans/0002-codex-read-only-observation.md)
- [Provider adapter ADR](0002-provider-adapters.md)
- [V0 control-loop plan](../plans/v0-local-first-control-loop.md)
- [Official Codex app-server manual](https://learn.chatgpt.com/docs/app-server.md)
