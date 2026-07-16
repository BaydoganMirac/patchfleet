# Phase 4: Closed Alpha Readiness

Status: Complete

Owner: Patchfleet coordinator

Approved by owner: 2026-07-17

Updated: 2026-07-17

## Outcome

An invited owner can install the public Patchfleet tarball on a clean Node 20+
macOS or Windows environment, start and recover the local host without a source
checkout, authenticate to a deploy-ready private Cloud, pair, observe, cancel,
receipt, revoke, and keep working through Cloud failure.

## Delivery sequence

1. [Task 0012](0012-public-installable-host.md) packages the existing local
   deployable behind a minimal cross-platform CLI.
2. The private Cloud production-foundation plan replaces deploy-time static
   owner auth and file persistence with Supabase Auth and transactional
   Postgres while preserving the exact public V1 protocol.
3. Package, database, production-build, and cross-repository HTTP smokes prove
   the release candidate before closure.

## Locked scope

- npm tarball and `patchfleet start|stop|status|recover`;
- private per-user data, runtime metadata, and log paths;
- stale-process detection and deterministic projection recovery;
- Supabase password authentication for one pre-created owner;
- Supabase Postgres transaction-pooler runtime storage;
- Vercel-ready Next.js deployment and documented secret/config contract;
- development-only owner-token and file-store fallback for offline tests;
- no public protocol change.

## Done gate

- `npm pack` contains the production app, CLI, Gemini extension, and no tests,
  local state, secrets, or repository metadata.
- A clean prefix install can start, report status, stop, and recover from the
  durable event log without losing canonical state.
- Production mode refuses static owner-token auth and file persistence.
- Auth sessions are validated by Supabase and restricted to the configured
  owner user ID.
- Every Postgres mutation locks one workspace row in a real transaction;
  concurrent writers cannot lose an acknowledged mutation.
- Host authorization, redaction, replay, expiry, revision, revocation, and
  receipt tests remain green without widening V1.
- Public and private tests, production builds, package smoke, Postgres smoke,
  and cross-repository HTTP smoke pass.
- No unresolved P0-P2 review finding remains.
- Commits stay local; no package publish, migration apply to a hosted database,
  production resource creation, push, or deployment occurs.

## Deferred

- remote question answering, enqueue, queue editing, and additional providers;
- billing, notifications, retention history, teams, and entitlements;
- OS login startup, signed installers, Electron/Tauri, and auto-update;
- actual Supabase/Vercel project creation and DNS configuration.

## Completion evidence

- Public tests passed 130/130 and the final production build passed.
- A packed clean global-prefix install used npm's real executable shim and
  passed `start`, `status`, `stop`, and deterministic `recover`.
- The package contains no repository metadata, test suite, environment file,
  secret, or machine-specific absolute build path.
- Cloud unit/contract tests and production build passed with zero audited npm
  vulnerabilities.
- A pinned PostgreSQL 16 smoke applied the migration twice, preserved 12
  concurrent mutations, survived reconnect, verified migration checksum, and
  rejected a tampered stored state.
- The real cross-repository HTTP smoke passed pair, sanitized projection,
  cancel receipt, revocation, authorization denial, and Cloud outage.
- Security review found and fixed the SSR-cookie and build-path issues; no
  unresolved P0-P2 finding remains.
- No package was published, hosted migration applied, resource created, branch
  pushed, or deployment performed.
