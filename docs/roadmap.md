# Patchfleet public roadmap

Status: active

Updated: 2026-07-14

This roadmap describes public technical direction, not dates or commercial
commitments.

## Now

- Keep the local/Cloud trust contract and contributor rules reviewable.
- Bootstrap the coordinator, builder, and independent reviewer workflow.
- Begin product code only from an approved task card.
- Build a local read-only view with one real Codex adapter, durable observation
  state, restart recovery, and a small conformance check.

## Next

- Add Claude Code and Gemini CLI through the proven adapter contract.
- Add a durable local work queue and capability-aware controls.
- Pair with optional Patchfleet Cloud through outbound HTTPS.
- Publish only allowlisted operational projections and apply only typed,
  validated remote intents.

## Later

- Harden macOS and Windows install, upgrade, background-host, and recovery
  paths.
- Add team capabilities when real multi-user demand defines them.
- Consider a desktop shell, provider SDK, or self-hosted Cloud only when the
  web-first product proves a concrete need.

Patchfleet remains useful without Patchfleet Cloud throughout every stage.
