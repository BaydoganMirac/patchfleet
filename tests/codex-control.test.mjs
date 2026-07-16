import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, parse } from "node:path";
import { test } from "node:test";
import {
  closeCodexControl,
  prepareCodexWork,
  validateCodexWorkspace,
} from "../lib/providers/codex-control.mjs";
import {
  applyWorkCommand,
  applyWorkControlCommand,
  readWorkProjection,
} from "../lib/runtime/work-queue.mjs";
import { persistObservation } from "../lib/runtime/observation-store.mjs";

const FIRST = "2026-07-16T12:00:00.000Z";
const SECOND = "2026-07-16T12:01:00.000Z";
const THIRD = "2026-07-16T12:02:00.000Z";
const EXPIRES = "2026-07-16T13:00:00.000Z";
const INSTRUCTION_CANARY = "CANARY_PRIVATE_INSTRUCTION";
const NATIVE_CANARY = "CANARY_NATIVE_OUTPUT_PATH";

async function workspace() {
  const directory = await mkdtemp(join(tmpdir(), "patchfleet-control-workspace-"));
  await mkdir(join(directory, ".git"));
  return directory;
}

async function fixture({ mode = "normal" } = {}) {
  const root = await mkdtemp(join(tmpdir(), "patchfleet-control-"));
  const command = join(root, "codex");
  const stateFile = join(root, "state.json");
  const source = `#!/usr/bin/env node
const fs = require("node:fs");
const readline = require("node:readline");
const stateFile = ${JSON.stringify(stateFile)};
const mode = ${JSON.stringify(mode)};
const read = () => fs.existsSync(stateFile)
  ? JSON.parse(fs.readFileSync(stateFile, "utf8"))
  : { processes: 0, threadStarts: 0, turnStarts: 0, interrupts: 0, threads: [], serverResponse: null, timedOut: false, initialize: null, startParams: null, turnStartParams: null, interruptParams: null };
const write = (state) => fs.writeFileSync(stateFile, JSON.stringify(state));
const state = read(); state.processes += 1; write(state);
const send = (value) => process.stdout.write(JSON.stringify(value) + "\\n");
const thread = (params, id) => ({
  id, cwd: params.cwd, threadSource: params.threadSource, ephemeral: false,
  turns: [], preview: ${JSON.stringify(NATIVE_CANARY)}, items: [{ text: ${JSON.stringify(NATIVE_CANARY)} }]
});
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const message = JSON.parse(line);
  const current = read();
  if (!message.method && message.id === "server-request-1") {
    current.serverResponse = message; write(current); return;
  }
  if (message.method === "initialized") return;
  if (message.method === "initialize") {
    current.initialize = message.params; write(current);
    return send({ id: message.id, result: { raw: ${JSON.stringify(NATIVE_CANARY)} } });
  }
  if (message.method === "thread/start") {
    current.threadStarts += 1;
    current.startParams = message.params;
    const value = thread(message.params, "thread-" + current.threadStarts);
    current.threads.push(value); write(current);
    send({ id: message.id, result: { thread: value, raw: ${JSON.stringify(NATIVE_CANARY)} } });
    return send({ id: "server-request-1", method: "item/tool/requestUserInput", params: { raw: ${JSON.stringify(NATIVE_CANARY)} } });
  }
  if (message.method === "turn/start") {
    const value = current.threads.find((item) => item.id === message.params.threadId);
    const turn = { id: "turn-1", status: "inProgress", completedAt: null, items: [{ text: ${JSON.stringify(NATIVE_CANARY)} }] };
    value.turns = [turn]; current.turnStarts += 1; current.turnStartParams = message.params;
    const timeout = mode === "timeout-turn-once" && !current.timedOut;
    current.timedOut ||= timeout; write(current);
    if (!timeout) send({ id: message.id, result: { turn, raw: ${JSON.stringify(NATIVE_CANARY)} } });
    return;
  }
  if (message.method === "turn/interrupt") {
    const value = current.threads.find((item) => item.id === message.params.threadId);
    value.turns[0].status = "interrupted"; value.turns[0].completedAt = 1784200000;
    current.interrupts += 1; current.interruptParams = message.params; write(current);
    return send({ id: message.id, result: {} });
  }
});
`;
  await writeFile(command, source, "utf8");
  await chmod(command, 0o700);
  return {
    command,
    state: async () => {
      try {
        return JSON.parse(await readFile(stateFile, "utf8"));
      } catch (error) {
        if (error.code === "ENOENT") return { processes: 0, threadStarts: 0, turnStarts: 0 };
        throw error;
      }
    },
  };
}

