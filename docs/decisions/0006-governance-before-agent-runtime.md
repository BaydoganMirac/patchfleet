# ADR 0006: Governance and team before agent runtime

Status: Accepted

Date: 2026-07-14

## Context

Patchfleet is initialized as a local Node.js/Next.js application, but no
provider or agent runtime exists yet. Multiple coding agents will contribute to
the product. Starting product runtime and parallel development before shared
rules and ownership exist would create incompatible contracts.

## Options considered

1. Implement the Codex runtime immediately: fastest visible code, but team rules
   and shared boundaries remain implicit.
2. Create a large permanent agent organization first: broad coverage, but most
   roles have no executable work.
3. Establish one canonical rule set, four task-triggered skills, then bootstrap
   a three-role development team: selected as the smallest controlled start.

## Decision

Keep the public product as one local Node.js/Next.js application. Defer product
agent runtime and Cloud infrastructure during the foundation change. Make the
Patchfleet development team bootstrap the next milestone, starting with a
coordinator, one builder, and one independent reviewer.

## Consequences

- AGENTS.md remains canonical for Claude, Codex, and Gemini development tools.
- Repo-local skills cover only provider adapters, local state, the Cloud
  boundary, and team task handoffs.
- Product code begins only from an approved bounded task card.
- Provider-specific and Cloud worker roles are added when their milestone has
  real work.

## Out of scope

- Provider adapter implementation.
- Local agent runtime implementation.
- Cloud authentication, storage, billing, or deployment.
- Permanent team sizing beyond the initial three roles.

## References

- [Agent operating model](../agent-operating-model.md)
- [Team task contract](../../.agents/skills/team-task-contract/SKILL.md)
- 2026-07-14 planning conversation
