# Agent teams feature state

Status: Done

Last updated: 2026-07-20

## Approved outcome

Patchfleet ships ready declarative agents, owner-composed local teams, a bounded
Codex-backed orchestrator, sanitized Cloud supervision, and the surrounding SaaS
product and operating controls.

## Delivered

1. Declarative agent pack contract, built-in catalog, local registry, tests, and
   product surfaces.
2. Durable team/task graph, scheduler, approval/question/cancel/retry paths, and
   tests.
3. Capability-negotiated protocol V2 plus Cloud projections, controls, and
   paired tests.
4. SaaS release, lifecycle, notification, history, support, legal, and optional
   Paddle entitlement surfaces.
5. Local unit, HTTP, package, build, protocol, and responsive UI verification;
   Cloud unit, build, paired-protocol, security-boundary, responsive UI, and
   disposable PostgreSQL migration/tenant-isolation/retention verification.
   Live migration and production receipt evidence remain owner-operated because
   they require the verified backup and deployment credentials.

## Completion rule

Both repositories must keep unit, integration, build, package, paired-protocol,
security-boundary, and responsive UI checks green. Live database migration and
operations that require owner secrets are explicit release evidence rather
than silently claimed.
