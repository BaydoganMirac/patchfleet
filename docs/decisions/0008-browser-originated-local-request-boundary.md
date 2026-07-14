# ADR 0008: Browser-originated local request boundary

Status: Accepted

Date: 2026-07-15

## Context

Patchfleet's first shell binds Next.js to IPv4 loopback and rejects browser
requests whose application-visible Host value is not `localhost` or
`127.0.0.1`. Independent review found that Node.js and Next.js may normalize or
redirect malformed raw HTTP forms before middleware runs, including duplicate
Host headers and absolute-form request targets.

Rejecting those forms before Next.js would require a custom HTTP server. The
approved slice forbids that extra server, has no sensitive projection or
mutation, and is designed to protect a browser surface rather than defend
against software already running on the host.

## Options considered

1. Add a custom HTTP server to inspect raw headers before Next.js: complete at
   the socket boundary, but adds a second server lifecycle for malformed forms
   browsers do not emit.
2. Remove Host validation: smallest code, but leaves the browser surface open
   to DNS rebinding through an untrusted Host value.
3. Keep loopback binding and application-visible Host validation, and define
   the V0 boundary as browser-originated requests: selected.

## Decision

The V0 local shell protects browser-originated requests by:

- listening only on `127.0.0.1`;
- accepting only `localhost` and `127.0.0.1`, with an optional valid port, in
  the Host value exposed to application middleware;
- rejecting other application-visible Host values;
- attaching the required security headers to responses produced by that
  middleware boundary.

Patchfleet does not add a custom server solely to reject duplicate Host headers
or absolute-form targets before Next.js. A process already running on the local
machine can send a valid allowed Host value, so raw-header filtering is not an
authorization boundary against local software.

## Consequences

- A browser DNS-rebinding request with an untrusted Host value is rejected.
- Tests cover allowed browser-style Host values, an untrusted Host value,
  malformed application-visible values, missing Host behavior, and required
  response headers.
- Raw protocol responses generated before middleware may not carry application
  security headers.
- Authentication and CSRF protection remain required before the first
  mutation; the threat model must be revisited before any non-loopback listener
  or untrusted content is introduced.
- If a supported deployment later requires raw socket-level policy, that
  concrete requirement may justify a custom server or local reverse proxy.

## References

- [Task card 0001](../plans/0001-secure-local-app-shell.md)
- [ADR 0005](0005-single-node-web-deployable-first.md)
- [Architecture](../architecture.md)
