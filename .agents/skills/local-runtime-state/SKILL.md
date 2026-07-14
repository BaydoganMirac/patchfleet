---
name: local-runtime-state
description: Change Patchfleet local events, projections, persistence, work queue state, command intents, receipts, replay, recovery, or idempotency. Use whenever durable local runtime state or a state transition is added, modified, repaired, or reviewed.
---

# Local runtime state

Keep local state canonical, durable, and rebuildable with one writer.

## Read first

1. [Architecture](../../../docs/architecture.md)
2. [Append-only events decision](../../../docs/decisions/0004-append-only-local-events.md)
3. [Protocol](../../../docs/protocol.md) for intents or receipts
4. The active plan and feature state

## Write path

1. Validate the input at the boundary.
2. Resolve a stable event identifier and schema version.
3. Serialize the append through the single local writer.
4. Acknowledge only after the durable write succeeds.
5. Derive the user-facing projection from accepted events.
6. Write projections atomically and keep them rebuildable.

Do not let UI routes, provider adapters, or Cloud sync mutate projection files
directly.

## Event rules

- Treat accepted events as immutable facts.
- Preserve ordering and reject duplicate event identifiers.
- Ignore only an incomplete final log line caused by a crash; surface other
  corruption.
- Keep replay deterministic.
- Add a new event version when meaning changes.
- Do not introduce a database or event framework until measured concurrency,
  migration, or query pressure exceeds the current JSON design.

## Command rules

- Validate identity, version, expiry, idempotency, target revision, provider
  capability, and local policy before a side effect.
- Persist requested and terminal outcomes.
- End every accepted command as applied, rejected, expired, or failed.
- Return the original semantic receipt for a duplicate idempotency key.
- Never infer success from request acceptance.

## Minimum check

Leave one runnable check for the changed behavior. Cover the highest-risk path:
append and replay, crash-tail recovery, deterministic projection, duplicate
intent, or receipt recovery.

Update feature state before handoff.
