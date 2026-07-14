# V0 foundation

Status: Done

Last updated: 2026-07-15

Baseline: reviewed secure local shell

## Summary

Patchfleet is initialized as the public local-first runtime and control console
for Claude Code, Codex, and Gemini CLI. Product, architecture, protocol,
roadmap, agent-collaboration, and first-slice contracts now exist. No runtime
feature beyond the Next.js shell has been implemented.

## Done

- Secure local app shell binds development and production to `127.0.0.1`,
  validates the Host header, and sets baseline browser security headers.
- Local console copy reports the foundation state without invented provider,
  runtime, Cloud, account, or billing data.
- Runnable boundary coverage verifies loopback commands, accepted and rejected
  Host values, and response security headers.
- Independent review passed the amended browser-originated request boundary,
  production smoke checks, build, dependency scope, and forbidden-scope audit.
- ADR 0008 records why raw HTTP handled before Next.js middleware is not a
  browser authorization boundary and does not justify a custom server.
- Public repository cloned and initialized with Next.js, React, TypeScript, and
  npm.
- Production build verified on the initial shell.
- Local/public versus private/Cloud ownership defined.
- V0 scope, technical success criteria, and non-goals documented.
- Host-to-Cloud data and command trust boundary documented.
- Initial architecture decisions recorded.
- First local read-only implementation slice specified.
- Canonical Claude, Codex, and Gemini development entry points established.
- Four repo-local skills added for provider adapters, local runtime state, the
  Cloud boundary, and team task handoffs.
- Product agent runtime explicitly deferred during foundation work.
- Public product and roadmap documents no longer expose pricing, detailed ICP,
  or the internal delivery sequence; the coordinator moved that context to the
  private sibling repository.
- Apache-2.0 licensing, private vulnerability reporting, and local secret/data
  ignore rules added.
- Public versus internal documentation ownership recorded in ADR 0007.
- Initial coordinator, builder, and independent reviewer workflow completed
  through a reviewed follow-up commit.
- First implementation scope drafted as
  [Task card 0001](../plans/0001-secure-local-app-shell.md).

## In progress

- None. Foundation work is complete.

## Next up

1. Continue through
   [V0 Codex observation](v0-codex-observation.md) and its Task card 0002.
2. Obtain owner approval for its exact files and acceptance criteria.
3. Start provider runtime only through that approved task.

## Blockers

- None.

## Open questions

- Should recent local session history default to 7 or 30 days?
- Which supported Codex interface is stable enough for session observation
  without parsing human-formatted terminal output?

## Decisions

- Local runtime is public and complete without Cloud.
- Cloud is private, optional, and receives sanitized projections only.
- Launch providers are Claude Code, Codex, and Gemini CLI.
- Codex proves the first adapter contract; the other two follow.
- V0 starts as one Node/Next.js deployable.
- Shared rules and the three-role development team precede product agent
  runtime implementation.
- Public technical trust contracts and internal product strategy live in
  separate repositories.
- The local shell protects browser-originated requests; it does not add a
  custom server for malformed raw HTTP handled before Next.js middleware.

## Session log

### 2026-07-15

- Implemented Task card 0001 as a dependency-free loopback-only Next.js shell
  with fail-closed Host validation, required security headers, honest UI copy,
  and a runnable boundary test.
- Independent review found raw HTTP forms normalized before Next.js
  middleware. The owner approved the browser-originated boundary in ADR 0008
  instead of adding a custom server that would not authorize local processes.
- Independent re-review passed Task card 0001 with no remaining findings;
  foundation work is complete and the worktree is clean.
- Replaced the unpublished multi-commit public history with one clean root
  commit after explicit owner approval.
- Confirmed that removed internal pricing and ICP content is unreachable from
  the public branch.
- Drafted Task card 0001 for a loopback-only, dependency-free local app shell;
  implementation was then explicitly approved by the owner.

### 2026-07-14

- Completed the initial coordinator, builder, and independent reviewer
  bootstrap with disjoint ownership and a reviewed correction cycle.
- Independent review passed current-tree license, link, and secret checks; the
  first public push remains blocked on clean history.
- Added Apache-2.0 licensing and private vulnerability reporting.
- Removed pricing, detailed ICP, and internal delivery sequencing from the
  public product surface.
- Recorded the public/internal documentation boundary in ADR 0007.
- Confirmed the public product remains a local Node.js/Next.js application.
- Added canonical cross-tool rules and four repo-local skills.
- Deferred product agent runtime and made team bootstrap the next milestone.

### 2026-07-13

- Initialized the repository and verified a production build.
- Converted prior Agent Console learning into standalone Patchfleet contracts,
  ADRs, roadmap, and the first implementation plan.
