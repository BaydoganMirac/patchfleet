# Architecture decision records

Accepted records are append-only. If a decision changes, add a new ADR that
supersedes the old one.

| ADR | Status | Decision |
|---|---|---|
| [0001](0001-local-first-public-runtime-private-cloud.md) | Accepted | Public local runtime with optional private Cloud |
| [0002](0002-provider-adapters.md) | Accepted | Small capability-aware provider adapters |
| [0003](0003-sanitized-projections-and-durable-intents.md) | Accepted | Sanitized outbound projections and durable inbound intents |
| [0004](0004-append-only-local-events.md) | Accepted | Append-only local events with derived projections |
| [0005](0005-single-node-web-deployable-first.md) | Accepted | One Node/Next.js deployable before daemon or desktop extraction |
| [0006](0006-governance-before-agent-runtime.md) | Accepted | Establish shared rules and a small development team before runtime implementation |
| [0007](0007-public-and-internal-document-boundary.md) | Accepted | Keep public technical trust contracts separate from internal product and Cloud context |
| [0008](0008-browser-originated-local-request-boundary.md) | Accepted | Protect the local browser surface without a custom raw HTTP server |
| [0009](0009-codex-observation-uses-supported-app-server-metadata.md) | Accepted | Observe only supported Codex lifecycle metadata and preserve unknown state |
| [0010](0010-supported-provider-observation-surfaces.md) | Accepted | Use supported Claude JSON and opt-in Gemini hooks behind a minimal lifecycle ingress |
| [0011](0011-multi-provider-observation-projection.md) | Accepted | Project the three provider observations together before adding Gemini hook ingress |
