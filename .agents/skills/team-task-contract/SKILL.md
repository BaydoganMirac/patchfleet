---
name: team-task-contract
description: Create, delegate, review, or hand off work for the Patchfleet development agent team. Use whenever spawning subagents, defining team roles, splitting parallel work, assigning owned files, preparing a task card, reviewing another agent's commit, or updating a cross-agent handoff.
---

# Team task contract

Use the smallest team that gives independent ownership and review.

## Read first

1. [Agent operating model](../../../docs/agent-operating-model.md)
2. [Governance before runtime decision](../../../docs/decisions/0006-governance-before-agent-runtime.md)
3. The active plan and feature state
4. Applicable ADRs and domain skills

## Initial team

Start with three roles:

- Coordinator: owns product scope, plans, shared contracts, integration, and
  final handoff.
- Builder: owns one approved implementation slice.
- Reviewer: independently checks acceptance, durability, security, and scope
  after a builder commit exists.

Do not create Cloud, provider-specific, release, or specialist roles before
their milestone has executable work.

## Task card

Give every worker:

- Objective: one observable outcome.
- Owned files: exact files or directories.
- Inputs: contracts and fixtures it must not change.
- Acceptance: runnable checks and expected behavior.
- Forbidden scope: adjacent work it must not absorb.
- Handoff: local commit, tests, state update, and remaining risks.

Reject a task that lacks owned files or an observable acceptance condition.

## Coordination

- Keep concurrent file ownership disjoint.
- Reserve AGENTS.md, shared domain schemas, protocol, roadmap, and ADR indexes
  for the coordinator unless explicitly delegated.
- Let provider workers change only their adapter and provider-specific checks.
- Do not let a worker push, merge, deploy, publish, or migrate.
- Treat commits from another worker as immutable inputs.
- Route contract conflicts back to the coordinator; do not let workers widen
  shared abstractions independently.

## Handoff

Require the worker to report:

- commit hash and subject;
- checks run and outcomes;
- files changed;
- unresolved risks or blockers;
- updated feature state.

Start the reviewer only when there is a stable artifact to inspect. Close idle
or speculative roles instead of keeping a permanent swarm.