function enqueue(cwd) {
  return {
    schemaVersion: 1,
    intentId: "queue-work",
    idempotencyKey: "queue-work",
    type: "enqueue_work",
    actorId: "local-owner",
    createdAt: FIRST,
    expiresAt: EXPIRES,
    payload: { workItem: {
      schemaVersion: 1,
      workItemId: "work-1",
      title: "Safe work",
      instruction: INSTRUCTION_CANARY,
      providerId: "codex",
      workingDirectory: cwd,
      status: "queued",
      createdAt: FIRST,
      revision: 1,
    } },
  };
}

function start(intentId = "control-start") {
  return {
    schemaVersion: 1,
    intentId,
    idempotencyKey: intentId,
    type: "start_work",
    actorId: "local-owner",
    createdAt: SECOND,
    expiresAt: EXPIRES,
    payload: { workItemId: "work-1", expectedItemRevision: 1 },
  };
}

function cancel() {
  return {
    schemaVersion: 1,
    intentId: "control-cancel",
    idempotencyKey: "control-cancel",
    type: "cancel_run",
    actorId: "local-owner",
    createdAt: THIRD,
    expiresAt: EXPIRES,
    payload: { runId: "run:control-start", expectedRunRevision: 1 },
  };
}

test("start uses one bounded app-server, rejects server requests, and persists only safe run ids", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "patchfleet-control-data-"));
  const cwd = await workspace();
  const canonicalCwd = await realpath(cwd);
  const fake = await fixture();
  try {
    await applyWorkCommand(enqueue(cwd), { dataDir, now: () => FIRST });
    const applied = await applyWorkControlCommand(start(), {
      dataDir, command: fake.command, now: () => SECOND, timeoutMs: 500,
    });
    assert.deepEqual([applied.outcome, applied.reasonCode], ["applied", "WORK_STARTED"]);
    assert.deepEqual(
      await applyWorkControlCommand(start(), {
        dataDir, command: fake.command, now: () => THIRD, timeoutMs: 500,
      }),
      applied,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    const native = await fake.state();
    assert.deepEqual([native.processes, native.threadStarts, native.turnStarts], [1, 1, 1]);
    assert.deepEqual(native.initialize, {
      clientInfo: { name: "patchfleet", title: "Patchfleet", version: "0.1.0" },
      capabilities: null,
    });
    assert.deepEqual(native.startParams, {
      cwd: canonicalCwd,
      approvalPolicy: "never",
      sandbox: "workspace-write",
      ephemeral: false,
      threadSource: "patchfleet:control-start",
      experimentalRawEvents: false,
    });
    assert.deepEqual(native.turnStartParams, {
      threadId: "thread-1",
      clientUserMessageId: "control-start",
      input: [{ type: "text", text: INSTRUCTION_CANARY, text_elements: [] }],
    });
    assert.deepEqual(native.serverResponse, {
      id: "server-request-1",
      error: { code: -32601, message: "Method not found" },
    });
    const projection = await readWorkProjection({ dataDir });
    assert.deepEqual(projection.runs.map((run) => [run.runId, run.providerSessionId, run.providerTurnId, run.status]), [
      ["run:control-start", "thread-1", "turn-1", "running"],
    ]);
    assert.equal(JSON.stringify(projection.receipts).includes(INSTRUCTION_CANARY), false);
    assert.equal(JSON.stringify(projection).includes(NATIVE_CANARY), false);
    const log = await readFile(join(dataDir, "events.jsonl"), "utf8");
    assert.equal(log.includes(NATIVE_CANARY), false);
    assert.equal(log.includes('"raw"'), false);

    await persistObservation({
      provider: {
        id: "codex",
        displayName: "Codex",
        state: "available",
        version: "1.2.3",
        capabilities: { recentObservation: true, explicitLiveStatus: true },
      },
      observedAt: THIRD,
      sessions: [{
        providerSessionId: "thread-1",
        status: "completed",
        createdAt: FIRST,
        lastObservedAt: THIRD,
        terminalAt: THIRD,
      }],
    }, { dataDir });
    const reconciled = await readWorkProjection({ dataDir });
    assert.deepEqual([reconciled.revision, reconciled.items[0].status, reconciled.runs[0].status], [3, "completed", "completed"]);
  } finally {
    await closeCodexControl();
  }
});

