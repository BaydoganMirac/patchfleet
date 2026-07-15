# ADR 0011: Multi-provider observation projection before hook ingress

Status: Accepted

Date: 2026-07-16

## Context

The production observation path still stores one Codex snapshot even though
Codex, Claude Code, and Gemini CLI now pass their approved provider proofs.
Codex and Claude expose pull observations. Gemini exposes a safe version probe
but requires an explicitly configured command hook for lifecycle signals.

The integration must preserve the existing append-only log, single writer,
restart recovery, safe error catalog, and old Codex data without turning the
provider boundary into a plugin framework.

## Options considered

1. Keep one mutable projection per provider: rejected because the dashboard
   would need multiple read paths and cross-provider recovery could drift.
2. Add a registry/plugin SDK and Gemini hook transport in one change: rejected
   because hook configuration is a separate mutation and security boundary.
3. Keep normalized observations provider-specific, project them together, and
   defer hook ingress: selected as the smallest honest production bridge.

## Decision

The event log remains schema version 1 and continues to use its existing
`providerId` field, now validated for the three proven providers. Session
identity is scoped by provider during replay so equal native ids cannot collide.

The derived projection becomes schema version 2 with an ordered
`observations` list. Each item remains the already-proven schema version 1
normalized observation. Existing Codex schema version 1 projection files are
accepted and wrapped in memory; replaying existing events writes version 2.

One manual refresh calls the three approved adapters and persists their
normalized results through the same writer. Gemini honestly appears as hook
setup required until a later owner-approved task adds explicit, reversible
hook configuration and secure lifecycle ingress.

## Consequences

- The dashboard can render all providers without raw provider fields.
- Existing Codex event history and projection files remain readable.
- No event migration, database, provider base class, registry, or dependency is
  introduced.
- Gemini availability is visible, but active Gemini lifecycle remains deferred
  until hook setup and ingress are implemented together.

## References

- [ADR 0002](0002-provider-adapters.md)
- [ADR 0004](0004-append-only-local-events.md)
- [ADR 0010](0010-supported-provider-observation-surfaces.md)
- [Task card 0007](../plans/0007-multi-provider-production-observation.md)
