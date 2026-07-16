# ADR 0013: Local work intake shares the canonical event log

Status: Accepted

Date: 2026-07-16

## Context

Phase 2 must retain queued work, command receipts, and run identity across a
Patchfleet restart. The Phase 1 runtime already has one serialized append-only
event writer and deterministic projections. Adding a queue file, database, or
second writer would create two sources of truth before the JSON log has shown a
real limit.

A local work item necessarily contains owner-authored instructions and a local
working directory. Those values are useful on the machine but are forbidden in
default Cloud payloads. They must therefore remain in a separate local work
projection and never be added to the observation or future sanitized Cloud
projection by accident.

## Decision

Work-item, run, command-request, and command-receipt facts use the existing
versioned local event log and serialized writer. A separate atomic local work
projection is rebuilt from that same log.

The first queue is deliberately small:

- enqueue an owner-authored work item;
- list queued and previously started work;
- remove only a queued item;
- start one queued item through a proven provider;
- cancel one active run when that provider proves the capability.

Every mutation is represented as an expiring, idempotent local command intent.
It records a requested event and exactly one terminal receipt with `applied`,
`rejected`, `expired`, or `failed`. Duplicate delivery returns the original
receipt without repeating a side effect. Revision-dependent actions fail on a
stale target revision.

Owner-authored title, instruction, and working directory are classified as
local-only fields. They may appear in the local work projection and local UI.
They never enter the provider observation projection, a default Cloud
projection, a receipt, an error, or a log message. Provider output, transcripts,
tool calls, source, diffs, environment values, tokens, and credentials are not
persisted.

`start_work` is a local-only Phase 2 command. It does not expand the public
host-to-Cloud protocol. A future Cloud start flow must map to an approved public
intent or introduce a separate protocol decision.

## Consequences

- Restart recovery uses the same repaired-tail and corruption rules as Phase 1.
- Queue and receipt consistency do not require a database or lock service.
- Local work data is intentionally more sensitive than the observation
  projection and must be projected through an allowlist before Cloud work.
- Reorder, revise, retry, questions, scheduling, and multi-provider launch stay
  deferred until a real workflow requires them.
- The existing storage module may be renamed when a second concrete consumer
  makes that cleanup worthwhile; Phase 2 does not add an abstraction solely for
  naming purity.

## References

- [ADR 0003](0003-sanitized-projections-and-durable-intents.md)
- [ADR 0004](0004-append-only-local-events.md)
- [Architecture](../architecture.md)
- [Protocol](../protocol.md)
- [Phase 2 plan](../plans/v0-local-work-control.md)

