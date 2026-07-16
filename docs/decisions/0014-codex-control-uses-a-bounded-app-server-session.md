# ADR 0014: Codex control uses a bounded app-server session

Status: Accepted

Date: 2026-07-16

## Context

Patchfleet needs one real provider start/cancel loop before generalizing
control. Codex 0.144.1 exposes machine-readable `thread/start`, `turn/start`,
and `turn/interrupt` methods. The app-server also exposes `thread/resume` and
`thread/read`, but bounded real diagnostics established an important limit:
after the app-server process that owns a thread closes, a new app-server
rejects `thread/resume` for both an empty prepared thread and an active turn.
Patchfleet therefore cannot honestly promise cross-process Codex control
recovery from opaque IDs alone.

The app-server emits notifications and may request approvals. Persisting those
payloads would cross the privacy boundary, and accepting an escalation would
give a browser button more authority than the local safety policy.

## Decision

Codex is the only Phase 2 execution provider. The supported control window is
one Patchfleet server boot, identified by a random opaque owner epoch that the
local launcher supplies to all Next.js server workers.

For every start intent Patchfleet:

1. atomically fsyncs `command.requested` and `run.launching`, including the
   owner epoch, before calling Codex;
2. validates an existing local Git worktree root;
3. starts one persistent thread through an argv vector with
   `sandbox: workspace-write`, `approvalPolicy: never`, and raw events disabled;
4. atomically fsyncs `run.prepared` and `turn.requested` with the same owner
   epoch and only the opaque thread identifier;
5. starts one text turn and, on success, atomically records `run.started` and
   the terminal command receipt;
6. retains only validated opaque thread and turn identifiers plus the local
   owner epoch in the Run projection.

Cancel is allowed only while the same app-server session and owner epoch still
own the run. That connection interrupts the stored opaque identifiers directly.
Patchfleet does not attempt `thread/resume` after a server restart.

The restart policy is deliberately at-most-once and fail-closed:

- a pending launch from another owner epoch becomes one idempotent
  `run.start_unknown` fact, a failed `START_OUTCOME_UNKNOWN` receipt, and a
  blocked work item;
- an active run from another owner epoch becomes one idempotent
  `run.session_lost` fact, a failed Run, and a blocked work item;
- a read-only page load does not mutate state and never exposes Cancel for an
  old owner epoch; manual Refresh or any control attempt performs the durable
  reconciliation;
- no restart path creates a replacement thread or turn.

This policy may block work that never began, but it cannot duplicate provider
work after an uncertain launch. A future provider-supported atomic start or
proven idempotency contract is required before automatic restart recovery can
replace it.

The adapter ignores notifications and rejects server requests without
persisting their contents. No provider stdout, stderr, transcript, response,
tool payload, token, source, diff, credential, environment value, or absolute
path is copied into a command receipt. Adapter errors collapse to stable safe
reason codes. `threadSource` remains diagnostic metadata only and is never a
correctness or recovery key.

The local preflight rejects a filesystem root, the user's home directory, a
missing path, a non-directory, and a directory without a `.git` file or
directory. Support for non-Git workspaces requires a later policy decision.

## Consequences

- A user can enqueue while Codex is unavailable and start later.
- Codex may edit only inside the selected workspace and cannot request a
  sandbox escape through Patchfleet.
- Interactive approvals and provider questions remain unsupported.
- Patchfleet must keep the owning app-server child alive while work is active.
- Restarted or lost sessions become visible blocked/session-lost states instead
  of being resumed or duplicated.
- Claude Code and Gemini CLI remain observation-only; adding control requires
  new provider evidence and the same fail-closed conformance cases.

## References

- [ADR 0002](0002-provider-adapters.md)
- [ADR 0009](0009-codex-observation-uses-supported-app-server-metadata.md)
- [Task card 0010](../plans/0010-codex-local-work-control.md)
