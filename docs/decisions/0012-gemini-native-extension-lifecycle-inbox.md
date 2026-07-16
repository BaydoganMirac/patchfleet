# ADR 0012: Gemini native extension with sanitized lifecycle inbox

Status: Proposed

Date: 2026-07-16

## Context

Gemini CLI lifecycle hooks are the supported structured observation surface,
but their stdin also contains prompts, responses, working directories, and
transcript paths. Patchfleet already has a strict decoder that returns only a
provider-neutral lifecycle signal, and the local runtime already has one
durable event writer.

Hook setup must be explicit and reversible. Directly editing
`~/.gemini/settings.json` would make Patchfleet responsible for preserving an
arbitrary user-owned settings document. A loopback HTTP ingress would add a
port, authentication token, and server-availability dependency.

Gemini CLI 0.43.0 natively supports linked extensions, extension-owned hooks,
JSON extension listing, and extension uninstall. A linked extension also lets
the current source-run V0 reuse the existing decoder without copying it.

## Decision

### Setup ownership

Ship one checked-in `patchfleet-gemini` extension. The owner explicitly links
or removes it with Gemini CLI's native commands:

```text
gemini extensions link extensions/patchfleet-gemini
gemini extensions uninstall patchfleet-gemini
```

Patchfleet does not read or write the user's Gemini settings file. Gemini CLI
owns extension registration, enablement, consent, precedence, and removal.
There is no browser mutation endpoint in this task.

The extension registers only `SessionStart`, `BeforeAgent`, and `AfterAgent`.
It does not register `SessionEnd`, because the proven decoder returns no
lifecycle transition for that best-effort event.

### Sanitized ingress

The hook command:

1. reads bounded stdin;
2. calls the existing Gemini decoder;
3. writes only the validated five-field lifecycle signal as one atomic,
   owner-readable inbox file;
4. emits exactly `{}` to stdout;
5. emits no raw stderr and never blocks Gemini when Patchfleet ingestion fails.

Raw hook input never enters the inbox, event log, projection, diagnostic, or
Cloud boundary. Unique files avoid competing hook processes mutating one
shared queue file.

For the source-run V0, both processes resolve the same data directory without
using the Gemini workspace cwd: `PATCHFLEET_DATA_DIR` wins when explicitly set;
otherwise the hook resolves the checked-out Patchfleet root from its own real
module path and uses the repository-local `.patchfleet` directory already used
by the web runtime. The inbox is a child of that data directory. This
source-layout coupling is removed later by packaging, not hidden in a new path
abstraction now.

### Single-writer persistence

Manual refresh drains complete inbox files through the existing serialized
event writer. The runtime validates every signal again, treats an already
persisted identical signal as an idempotent retry, and removes an inbox file
only after its durable append succeeds.

Existing event meanings remain unchanged. Gemini `AfterAgent` may update the
session status to `completed`, but it does not create a `session.terminal`
event or a terminal timestamp because it proves completion of one agent turn,
not CLI process exit. `SessionStart` and first-seen resumed sessions keep
`createdAt: null`.

When the native extension is active, a bounded JSON extension-status probe
marks Gemini hook observation available and preserves the latest 20
hook-observed sessions across version refreshes. Empty output or an empty list
means the extension is not installed; missing, inactive, malformed, or
unavailable setup remains a safe degraded observation.

## Options considered

1. Merge user `settings.json` directly: rejected because Patchfleet would own
   an arbitrary user document and its formatting, conflicts, and rollback.
2. POST hook input to a loopback API: rejected for V0 because it requires the
   web server, port discovery, and a new local credential boundary.
3. Append hook events directly to `events.jsonl`: rejected because separate
   hook processes would bypass the single writer.
4. Use a native linked extension and a sanitized file-per-signal inbox:
   selected as the smallest offline-safe and reversible source-run design.

## Consequences

- The owner sees Gemini CLI's native extension consent prompt and can remove
  Patchfleet without repairing a settings document.
- Hooks can record sanitized signals while the Patchfleet web process is down;
  the dashboard updates on the next manual refresh.
- V0 remains one Next.js deployable with no daemon, watcher, HTTP ingress,
  dependency, or second canonical log.
- The linked extension depends on the source checkout remaining in place. A
  packaged release must replace `link` with a self-contained installed
  extension; that packaging work is deliberately deferred.
- If no future hook signal arrives, the dashboard can only show the last
  explicitly observed lifecycle state and timestamp; it does not infer liveness.

## References

- [Gemini CLI hooks](https://geminicli.com/docs/hooks/reference/)
- [Gemini CLI extension reference](https://geminicli.com/docs/extensions/reference/)
- [ADR 0004](0004-append-only-local-events.md)
- [ADR 0010](0010-supported-provider-observation-surfaces.md)
- [ADR 0011](0011-multi-provider-observation-projection.md)
- [Task card 0006](../plans/0006-gemini-cli-hook-observation.md)
