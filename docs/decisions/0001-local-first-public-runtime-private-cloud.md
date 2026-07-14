# ADR 0001: Local-first public runtime and optional private Cloud

Status: Accepted

Date: 2026-07-13

## Context

Patchfleet must be trusted with coding-agent operations while remaining easy
for solo builders to adopt. Execution state, provider credentials, prompts, and
repositories are sensitive. Remote visibility and control still provide paid
convenience.

## Decision

The public Patchfleet repository owns the complete local runtime, local UI,
canonical events, provider adapters, command application, and public protocol.
It works without an account.

Patchfleet Cloud remains a separate private repository. It owns authentication,
sanitized projections, remote intent delivery, notifications, retention, and
billing. It cannot execute work directly or become canonical for local runs.

## Options considered

1. Cloud-only execution: rejected because it weakens privacy, increases cost,
   and makes local provider subscriptions harder to use.
2. One public monorepo including Cloud: rejected because it couples the
   proprietary SaaS to the local trust surface and complicates licensing.
3. Public local runtime plus optional private Cloud: selected because local
   usefulness drives adoption while remote convenience supports a small
   subscription.

## Consequences

- A versioned cross-repo protocol is required.
- Cloud outages cannot block local work.
- Some domain contracts are public even when their Cloud implementation is
  private.
- Cross-repo changes need contract tests and coordinated releases.
