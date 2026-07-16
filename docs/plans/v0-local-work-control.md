# Phase 2: Durable local work control

Status: In progress

Owner: Patchfleet coordinator

Approved by owner: 2026-07-16

Updated: 2026-07-16

## Outcome

One local Patchfleet user can enqueue an instruction for a local workspace,
start it through Codex, cancel an active turn, and recover the complete queue,
run identity, and command receipts after restart.

Phase 2 closes the local half of the product's smallest control loop. It does
not implement Cloud, packaging, billing, authentication, or generalized
provider control.

## Delivery sequence

1. [Task card 0009](0009-durable-local-work-queue.md) adds the durable queue,
   revision checks, and terminal command receipts through the existing writer.
2. [Task card 0010](0010-codex-local-work-control.md) adds bounded Codex
   start/cancel, local mutation routes, and the console workflow.
3. A fresh reviewer verifies the combined committed Phase 2 artifact.
4. Full tests, production build, restart recovery, duplicate delivery, stale
   revision, privacy canaries, and a disposable real Codex smoke must pass.

## Locked product contract

- Work items are ordered oldest-first and may be queued while Codex is absent.
- The form asks only for title, instruction, and local working directory.
- Codex is the sole execution option in this phase.
- A queued item may be removed; a started item cannot be removed.
- Start creates one run and one Codex turn. Duplicate start returns the original
  receipt and cannot create a second turn.
- Cancel is available only for an active run and is idempotent.
- Manual provider refresh reconciles the linked Codex session into the work
  projection without copying provider output.
- Every mutation is same-origin, bounded, schema-validated, attributable,
  expiring, revision-aware when needed, and durably receipted.

## Done gate

- Queue create/list/remove survives a process restart.
- Duplicate commands return one semantic receipt and one side effect.
- Stale, expired, unknown, unavailable, and invalid commands fail closed with
  safe stable reason codes.
- A real disposable Codex task can start and be interrupted without provider
  output entering Patchfleet storage.
- The console works at desktop and compact widths with keyboard-visible labels,
  status, safe errors, and capability-aware controls.
- Phase 1 observation behavior remains green for Codex, Claude Code, and Gemini
  CLI.
- `npm test`, `npm run build`, and `git diff --check` pass.
- Independent review has no unresolved P0-P2 finding.
- State, roadmap, README, and ADR index describe the final behavior.
- Local commits are clean and ready for owner review; nothing is pushed.

## Deferred

- Cloud pairing, sync, remote intents, auth, billing, notifications, and teams;
- Claude Code or Gemini execution control;
- revise, reorder, retry, questions, approvals, scheduling, and attachments;
- provider output, transcript, diff, terminal, or token display;
- daemon, watcher, desktop shell, installer, background startup, and Windows
  packaging.

