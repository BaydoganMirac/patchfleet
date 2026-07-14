---
name: cloud-boundary
description: Protect Patchfleet's local-to-Cloud trust boundary. Use whenever pairing, host credentials, heartbeat, sanitized projections, sync, remote command intents, receipts, authorization, retention, telemetry, or any data crossing between the public local app and Patchfleet Cloud changes.
---

# Cloud boundary

Treat Cloud as an optional projection and intent service, never as the local
execution authority.

## Read first

1. [Public protocol](../../../docs/protocol.md)
2. [Architecture](../../../docs/architecture.md)
3. [Projection and intent decision](../../../docs/decisions/0003-sanitized-projections-and-durable-intents.md)
4. The Cloud boundary in the sibling private repository when available
5. Current public and Cloud feature state

If the roadmap still defers Cloud implementation, limit work to contracts and
documentation unless the owner explicitly reorders the roadmap.

## Rules

- Initiate every connection from the local host over outbound HTTPS.
- Build outbound payloads from an allowlist; never serialize a complete local
  object and redact afterward.
- Keep source, diffs, prompts, responses, transcripts, tool output, environment
  variables, credentials, provider-native payloads, and filesystem paths local.
- Store provider and pairing credentials only in appropriate protected storage.
- Authorize every Cloud read and mutation by user, workspace, and host.
- Represent remote mutations as typed, expiring, idempotent intents.
- Validate every intent locally before applying it.
- Never accept arbitrary shell text, scripts, repository files, or generic
  provider commands.
- Let only a host receipt mark an intent applied, rejected, expired, or failed.
- Reject stale projections, revoked hosts, replays, and unknown schema versions.
- Keep local operation working when Cloud is absent or unavailable.

## Required checks

Add the smallest checks that prove the changed boundary:

- forbidden-field canary rejection;
- stale revision rejection;
- cross-workspace denial;
- revocation;
- duplicate intent idempotency;
- expired intent rejection;
- receipt retry safety.

If sanitization fails, send nothing.
