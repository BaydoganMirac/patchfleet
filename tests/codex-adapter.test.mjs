import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { observeCodex, probeCodex } from "../lib/providers/codex.mjs";

const NOW = new Date("2026-07-15T12:00:00.000Z");
const CANARIES = [
  "CANARY_PROMPT",
  "CANARY_TRANSCRIPT",
  "CANARY_TOOL_OUTPUT",
  "/private/CANARY_PATH",
];

async function fakeCodex(mode) {
  const directory = await mkdtemp(join(tmpdir(), "patchfleet-codex-"));
  const command = join(directory, "codex");
  const marker = join(directory, "marker");
  const source = `#!/usr/bin/env node
const fs = require("node:fs");
const readline = require("node:readline");
const mode = ${JSON.stringify(mode)};
const marker = ${JSON.stringify(marker)};
if (process.argv.includes("--version")) {
  if (mode === "probe-timeout") setInterval(() => {}, 1000);
  else if (mode === "probe-failed") process.exit(2);
  else if (mode === "bad-version") console.log("unsupported output");
  else console.log("codex-cli 1.2.3");
} else {
  fs.appendFileSync(marker, "start\\n");
  process.on("SIGTERM", () => { fs.appendFileSync(marker, "stop\\n"); process.exit(0); });
  const send = (value) => process.stdout.write(JSON.stringify(value) + "\\n");
  const threads = [
    { id: "active-id", status: { type: "active", activeFlags: [] }, turns: [] },
    { id: "turn-running-id", status: { type: "idle" }, turns: [{ status: "inProgress", items: [] }] },
    { id: "completed-id", status: { type: "idle" }, turns: [{ status: "completed", completedAt: 1700000100, items: [{ text: "CANARY_TRANSCRIPT" }] }] },
    { id: "failed-id", status: { type: "idle" }, turns: [{ status: "failed", completedAt: 1700000200, error: { message: "CANARY_TOOL_OUTPUT" } }] },
    { id: "interrupted-id", status: { type: "idle" }, turns: [{ status: "interrupted", completedAt: null }] },
    { id: "unknown-id", status: { type: "notLoaded" }, turns: [] },
    { id: "stale-active-id", status: { type: "active", activeFlags: [] }, turns: [{ status: "completed", completedAt: 1700000300 }] },
    ...(mode === "lifecycle" ? [{ id: "system-error-id", status: { type: "systemError" }, turns: [] }] : []),
  ].map((thread) => ({
    ...thread,
    createdAt: 1700000000,
    preview: "CANARY_PROMPT",
    cwd: "/private/CANARY_PATH",
    path: "/private/CANARY_PATH",
    name: "CANARY_PROMPT",
    gitInfo: { branch: "CANARY_PROMPT" },
    source: { type: "cli" },
  }));
  readline.createInterface({ input: process.stdin }).on("line", (line) => {
    if (mode === "app-timeout") return;
    const message = JSON.parse(line);
    if (mode === "invalid-json") return process.stdout.write("not-json\\n");
    if (message.method === "initialized") return;
    if (message.method === "initialize") {
      if (mode === "method-error") return send({ id: message.id, error: { message: "CANARY_PROMPT" } });
      return send({ id: message.id, result: mode === "malformed" ? null : { userAgent: "CANARY_PATH" } });
    }
    if (message.method === "thread/list") {
      const valid = message.params.limit === 20 && message.params.archived === false &&
        message.params.sortKey === "recency_at" && message.params.sortDirection === "desc" &&
        JSON.stringify(message.params.sourceKinds) === JSON.stringify(["cli", "vscode", "exec", "appServer"]);
      if (!valid || mode === "list-error") return send({ id: message.id, error: { message: "CANARY_PROMPT" } });
      if (mode === "malformed-list") return send({ id: message.id, result: { data: "CANARY_PROMPT" } });
      return send({ id: message.id, result: { data: threads } });
    }
    if (message.method === "thread/read") {
      if (!message.params.includeTurns) return send({ id: message.id, error: {} });
      if (mode === "malformed-read") return send({ id: message.id, result: { thread: null } });
      return send({ id: message.id, result: { thread: threads.find((thread) => thread.id === message.params.threadId) } });
    }
  });
}
`;
  await writeFile(command, source, "utf8");
  await chmod(command, 0o700);
  return { command, marker };
}

test("probe distinguishes unavailable, timeout, non-zero, and malformed version output", async (t) => {
  const missing = await probeCodex({ command: `missing-codex-${process.pid}`, timeoutMs: 100 });
  assert.equal(missing.code, "CODEX_NOT_FOUND");

  for (const [mode, code] of [
    ["probe-timeout", "CODEX_PROBE_TIMEOUT"],
    ["probe-failed", "CODEX_PROBE_FAILED"],
    ["bad-version", "CODEX_VERSION_MALFORMED"],
  ]) {
    await t.test(mode, async () => {
      const { command } = await fakeCodex(mode);
      assert.equal((await probeCodex({ command, timeoutMs: 500 })).code, code);
    });
  }
});

test("app-server normalizes explicit lifecycle only and drops forbidden native data", async () => {
  const { command, marker } = await fakeCodex("lifecycle");
  const result = await observeCodex({ command, timeoutMs: 1_000, now: () => NOW });

  assert.equal(result.provider.state, "degraded");
  assert.equal(result.provider.version, "1.2.3");
  assert.equal(result.provider.error.code, "CODEX_SYSTEM_ERROR");
  assert.deepEqual(
    Object.fromEntries(result.sessions.map((session) => [session.providerSessionId, session.status])),
    {
      "active-id": "running",
      "completed-id": "completed",
      "failed-id": "failed",
      "interrupted-id": "interrupted",
      "stale-active-id": "completed",
      "system-error-id": "unknown",
      "turn-running-id": "running",
      "unknown-id": "unknown",
    },
  );
  assert.equal(result.sessions.find((session) => session.providerSessionId === "interrupted-id").terminalAt, undefined);
  const serialized = JSON.stringify(result);
  for (const canary of CANARIES) assert.equal(serialized.includes(canary), false, canary);
  assert.equal(await readFile(marker, "utf8"), "start\nstop\n");
});

test("app-server failures degrade safely and always clean up the child", async (t) => {
  for (const [mode, code] of [
    ["app-timeout", "CODEX_APP_SERVER_TIMEOUT"],
    ["invalid-json", "CODEX_PROTOCOL_INVALID_JSON"],
    ["malformed", "CODEX_PROTOCOL_MALFORMED"],
    ["method-error", "CODEX_PROTOCOL_METHOD_ERROR"],
    ["list-error", "CODEX_PROTOCOL_METHOD_ERROR"],
    ["malformed-list", "CODEX_PROTOCOL_MALFORMED"],
    ["malformed-read", "CODEX_PROTOCOL_MALFORMED"],
  ]) {
    await t.test(mode, async () => {
      const { command, marker } = await fakeCodex(mode);
      const result = await observeCodex({ command, timeoutMs: 500, now: () => NOW });
      assert.equal(result.provider.state, "degraded");
      assert.equal(result.provider.error.code, code);
      assert.deepEqual(result.sessions, []);
      assert.equal(await readFile(marker, "utf8"), "start\nstop\n");
      for (const canary of CANARIES) assert.equal(JSON.stringify(result).includes(canary), false);
    });
  }
});
