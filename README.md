# Patchfleet

Your coding agents. One command center.

Patchfleet is the public, local-first runtime and control console for Claude
Code, OpenAI Codex, Gemini CLI, and future coding agents. It keeps canonical
execution state on the developer machine and remains useful without a cloud
account.

Patchfleet Cloud is an optional private SaaS that receives only sanitized
operational projections and sends allowlisted command intents back to a paired
local installation.

## Current status

The secure local-only application shell, public trust contracts, and
contributor rules are initialized. Provider observation and controls are not
implemented yet.

Start with [the documentation map](docs/README.md) before changing code.

## Development

    npm install
    npm run dev

The local app runs at http://127.0.0.1:3000 and accepts only `localhost` or
`127.0.0.1` Host values. To verify the boundary:

    npm test
    npm run build
    npm run start

## Product boundaries

- Local execution is canonical.
- Cloud is optional and cannot execute shell commands.
- Model subscriptions and credentials remain user-owned and local.
- Source code, diffs, prompts, transcripts, paths, and secrets are not uploaded
  by default.
- Provider-specific behavior stays behind small adapters.

## License

Patchfleet is licensed under the [Apache License 2.0](LICENSE).

Report vulnerabilities privately through the [security policy](SECURITY.md).