test("an uncertain turn start fails closed on exact retry without duplicate work", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "patchfleet-control-data-"));
  const cwd = await workspace();
  const fake = await fixture({ mode: "timeout-turn-once" });
  try {
    await applyWorkCommand(enqueue(cwd), { dataDir, now: () => FIRST });
    await assert.rejects(
      () => applyWorkControlCommand(start(), {
        dataDir, command: fake.command, now: () => SECOND, timeoutMs: 500,
      }),
      (error) => error.outcomeUnknown === true,
    );
    assert.equal((await readWorkProjection({ dataDir })).items[0].status, "launching");
    const failed = await applyWorkControlCommand(start(), {
      dataDir, command: fake.command, now: () => THIRD, timeoutMs: 500,
    });
    assert.deepEqual([failed.outcome, failed.reasonCode], ["failed", "START_OUTCOME_UNKNOWN"]);
    const native = await fake.state();
    assert.deepEqual([native.threadStarts, native.turnStarts], [1, 1]);
    const projection = await readWorkProjection({ dataDir });
    assert.deepEqual([projection.items[0].status, projection.runs.length], ["blocked", 0]);
  } finally {
    await closeCodexControl();
  }
});

test("an owner crash before provider prepare blocks the launch without starting a provider thread", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "patchfleet-control-data-"));
  const cwd = await workspace();
  const fake = await fixture();
  try {
    await applyWorkCommand(enqueue(cwd), { dataDir, now: () => FIRST });
    await assert.rejects(
      () => applyWorkControlCommand(start(), {
        dataDir,
        command: fake.command,
        now: () => SECOND,
        ownerEpoch: "owner-before-prepare",
        timeoutMs: 500,
        prepare: async () => {
          throw Object.assign(new Error("simulated process loss"), { outcomeUnknown: true });
        },
      }),
      (error) => error.outcomeUnknown === true,
    );
    assert.equal((await readWorkProjection({ dataDir })).items[0].status, "launching");

    const failed = await applyWorkControlCommand(start(), {
      dataDir,
      command: fake.command,
      now: () => THIRD,
      ownerEpoch: "owner-after-restart",
      timeoutMs: 500,
    });
    assert.deepEqual([failed.outcome, failed.reasonCode], ["failed", "START_OUTCOME_UNKNOWN"]);
    assert.deepEqual(await fake.state(), { processes: 0, threadStarts: 0, turnStarts: 0 });
    assert.equal((await readWorkProjection({ dataDir })).items[0].status, "blocked");
  } finally {
    await closeCodexControl();
  }
});

test("an owner crash after provider prepare leaves one empty thread and never starts a replacement", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "patchfleet-control-data-"));
  const cwd = await workspace();
  const fake = await fixture();
  try {
    await applyWorkCommand(enqueue(cwd), { dataDir, now: () => FIRST });
    await assert.rejects(
      () => applyWorkControlCommand(start(), {
        dataDir,
        command: fake.command,
        now: () => SECOND,
        ownerEpoch: "owner-before-prepare-checkpoint",
        timeoutMs: 500,
        prepare: async (options) => {
          await prepareCodexWork(options);
          throw Object.assign(new Error("simulated process loss"), { outcomeUnknown: true });
        },
      }),
      (error) => error.outcomeUnknown === true,
    );
    assert.equal(
      (await readFile(join(dataDir, "events.jsonl"), "utf8")).includes('"type":"run.prepared"'),
      false,
    );

    const failed = await applyWorkControlCommand(start(), {
      dataDir,
      command: fake.command,
      now: () => THIRD,
      ownerEpoch: "owner-after-prepare-crash",
      timeoutMs: 500,
    });
    assert.deepEqual([failed.outcome, failed.reasonCode], ["failed", "START_OUTCOME_UNKNOWN"]);
    const native = await fake.state();
    assert.deepEqual([native.threadStarts, native.turnStarts], [1, 0]);
    const projection = await readWorkProjection({ dataDir });
    assert.deepEqual([projection.items[0].status, projection.runs.length], ["blocked", 0]);
  } finally {
    await closeCodexControl();
  }
});

test("an owner crash after turn.requested blocks the launch without a turn or replacement thread", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "patchfleet-control-data-"));
  const cwd = await workspace();
  const fake = await fixture();
  try {
    await applyWorkCommand(enqueue(cwd), { dataDir, now: () => FIRST });
    await assert.rejects(
      () => applyWorkControlCommand(start(), {
        dataDir,
        command: fake.command,
        now: () => SECOND,
        ownerEpoch: "owner-before-turn",
        timeoutMs: 500,
        start: async () => {
          throw Object.assign(new Error("simulated process loss"), { outcomeUnknown: true });
        },
      }),
      (error) => error.outcomeUnknown === true,
    );
    const preparedLog = await readFile(join(dataDir, "events.jsonl"), "utf8");
    assert.equal(preparedLog.includes('"type":"run.prepared"'), true);
    assert.equal(preparedLog.includes(NATIVE_CANARY), false);

    const failed = await applyWorkControlCommand(start(), {
      dataDir,
      command: fake.command,
      now: () => THIRD,
      ownerEpoch: "owner-after-turn-crash",
      timeoutMs: 500,
    });
    assert.deepEqual([failed.outcome, failed.reasonCode], ["failed", "START_OUTCOME_UNKNOWN"]);
    const native = await fake.state();
    assert.deepEqual([native.threadStarts, native.turnStarts], [1, 0]);
    const projection = await readWorkProjection({ dataDir });
    assert.deepEqual([projection.items[0].status, projection.runs.length], ["blocked", 0]);
    assert.equal(JSON.stringify(projection).includes(NATIVE_CANARY), false);
  } finally {
    await closeCodexControl();
  }
});

