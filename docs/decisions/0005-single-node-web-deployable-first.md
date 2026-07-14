# ADR 0005: One Node/Next.js deployable before daemon or desktop extraction

Status: Accepted

Date: 2026-07-13

## Context

Patchfleet needs a local UI, server-side provider access, persistence, and
eventual background operation. Splitting these into services or adding a
desktop shell immediately would delay proof of the control loop.

## Decision

V0 begins as one Node.js/Next.js application with internal boundaries for UI,
runtime, adapters, storage, and Cloud sync. The current web shell is the product
surface.

A headless host or desktop wrapper is extracted only when boot-time reliability,
packaging, or OS integration produces a concrete requirement.

## Options considered

1. Separate daemon, API, web app, and desktop shell now: rejected as premature.
2. Browser-only application: rejected because provider observation and process
   control require trusted local server code.
3. One local Node/Next.js deployable: selected for the shortest complete path.

## Consequences

- Server-only modules must never enter browser bundles.
- Development hot reload must preserve single-writer guarantees.
- Later extraction should move boundaries, not redesign domain contracts.
