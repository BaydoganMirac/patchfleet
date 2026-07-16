# V0 local work control

Status: In progress

Last updated: 2026-07-16

## Done

- Owner authorized completion of Phase 2.
- Inspected the completed Phase 1 runtime and the earlier RiderHub work-intake
  and Codex app-server evidence.
- Verified Codex 0.144.1's generated machine-readable protocol includes the
  required start, resume, read, and interrupt methods.
- Accepted ADR 0013 for a shared canonical log with a separate local work
  projection.
- Accepted ADR 0014 for bounded Codex app-server control.
- Approved Task cards 0009 and 0010.
- Implemented Task 0009 exact version-one WorkItem, local command intent, and
  terminal receipt contracts.
- Added `enqueue_work` and revision-aware `remove_queued_work` through the one
  serialized, fsynced `events.jsonl` writer.
- Added the atomic, rebuildable local-only `work-items.json` projection with
  oldest-first work items, monotonic revisions, and safe receipt history.
- Covered restart replay, pending-request recovery, crash-tail repair,
  corruption failure, stale and expired commands, concurrent duplicate
  delivery, idempotency conflict, shared-log isolation, and privacy canaries.

## In progress

- Independent Task 0009 review.

## Next up

1. Independent Task 0009 review.
2. Task 0010 Codex control and console implementation.
3. Combined fresh review, real disposable smoke, full QA, and Phase 2 closure.

## Blockers

- None.

## Open questions

- None in the approved Phase 2 scope.

## Decisions accepted

- Local work text and working directory remain local-only data.
- Work facts and receipts reuse the one canonical event log.
- Codex is the sole Phase 2 execution provider.
- Codex work is workspace-write with no approval escalation.
- Cloud and generalized provider control remain deferred.
