# Task card 0010: Codex local work control and console

Status: Approved

Coordinator: Patchfleet coordinator

Builder: one control-and-console owner after Task 0009 review

Reviewer: one independent reviewer after the Builder commit

Approved by owner: 2026-07-16

Updated: 2026-07-16

Depends on: Task card 0009 completed and independently reviewed

## Objective

Connect the durable queue to one real provider: start and cancel Codex work
through app-server, then expose the complete capability-aware local console
flow.

## Observable outcome

The local page can enqueue a Codex work item, start exactly one sandboxed turn,
show the linked opaque run/session state, cancel it, and recover queue, run, and
receipt state after restart.

## Owned files

The Builder may change only:

- `lib/providers/codex.mjs` or one focused Codex control module beside it;
- the Task 0009 domain/runtime modules needed for `start_work`, `cancel_run`,
  run facts, and observation reconciliation;
- one shared browser-mutation guard under `lib/runtime/`;
- `app/page.tsx`, `app/globals.css`, and local work mutation routes under
  `app/api/`;
- `app/api/observe/route.ts` only to reuse the mutation guard;
- focused Codex control, local shell, runtime, and route tests under `tests/`;
- `README.md` and `docs/state/v0-local-work-control.md`.

Middleware, Cloud, protocol command list, dependencies, lockfile, Gemini
extension, and Claude/Gemini control code are read-only.

## Required behavior

- Use accepted [ADR 0014](../decisions/0014-codex-control-uses-a-bounded-app-server-session.md).
- Spawn Codex without a shell and keep one initialized app-server connection
  per Patchfleet server process.
- Start a persistent thread in the validated workspace with
  `sandbox: workspace-write`, `approvalPolicy: never`, and raw events disabled.
- Start one text turn and persist only validated opaque thread/turn IDs.
- Resume a stored thread before interrupt after runtime restart.
- Reject app-server requests and discard notifications without serializing
  their contents.
- Collapse process/protocol failures into stable safe reason codes.
- Extend the command engine only with local-only `start_work` and `cancel_run`.
- Add a durable run link and derive normalized run lifecycle from linked Codex
  observation facts without copying provider-native payloads.
- Accept mutations only from exact loopback same-origin bounded form posts.
- Keep enqueue available offline; expose start/cancel only when local state and
  Codex capability allow them.
- Provide labeled, keyboard-usable, responsive create/list/start/remove/cancel
  controls and honest empty, unavailable, stale, receipt, and storage-error
  states.

## Acceptance

- Fake app-server tests prove initialize, start, resume, interrupt, duplicate
  suppression, restart recovery, request rejection, and raw-data exclusion.
- Local-shell tests prove origin/body bounds, route redirects, capability-aware
  UI, durable queue, and restart state.
- One disposable real Codex smoke starts in a temporary workspace and is
  interrupted; its prompt/output/path is absent from receipts and observation
  projection.
- Existing 84 Phase 1 tests remain green.
- `npm test`, `npm run build`, and `git diff --check` pass.
- no dependency or lockfile change.
- independent review reports no unresolved P0-P2 finding.
- one local Builder commit exists; no push.

## Forbidden scope

- Cloud, remote intents, pairing, auth, billing, telemetry, notifications;
- shell strings, danger-full-access, approval escalation, automatic question
  answers, arbitrary app-server method relay;
- Claude Code or Gemini start/cancel;
- retry, reorder, revise, scheduling, attachments, daemon, watcher, desktop
  wrapper, installer, or new dependency.

