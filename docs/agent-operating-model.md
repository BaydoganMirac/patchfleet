# Agent operating model

Status: working collaboration contract

Updated: 2026-07-16

## Recommendation now

Phase 1 and the initial team bootstrap are complete. Keep one coordinator, one
bounded Builder, and one independent Reviewer for Phase 2. Start with durable
local work intake; do not create a Cloud role until local control is useful.

## Initial team

- Coordinator: owns product scope, shared contracts, task cards, integration,
  and final user handoff.
- Builder: owns one approved implementation slice with exact file boundaries.
- Reviewer: inspects the builder's stable commit for acceptance, durability,
  security, and scope.

The team bootstrap is complete when all three roles understand the same
AGENTS.md, applicable skills, file ownership, and stop conditions. Product code
starts only through an approved task card.

## When to add agents

### Phase 1A: one implementation owner

The builder owns the shared domain, local persistence, Codex adapter, and first
dashboard slice. The reviewer starts after the builder produces a stable local
commit.

### Phase 1B: bounded provider parallelism

After Codex passes the conformance harness:

- Claude adapter agent: provider folder plus adapter-specific tests only.
- Gemini adapter agent: provider folder plus adapter-specific tests only.
- Integration owner: shared contract and UI changes; resolves real differences
  rather than allowing adapters to widen the interface independently.

### Phase 2: runtime and UI split

If the files and tests now have stable ownership:

- Runtime agent: events, projections, queue, command application.
- Console agent: local screens and interaction states.
- QA agent: recovery, idempotency, cross-provider conformance, and security.

### Phase 3 and later: Cloud owner

Only after local control is useful:

- Cloud agent: private repository only.
- Protocol owner: public contract plus cross-repo contract tests.
- Security reviewer: pairing, authorization, redaction, revocation, and replay.

## Rules for every agent

- Receive one bounded task with owned files and explicit acceptance criteria.
- Read AGENTS.md, the active plan, relevant ADRs, and state before editing.
- Do not push, merge, deploy, publish, or migrate.
- Do not change shared schemas from a provider branch.
- Do not edit another active agent's files without coordination.
- Commit locally with a focused message and report tests plus remaining risks.
- Update state at handoff.
- Stop when repository behavior contradicts the product or protocol contract.

## Task card template

Each delegated task should specify:

- Objective: one observable outcome.
- Owned files: exact directories or files.
- Inputs: contracts and fixtures that must not be changed.
- Acceptance: commands and behavior that prove completion.
- Forbidden scope: adjacent work the agent must not absorb.
- Handoff: state file, local commit, tests, and open risks.

## Suggested next agent task

Objective: implement the smallest durable local work-intake queue after its
task card is approved.

Owned scope:

- one local WorkItem contract;
- append-only queue events and a rebuildable projection;
- create, list, and remove interactions;
- restart recovery and idempotency checks.

Forbidden scope:

- provider process launch or cancellation;
- Cloud pairing, sync, or remote commands;
- queue reordering, retries, or questions;
- desktop packaging;
- authentication and billing.

This starts only after the owner approves the Phase 2 task card.
