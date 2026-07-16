# Task card 0009: Durable local work queue

Status: Approved

Coordinator: Patchfleet coordinator

Builder: one runtime owner

Reviewer: one independent reviewer after the Builder commit

Approved by owner: 2026-07-16

Updated: 2026-07-16

Depends on: Phase 1 completed and independently reviewed

## Objective

Add the smallest durable local WorkItem queue and command-receipt engine to the
existing canonical event log. This task has no provider side effect and no UI.

## Observable outcome

Tests can enqueue, list oldest-first, remove a queued item, replay after
restart, reject stale or expired actions, and prove duplicate delivery returns
the first terminal receipt without repeating an event.

## Owned files

The Builder may change only:

- one new work/command domain module under `lib/domain/`;
- `lib/runtime/observation-store.mjs`;
- one new focused queue/receipt runtime module under `lib/runtime/` if needed;
- `tests/observation-store.test.mjs` only for shared-log regression coverage;
- new focused tests under `tests/`;
- `docs/state/v0-local-work-control.md`.

All UI, route, middleware, provider adapter, Cloud, package, dependency, and
lock files are read-only.

## Required behavior

- Reuse `events.jsonl`, its single serialized writer, fsync acknowledgement,
  incomplete-tail repair, corruption failure, and unique event IDs.
- Persist a separate atomic `work-items.json` projection rebuilt from the same
  log.
- Validate exact version-one schemas for WorkItem, local command intent, and
  terminal receipt.
- Support only `enqueue_work` and `remove_queued_work` in this task.
- Store owner title, instruction, provider ID, and absolute working directory
  only in local work facts/projection.
- Keep a monotonically increasing work projection revision and item revision.
- Require the observed item revision for removal.
- Record requested plus exactly one `applied`, `rejected`, `expired`, or
  `failed` receipt.
- Return the original receipt for a duplicate idempotency key with identical
  intent; reject reuse with different content.
- Remove only queued items; retain their immutable events and receipt history.
- Keep at most the data needed by this contract; add no retry, reorder, revise,
  question, attachment, scheduler, or background worker.

## Acceptance

- Focused queue, replay, corruption, recovery, revision, expiry, validation,
  idempotency, and privacy tests pass.
- Existing Phase 1 tests pass.
- `npm run build` and `git diff --check` pass.
- no dependency or lockfile change.
- independent review reports no unresolved P0-P2 finding.
- one local Builder commit exists; no push.

## Stop conditions

Stop if the queue needs a second event log/writer, database, service, watcher,
new dependency, Cloud call, provider process, or raw provider payload.

