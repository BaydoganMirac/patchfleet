# ADR 0010: Supported provider observation surfaces and lifecycle ingress

Status: Proposed

Date: 2026-07-16

## Context

The Codex reference adapter observes a pull-based JSON snapshot. Claude Code
and Gemini CLI do not expose the same supported surface.

Claude Code 2.1.170 exposes `claude agents --json --all`. The command returns
structured Agent View metadata for live sessions and retained background
sessions. It is not a complete history of every interactive Claude session.

Gemini CLI 0.43.0 exposes `--list-sessions`, but that command is human-facing,
includes a prompt preview, and may generate and persist missing summaries while
listing. Its JSON output modes apply to headless prompts, not session listing.
Gemini lifecycle hooks are structured, but they require explicit configuration
and carry forbidden values such as prompts, responses, working directories,
and transcript paths alongside the small lifecycle facts Patchfleet needs.

Gemini hooks also do not provide the original creation time of a resumed
session. Treating the hook receipt time or a resume event as session creation
would invent provider history.

## Decision

### Claude Code

The first Claude adapter may invoke only:

- `claude --version` for a bounded availability probe;
- `claude agents --json --all` for a bounded read-only Agent View snapshot.

It may normalize only validated identifiers, `startedAt`, and documented
lifecycle state. It must discard cwd, names, summaries, process identifiers,
waiting details, and every unapproved field before returning.

The normalized contract does not gain `waiting` from one provider. Claude's
documented `blocked` state becomes `unknown` until another provider proves the
same shared semantic or the Question domain owns it explicitly.

### Gemini CLI

Patchfleet will not execute or parse `gemini --list-sessions`. It will not use
ACP, headless prompt execution, transcript files, or process inspection to
simulate read-only cross-client discovery.

The first Gemini integration is an opt-in command-hook decoder. The decoder
selects only session id, lifecycle event name, and event timestamp from stdin,
discards all other input, emits no raw diagnostics, and returns an empty JSON
object to Gemini. Hook installation is a separate owner-approved mutation task.

### Provider-neutral lifecycle ingress

Add one small ephemeral lifecycle-signal contract before the Gemini decoder:

- schema version;
- provider id;
- opaque provider session id;
- normalized lifecycle status;
- observation timestamp.

It contains no provider creation time, path, prompt, response, transcript,
tool, token, environment, or native payload. A provider decoder returns the
signal; only the existing local runtime's single writer may later turn it into
durable events. The hook decoder does not create a second log or projection.

At the provider-neutral observation boundary, `createdAt` becomes nullable.
`null` means the provider did not supply a trustworthy original creation time.
Patchfleet must not substitute first-observed or receipt time. Codex and Claude
continue to supply validated provider creation timestamps.

The current Codex production normalizer, store, and dashboard remain unchanged
until both provider proofs exist. A later integration-owner task will
generalize those seams from the real adapters and migrate persisted data only
if the proven shapes require it.

## Options considered

1. Parse both providers' session-history files or human output: rejected as
   private, unstable, or sensitive.
2. Run provider prompts through headless or ACP modes: rejected because that
   starts or owns work instead of observing work from other clients.
3. Install hooks automatically during adapter discovery: rejected because it
   silently mutates user configuration and executes Patchfleet in every
   provider session.
4. Use supported Claude JSON and an explicit Gemini hook ingress behind one
   minimal lifecycle contract: selected as the smallest honest boundary.

## Consequences

- Claude Agent View sessions can be observed without reading Claude's private
  daemon, job, or transcript files.
- Gemini observation requires explicit setup and observes only future hook
  events; no historical inventory is promised.
- Gemini cannot honestly claim failed or interrupted lifecycle when the CLI
  emits no corresponding hook.
- A resumed Gemini session may have `createdAt: null` while still carrying an
  exact last-observed time.
- Provider setup, ingestion transport, persistence, and UI integration remain
  separate approval-gated work.

## References

- [Claude Code Agent View](https://code.claude.com/docs/en/agent-view)
- [Claude Code hooks](https://code.claude.com/docs/en/hooks)
- [Gemini CLI hook reference](https://geminicli.com/docs/hooks/reference/)
- [Gemini CLI configuration](https://geminicli.com/docs/reference/configuration/)
- [Gemini CLI v0.43.0 session listing source](https://github.com/google-gemini/gemini-cli/blob/v0.43.0/packages/cli/src/utils/sessions.ts)
- [Gemini CLI v0.43.0 summary source](https://github.com/google-gemini/gemini-cli/blob/v0.43.0/packages/core/src/services/sessionSummaryUtils.ts)
- [ADR 0002](0002-provider-adapters.md)
- [Task card 0004](../plans/0004-provider-lifecycle-contract.md)
