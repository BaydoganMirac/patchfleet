# ADR 0003: Sanitized projections and durable command intents

Status: Accepted

Date: 2026-07-13

## Context

Users need remote visibility and control without opening an inbound port or
uploading sensitive execution data. Browser requests cannot safely or reliably
act as direct shell commands on a developer machine.

## Decision

The local host connects outbound over HTTPS. It uploads only allowlisted,
sanitized operational projections. Cloud records remote actions as typed,
expiring, idempotent intents. The host retrieves, validates, applies, and
receipts them.

No generic shell command exists in the protocol.

## Options considered

1. Inbound host API exposed to Cloud: rejected due to networking and security
   risk.
2. Cloud stores full local state and transcripts: rejected due to privacy and
   source-of-truth ambiguity.
3. Outbound sanitized projections plus durable intents: selected for
   recoverability, auditability, and a narrow trust boundary.

## Consequences

- Remote actions are eventually applied rather than synchronous shell calls.
- The UI must show pending and terminal receipt states honestly.
- Redaction, replay, revocation, expiry, and stale-revision tests are release
  requirements.
