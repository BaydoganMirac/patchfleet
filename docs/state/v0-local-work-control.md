# V0 local work control

Status: Done

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
- Closed Task 0009 review findings: pending requests expire without a work
  fact, work-item identities cannot be reused after removal, receipt reasons
  are bound to command replay semantics, and missing, stale, or corrupt work
  projections self-heal from the valid canonical log.
- Expiry is evaluated only after a command reaches the serialized writer;
  queued commands cannot apply with a stale pre-queue clock sample, while
  terminal duplicates still return the original receipt unchanged.
- Task 0009 independently re-reviewed clean with no unresolved P0-P3 finding.
- Task 0009 exact-tree checks passed: 93 tests, production build, and diff
  check; commits `3f7f357`, `ad66a4c`, and `649f001` remain local only.
- Implemented Task 0010 `start_work` and `cancel_run` with durable requested and
  terminal receipt events, opaque Codex run links, restart replay, stale and
  expiry validation, and fail-closed uncertain outcomes.
- Added bounded Codex workspace preflight for a real Git worktree root and a
  single long-lived app-server connection with `workspace-write`, approval
  policy `never`, persistent threads, raw events disabled, rejected server
  requests, and discarded notifications/native output.
- Added an fsynced owner-epoch launch contract before every provider call.
  `run.launching`, `run.prepared`, `turn.requested`, and `run.started` carry the
  same opaque boot owner, while the event log stores no provider-native item.
- Bounded real Codex 0.144.1 diagnostics proved that a new app-server rejects
  resume for both an empty prepared thread and an active turn after the owning
  app-server closes. Patchfleet therefore never attempts cross-process resume:
  old pending launches become `START_OUTCOME_UNKNOWN`/blocked and old active
  runs become session-lost/failed/blocked without a replacement start.
- Added the dependency-free loopback Next.js launcher that supplies one random
  owner epoch to all server workers for the lifetime of that local app boot.
- Added one exact same-origin, loopback-only, size-bounded URL-encoded mutation
  route with duplicate and extra field rejection.
- Added the responsive, keyboard-usable local work console for enqueue, remove,
  capability-aware start/cancel, durable run state, and safe receipt history.
- Focused fail-closed control/runtime tests and local-shell restart tests pass,
  including crashes before provider prepare, after provider prepare, after
  turn request, uncertain turn start, old-owner active run, stale read-only GET,
  manual Refresh reconciliation, and zero replacement starts.
- Disposable real Codex smoke applied same-owner start and cancel and excluded
  the private canary from receipts. Resume-limit diagnostics and all temporary
  files/processes were cleaned up.
- Full Task 0010 Builder checks pass on the exact tree: 102 tests, production
  build, and diff check; the dependency lockfile is unchanged.
- Closed the first independent review findings: uncertain thread/turn starts
  and interrupts now terminalize in the same call; old-owner pending cancels
  receive a durable receipt; UI and POST share the stable Codex 0.144.1+
  compatibility gate.
- Closed the second review's concurrency finding: a simultaneous terminal
  observation and successful cancel now produces one idempotent fact and
  receipt without a second revision. Completed/failed races do not claim a
  cancellation succeeded.
- Exact retry repairs missing receipts after durable `run.started`,
  `run.start_unknown`, `run.interrupted`, or `run.session_lost` facts, including
  an incomplete receipt tail, without another provider call.
- Final independent re-review reports no unresolved P0-P2 finding. The final
  exact tree passes 120 tests, a production build, and `git diff --check`.
- Final disposable Codex 0.144.1 smoke produced `WORK_STARTED` then
  `RUN_CANCELLED`; item and run ended `interrupted`, privacy canaries remained
  absent, and temporary processes/directories were removed.
- Phase 2 implementation commits are local only; nothing was pushed or
  deployed.
- Task 0010 implementation and hardening are recorded in local commits
  `df4a725`, `10064c8`, and `b82db83`.

## In progress

- None. Phase 2 is closed.

## Next up

1. Prepare an owner-approved Phase 3 plan for optional Cloud pairing and the
   smallest sanitized outbound projection.
2. Do not implement Cloud, remote commands, packaging, auth, or billing before
   that plan is explicitly approved.

## Blockers

- None.

## Open questions

- None in the approved Phase 2 scope.

## Decisions accepted

- Local work text and working directory remain local-only data.
- Work facts and receipts reuse the one canonical event log.
- Codex is the sole Phase 2 execution provider.
- Codex work is workspace-write with no approval escalation.
- Codex control is same-owner-boot only; restart is at-most-once and fail-closed.
- Cloud and generalized provider control remain deferred.
