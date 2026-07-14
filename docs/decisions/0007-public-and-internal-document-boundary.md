# ADR 0007: Public and internal document boundary

Status: Accepted

Date: 2026-07-14

## Context

Patchfleet is an open-source local application paired with an optional private
Cloud product. Public technical contracts make local behavior and the Cloud
trust boundary auditable, but pricing research, customer segmentation, internal
delivery plans, and private Cloud implementation details are not required to
build or trust the local product. Runtime user data is more sensitive than
either repository and must not be committed.

## Options considered

1. Publish all product and Cloud context: simplest documentation layout, but it
   exposes internal strategy without improving technical trust.
2. Keep all documentation private: protects strategy, but leaves contributors
   unable to verify the local product and its data boundary.
3. Publish local product and protocol contracts while keeping internal strategy
   and Cloud internals private: selected as the smallest useful boundary.

## Decision

The public repository owns:

- local product code and contributor rules;
- the public host-to-Cloud protocol;
- security and data-classification rules;
- public architecture decisions and technical roadmap.

The private repository owns:

- pricing and customer-segmentation hypotheses;
- customer research and internal delivery plans;
- private Cloud application, infrastructure, and operational details.

Provider credentials, source code under management, prompts, transcripts,
terminal output, absolute paths, and canonical runtime state stay on the user
machine and belong in neither repository.

## Consequences

- Contributors can audit what Patchfleet sends and accepts without access to
  the private Cloud code.
- Public product and roadmap documents omit internal commercial strategy.
- Cross-cutting protocol or security decisions remain public even when the
  Cloud implementation is private.
- Internal plans may reference public contracts, but must not duplicate or
  silently redefine them.

## Out of scope

- Selecting Cloud prices, plans, retention, or launch dates.
- Defining the private Cloud source layout.
- Changing the runtime data policy or protocol payloads.
- Moving user runtime data into either repository.

## References

- [Product brief](../product.md)
- [Architecture](../architecture.md)
- [Host-to-Cloud protocol](../protocol.md)
- [Security policy](../../SECURITY.md)
