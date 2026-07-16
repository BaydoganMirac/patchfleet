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

## In progress

- Task 0009 durable queue and command receipt implementation.

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

