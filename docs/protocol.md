# Host-to-Cloud protocol

Status: V0 contract; endpoint details may evolve under version 1

Updated: 2026-07-13

This public document defines the trust contract between a Patchfleet local host
and Patchfleet Cloud. The public repository owns the contract. The private
Cloud repository implements it.

## Invariants

- The host initiates every network connection.
- Local events and provider state are canonical.
- Cloud projections are sanitized and rebuildable.
- Cloud sends intent records, never executable shell text.
- The local host may reject any intent.
- Every accepted intent ends with one durable terminal receipt.
- Unknown schema versions fail closed.

## Data classes

### Allowed by default

- opaque host, workspace, work-item, run, intent, and receipt identifiers;
- user-chosen host display name;
- Patchfleet version and operating-system family;
- provider identifier, availability, version, and capability flags;
- lifecycle status and coarse timestamps;
- queue position, retry count, and terminal reason codes;
- owner-authored text that was originally entered in Patchfleet Cloud;
- sanitized command receipts.

### Allowed only with explicit opt-in

- a user-defined project alias;
- local-origin work-item title or description;
- fine-grained performance diagnostics;
- support bundles that have a preview and expiry.

### Forbidden in default Cloud payloads

- source code, diffs, patches, generated files, or repository archives;
- raw prompts, model responses, transcripts, reasoning, or tool output;
- terminal stdout or stderr;
- absolute or home-relative filesystem paths;
- environment variables, configuration files, tokens, cookies, credentials,
  model keys, or pairing secrets;
- Git remote URLs containing credentials;
- arbitrary provider-native payloads.

Sanitization is an allowlist projection. It is not a collection of regular
expressions applied after serializing the complete local object.

## Pairing

1. An authenticated Cloud user creates a short-lived, single-use pairing code.
2. The local user enters or opens that code in Patchfleet.
3. The host sends the code, host public identity, app version, and protocol
   version over HTTPS.
4. Cloud consumes the code and returns an opaque host identifier plus a
   revocable host credential.
5. The host stores the credential using operating-system-appropriate protected
   storage.

Pairing does not transfer provider credentials. Re-pairing or revocation
invalidates the old host credential.

## V0 resources

The first implementation may expose these HTTP resources:

- POST /api/v1/pairings/consume
- POST /api/v1/hosts/{hostId}/heartbeat
- PUT /api/v1/hosts/{hostId}/projection
- GET /api/v1/hosts/{hostId}/intents?after={cursor}
- POST /api/v1/hosts/{hostId}/receipts

Exact route naming may change before code lands, but the resource semantics and
trust boundary require an ADR to change.

Polling is the V0 delivery mechanism because it works through ordinary outbound
HTTPS and is easy to recover. Server-sent events may reduce latency later;
polling remains the recovery path.

## Envelope

Every host message includes:

- schemaVersion;
- messageId;
- hostId;
- sequence or cursor where ordering matters;
- occurredAt in UTC;
- payload containing only fields defined for that message.

Cloud rejects unknown hosts, replayed pairing codes, invalid credentials,
unsupported versions, and messages that violate size or schema limits.

## Heartbeat and projection

Heartbeat proves liveness and reports only app/protocol versions, last local
sequence, and coarse health.

Projection carries the latest allowed operational view. It is versioned and may
be replaced by a later projection from the same host. Cloud must not turn a
projection back into canonical local events.

The host owns monotonically increasing projection revisions. Cloud rejects an
older revision rather than regressing visible state.

## Command intent

An intent contains:

- opaque intentId and idempotencyKey;
- hostId and workspace authorization context;
- allowlisted command type;
- versioned typed payload;
- createdAt and expiresAt;
- expected local revision when the action depends on current state;
- actor identity suitable for an audit trail.

Candidate V0 command types are:

- enqueue_work;
- revise_queued_work;
- reorder_queue;
- remove_queued_work;
- cancel_run;
- answer_question.

There is no execute_shell, run_script, upload_repository, or generic provider
command. New intent types require a protocol decision and redaction review.

## Intent application

The local host validates, in order:

1. credential and host identity;
2. supported schema and command type;
3. expiry;
4. idempotency;
5. target existence and expected revision;
6. provider capability;
7. local safety policy.

Only then may it attempt a side effect. The host records requested, accepted or
rejected, and terminal outcome as local events.

## Receipt

A terminal receipt has one of four outcomes:

- applied;
- rejected;
- expired;
- failed.

It includes the intent and idempotency identifiers, timestamps, a stable reason
code, resulting sanitized revision when applicable, and no raw provider output.
Retrying delivery of a receipt is safe. Replaying an applied intent returns the
same semantic receipt without repeating the side effect.

## Versioning

Protocol version 1 uses additive compatible changes within a message version.
Removing or changing meaning requires a new schema version and a compatibility
window. Host and Cloud expose their supported version range during pairing and
heartbeat.

## Required contract tests

- forbidden-field canaries never appear in serialized payloads;
- stale projections cannot overwrite newer state;
- duplicate intents do not repeat side effects;
- expired and unknown intents fail closed;
- receipt retries are idempotent;
- host revocation blocks subsequent sync;
- local operation continues when every Cloud request fails.