test("same-owner cancel interrupts once and duplicate delivery returns the receipt", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "patchfleet-control-data-"));
  const cwd = await workspace();
  const fake = await fixture();
  try {
    await applyWorkCommand(enqueue(cwd), { dataDir, now: () => FIRST });
    await applyWorkControlCommand(start(), {
      dataDir, command: fake.command, now: () => SECOND, timeoutMs: 500,
    });
    const applied = await applyWorkControlCommand(cancel(), {
      dataDir, command: fake.command, now: () => THIRD, timeoutMs: 500,
    });
    assert.deepEqual([applied.outcome, applied.reasonCode], ["applied", "RUN_CANCELLED"]);
    assert.deepEqual(
      await applyWorkControlCommand(cancel(), {
        dataDir, command: fake.command, now: () => THIRD, timeoutMs: 500,
      }),
      applied,
    );
    const native = await fake.state();
    assert.equal(native.interrupts, 1);
    assert.deepEqual(native.interruptParams, { threadId: "thread-1", turnId: "turn-1" });
    const projection = await readWorkProjection({ dataDir });
    assert.deepEqual([projection.items[0].status, projection.runs[0].status], ["interrupted", "interrupted"]);
  } finally {
    await closeCodexControl();
  }
});

test("an active run from an old owner is session-lost and never interrupted by a replacement owner", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "patchfleet-control-data-"));
  const cwd = await workspace();
  const fake = await fixture();
  try {
    await applyWorkCommand(enqueue(cwd), { dataDir, now: () => FIRST });
    await applyWorkControlCommand(start(), {
      dataDir,
      command: fake.command,
      now: () => SECOND,
      ownerEpoch: "owner-active-run",
      timeoutMs: 500,
    });

    const rejected = await applyWorkControlCommand(cancel(), {
      dataDir,
      command: fake.command,
      now: () => THIRD,
      ownerEpoch: "owner-after-active-crash",
      timeoutMs: 500,
    });
    assert.deepEqual([rejected.outcome, rejected.reasonCode], ["rejected", "RUN_NOT_ACTIVE"]);
    const native = await fake.state();
    assert.deepEqual([native.threadStarts, native.turnStarts, native.interrupts], [1, 1, 0]);
    const projection = await readWorkProjection({ dataDir });
    assert.deepEqual(
      [projection.items[0].status, projection.runs[0].status],
      ["blocked", "failed"],
    );
  } finally {
    await closeCodexControl();
  }
});

test("workspace preflight fails closed before a provider thread can start", async () => {
  await assert.rejects(() => validateCodexWorkspace(parse(homedir()).root), { code: "WORKSPACE_NOT_ALLOWED" });
  await assert.rejects(() => validateCodexWorkspace(homedir()), { code: "WORKSPACE_NOT_ALLOWED" });
  await assert.rejects(() => validateCodexWorkspace(join(tmpdir(), "patchfleet-missing")), { code: "WORKSPACE_NOT_ALLOWED" });
  const noGit = await mkdtemp(join(tmpdir(), "patchfleet-no-git-"));
  await assert.rejects(() => validateCodexWorkspace(noGit), { code: "WORKSPACE_NOT_ALLOWED" });

  const dataDir = await mkdtemp(join(tmpdir(), "patchfleet-control-data-"));
  const cwd = await workspace();
  const fake = await fixture();
  try {
    await applyWorkCommand(enqueue(cwd), { dataDir, now: () => FIRST });
    const rejected = await applyWorkControlCommand(start(), {
      dataDir,
      command: fake.command,
      now: () => SECOND,
      timeoutMs: 500,
      prepare: ({ workingDirectory }) => prepareCodexWork({
        intentId: "control-start",
        workingDirectory: join(workingDirectory, "missing"),
        command: fake.command,
        timeoutMs: 500,
      }),
    });
    assert.deepEqual([rejected.outcome, rejected.reasonCode], ["rejected", "WORKSPACE_NOT_ALLOWED"]);
    assert.equal((await fake.state()).threadStarts, 0);
  } finally {
    await closeCodexControl();
  }
});
