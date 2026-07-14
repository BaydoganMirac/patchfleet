---
name: provider-adapters
description: Build or modify Patchfleet integrations for Claude Code, OpenAI Codex, Gemini CLI, or future coding-agent providers. Use whenever provider discovery, availability, session observation, lifecycle normalization, capabilities, provider process invocation, or adapter conformance changes.
---

# Provider adapters

Keep provider differences behind the smallest contract proven by real
implementations.

## Read first

1. [Architecture](../../../docs/architecture.md)
2. [Provider adapter decision](../../../docs/decisions/0002-provider-adapters.md)
3. The active plan and feature state

## Workflow

1. Trace the provider's supported machine-readable interface and every existing
   adapter caller.
2. Reuse the current shared contract. Do not widen it for one provider.
3. Keep discovery, process invocation, parsing, timeouts, and native identifiers
   inside the provider adapter.
4. Return normalized data only after validating provider output.
5. Report unsupported behavior through capability flags. Do not emulate a
   capability or render a control that cannot work.
6. Preserve provider-native fields locally only when required for a concrete
   behavior. Do not copy arbitrary native payloads into shared state.
7. Add the smallest conformance check covering available, unavailable,
   malformed, timeout, active, and terminal behavior relevant to the change.

## Contract ceiling

The first shared surface is probe and observe. Add control operations only when
an approved plan reaches local control and at least two providers demonstrate
the same semantic need.

Prefer a provider-supported API or structured output. If only human-formatted
output exists, stop and record the stability risk before building a parser.

## Data boundary

Never normalize raw prompts, responses, reasoning, transcripts, source, diffs,
terminal output, tokens, credentials, environment variables, or absolute paths.
Read [cloud-boundary](../cloud-boundary/SKILL.md) before any adapter field enters
a Cloud projection.

## Done

- Keep UI, storage, and Cloud imports out of the adapter.
- Keep shared contract changes coordinator-owned.
- Pass provider-specific checks and the shared conformance check.
- Update feature state and record any non-obvious contract change as an ADR.
