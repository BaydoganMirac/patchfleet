# V0 closed alpha readiness

Status: Done

Last updated: 2026-07-17

## Done

- Owner approved Phase 4 completion.
- Locked the cross-repository master plan and public Task 0012.
- Accepted ADR 0016 for npm CLI packaging before a desktop shell.
- Selected the existing V1 paired loop as the release smoke; no new remote
  intent is included.
- Added the public npm CLI package with idempotent start, exact process-health
  status/stop, deterministic recovery, user-profile data, and packaged Gemini
  lifecycle ingress.
- Added macOS/Windows CI, relocatable build sanitization, reviewed tarball
  contents, and a clean install smoke through npm's generated executable.
- Completed the private production foundation with Supabase owner auth,
  hardened SSR cookies, transactional PostgreSQL state, checksummed explicit
  migrations, Vercel configuration contract, and deployment runbook.
- Passed 130/130 public tests, both production builds, public package smoke,
  Cloud unit/contract tests, real PostgreSQL concurrency/reconnect/tamper
  smoke, cross-repository paired HTTP smoke, diff checks, secret/path scans,
  and zero-vulnerability npm audits.
- Completed security review with no unresolved P0-P2 finding.

## In progress

- None.

## Next up

1. Owner reviews the two local commits and creates the isolated hosted
   Supabase/Vercel resources when ready.
2. Apply the checked-in migration explicitly, deploy, and invite the first
   one-to-three closed-alpha users as a separate release action.
3. Use alpha evidence before considering signed native installers or another
   remote command.

## Blockers

- None. Hosted project creation, secrets, migration application, and deployment
  remain owner-operated release actions outside Phase 4.

## Open questions

- Signed native installers and OS login startup wait for closed-alpha evidence.
