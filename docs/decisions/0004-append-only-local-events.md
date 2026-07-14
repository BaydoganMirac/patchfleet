# ADR 0004: Append-only local events with derived projections

Status: Accepted

Date: 2026-07-13

## Context

Agent work changes asynchronously and must survive UI restarts, duplicate
observations, and partial failures. A mutable dashboard snapshot alone cannot
explain what happened or support definitive command receipts.

## Decision

Durable local facts are append-only versioned events written by one owner.
Dashboard state and Cloud projections are derived, rebuildable views. V0 uses a
JSON event log and atomic JSON projection built with Node.js file primitives.

## Options considered

1. Mutable JSON snapshot only: rejected because history and recovery semantics
   are weak.
2. Database and event framework immediately: rejected because V0 has one
   writer and modest query needs.
3. Append-only JSON events with derived projection: selected as the smallest
   durable design.

## Consequences

- Event schemas and replay tests become public contracts.
- An incomplete crash tail needs explicit recovery.
- Storage may move to SQLite later without changing event meaning.
- Compaction must preserve an auditable snapshot boundary.
