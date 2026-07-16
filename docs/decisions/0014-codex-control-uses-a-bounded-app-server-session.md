# ADR 0014: Codex control uses a bounded app-server session

Status: Accepted

Date: 2026-07-16

## Context

Patchfleet needs one real provider start/cancel loop before generalizing
control. Codex 0.144.1 exposes supported machine-readable `thread/start`,
`turn/start`, `thread/resume`, `thread/read`, and `turn/interrupt` methods. A
long-lived app-server connection can own an active turn, while its durable
thread and turn identifiers allow a restarted Patchfleet process to resume the
control relationship.

The app-server also emits notifications and may request approvals. Persisting
those payloads would cross the privacy boundary, and accepting an escalation
would give a browser button more authority than the local safety policy.

## Decision

Codex is the only Phase 2 execution provider. Its adapter:

1. starts one app-server child through an argv vector, never a shell string;
2. initializes the versioned JSONL protocol;
3. creates a persistent thread only for an existing local Git worktree root;
4. sets `sandbox: workspace-write` and `approvalPolicy: never`;
5. starts one text turn from the local owner instruction;
6. returns only validated opaque thread and turn identifiers;
7. resumes the stored thread before interrupting it after a runtime restart;
8. ignores notifications and rejects server requests without persisting their
   contents.

No provider stdout, stderr, transcript, response, tool payload, token, source,
diff, credential, environment value, or absolute path is copied into a command
receipt. Adapter errors collapse to stable safe reason codes.

The UI exposes start and cancel only for Codex and only when the corresponding
capability and local state allow the action. Claude Code and Gemini CLI remain
observation-only in Phase 2; the shared model does not pretend they support the
same controls.

The local preflight rejects a filesystem root, the user's home directory, a
missing path, a non-directory, and a directory without a `.git` file or
directory. This keeps `workspace-write` bounded to an explicit code worktree;
support for non-Git workspaces requires a later policy decision.

## Consequences

- A user can enqueue while Codex is unavailable and start later.
- Codex may edit only inside the selected workspace; it cannot request a
  sandbox escape through Patchfleet.
- Interactive approvals and provider questions are not silently approved; they
  remain unsupported until Patchfleet has an explicit question/approval UI.
- Patchfleet must keep the app-server child alive while work is active and must
  close or replace a failed child cleanly.
- Adding Claude Code or Gemini control requires new provider evidence and the
  same conformance cases, not a boolean copied from Codex.

## References

- [ADR 0002](0002-provider-adapters.md)
- [ADR 0009](0009-codex-observation-uses-supported-app-server-metadata.md)
- [Task card 0010](../plans/0010-codex-local-work-control.md)
