# Patchfleet public roadmap

Status: active

Updated: 2026-07-16

This roadmap describes public technical direction, not dates or commercial
commitments.

## Now

- Keep the completed Phase 1 three-provider observation loop and completed
  Phase 2 durable Codex control loop stable.
- Keep the local/Cloud trust contract and contributor rules reviewable.
- Validate the local queue, receipts, restart behavior, and same-boot Codex
  control with real users before broadening provider control.

## Next

- Approve a Phase 3 pairing and threat-model plan before Cloud implementation.
- Pair with optional Patchfleet Cloud through outbound HTTPS, then publish only
  an allowlisted operational projection.
- Add typed, validated remote intents only after pairing, revocation, replay,
  authorization, and receipt contract tests pass.
- Generalize execution control to Claude Code or Gemini only after a provider
  proves an equally safe supported lifecycle surface.

## Later

- Harden macOS and Windows install, upgrade, background-host, and recovery
  paths.
- Add team capabilities when real multi-user demand defines them.
- Consider a desktop shell, provider SDK, or self-hosted Cloud only when the
  web-first product proves a concrete need.

Patchfleet remains useful without Patchfleet Cloud throughout every stage.
