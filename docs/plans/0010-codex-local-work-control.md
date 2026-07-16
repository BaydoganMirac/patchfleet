# Task card 0010: Codex local work control and console

Status: Builder complete; independent review pending

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
show the linked opaque run/session state, cancel it during the owning server
boot, and recover queue, run, receipt, and honest blocked/session-lost state
after restart without launching replacement work.

## Owned files

The Builder may change only:

- `lib/providers/codex.mjs` or one focused Codex control module beside it;
- the Task 0009 domain/runtime modules needed for `start_work`, `cancel_run`,
  run facts, and observation reconciliation;
- one shared browser-mutation guard under `lib/runtime/`;
- `app/page.tsx`, `app/globals.css`, and local work mutation routes under
  `app/api/`;
- `app/api/observe/route.ts` only to reuse the mutation guard;
- `package.json` and one dependency-free local Next.js launcher only to assign
  one opaque owner epoch to all server workers;
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
- Before start, require an existing Git worktree root and reject filesystem
  root, the user's home directory, missing/non-directory paths, and paths
  without a `.git` file or directory.
- Start one text turn and persist only validated opaque thread/turn IDs.
- Keep initialize capabilities null and use no experimental API.
- Gate both UI controls and POST execution through one adapter compatibility
  predicate requiring available supported metadata and stable Codex 0.144.1 or
  newer; availability alone never enables control.
- Before any provider launch, fsync a `run.launching` marker with the current
  opaque owner epoch; carry that epoch through prepared, turn-requested, and
  started facts.
- Fsync only the opaque thread identifier in `run.prepared` and
  `turn.requested` before `turn/start`.
- Interrupt only through the app-server connection that owns the active turn.
  Codex 0.144.1 rejects resume after that owner closes, so an old-epoch pending
  launch becomes `START_OUTCOME_UNKNOWN`/blocked and an old-epoch active run
  becomes session-lost/failed/blocked. Never start a replacement thread or turn.
- Terminalize uncertain thread start, turn start, and interrupt outcomes in the
  same call so exact retries never repeat the provider side effect. Reconcile
  an old-owner pending cancel with a failed `RUN_SESSION_LOST` receipt atomically.
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

- Fake app-server tests prove initialize, start, same-owner interrupt,
  duplicate suppression, timeout and malformed-success at-most-once behavior,
  owner-epoch crash windows, fail-closed restart reconciliation, request
  rejection, child-stream failure handling, and raw-data exclusion.
- Local-shell tests prove origin/body bounds, route redirects, capability-aware
  UI and POST behavior for supported and old Codex versions, durable queue, and
  restart state.
- Disposable real Codex diagnostics prove same-owner start/interrupt and record
  that both empty-thread and active-turn resume are rejected after owner loss;
  prompts/output/paths remain absent from receipts and observation projection.
- Existing 84 Phase 1 tests remain green.
- `npm test`, `npm run build`, and `git diff --check` pass.
- no dependency or lockfile change.
- independent review reports no unresolved P0-P2 finding.
- one local Builder commit exists; no push.

## Builder evidence

- Focused control/runtime tests cover every pre-provider, post-prepare,
  post-turn-request, uncertain thread/turn start, uncertain interrupt,
  malformed-success, same-owner cancel, old-owner pending cancel, and old-owner
  active run window without a replacement provider side effect.
- Local-shell tests cover the loopback launcher epoch, stale GET without
  mutation, Refresh reconciliation, blocked/session-lost UI, route bounds,
  responsive behavior, and privacy canaries.
- A disposable real Codex 0.144.1 smoke completed same-owner start/cancel. Two
  bounded restart diagnostics then proved that a new app-server rejects resume
  for both an empty prepared thread and an active turn. All disposable
  processes and temporary directories were removed.
- The exact Builder tree passes 102 tests, the production Next.js build, and
  `git diff --check`; the dependency lockfile is unchanged.
- Independent review remains the only post-Builder acceptance step.

## Forbidden scope

- Cloud, remote intents, pairing, auth, billing, telemetry, notifications;
- shell strings, danger-full-access, approval escalation, automatic question
  answers, arbitrary app-server method relay;
- Claude Code or Gemini start/cancel;
- retry, reorder, revise, scheduling, attachments, daemon, watcher, desktop
  wrapper, installer, or new dependency.
