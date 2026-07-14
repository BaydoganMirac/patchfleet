# ADR 0002: Small capability-aware provider adapters

Status: Accepted

Date: 2026-07-13

## Context

Claude Code, Codex, and Gemini CLI expose different session, control, and
question semantics. A large universal interface would either leak provider
details everywhere or invent capabilities that do not exist.

## Decision

Provider-specific discovery, invocation, and parsing stay behind adapters. The
shared contract begins with probe and observe, then grows only when two real
providers prove a shared need. Every adapter reports capabilities, and the UI
shows only supported actions.

Codex is the first reference implementation. Claude Code and Gemini CLI follow
against a shared conformance suite before V0 is provider-complete.

## Options considered

1. Provider logic directly in screens and routes: rejected because behavior
   would fork across the application.
2. Large plugin SDK before implementations: rejected as speculative.
3. Small internal adapters with capability discovery: selected as the minimum
   stable boundary.

## Consequences

- Provider-native differences remain explicit.
- Shared contract changes require integration-owner review.
- A public third-party plugin SDK is deferred until external demand exists.
