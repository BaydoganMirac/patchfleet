import assert from "node:assert/strict";
import { appendFile, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  appendEvents,
  persistObservation,
  projectEvents,
  readProjection,
  rebuildProjection,
  replayEvents,
  StorageCorruptionError,
} from "../lib/runtime/observation-store.mjs";

const FIRST = "2026-07-15T12:00:00.000Z";
const SECOND = "2026-07-15T12:05:00.000Z";

function observation({
  observedAt = FIRST,
  status = "completed",
  terminalAt = "2026-07-15T11:59:00.000Z",
  extra = {},
} = {}) {
  return {
    schemaVersion: 1,
    provider: {
      id: "codex",
      displayName: "Codex",
      state: "available",
      version: "1.2.3",
      capabilities: { recentObservation: true, explicitLiveStatus: true },
      ...extra,
    },
    observedAt,
    sessions: [
      {
        providerSessionId: "session-1",
        status,
        createdAt: "2026-07-15T11:00:00.000Z",
        lastObservedAt: observedAt,
        ...(terminalAt ? { terminalAt } : {}),
        ...extra,
      },
    ],
    ...extra,
  };
}

async function directory() {
  return mkdtemp(join(tmpdir(), "patchfleet-store-"));
}

test("append, replay, deterministic rebuild, and atomic projection replacement", async () => {
  const dataDir = await directory();
  const first = await persistObservation(observation(), { dataDir });
  const events = await replayEvents({ dataDir });
  assert.ok(events.length >= 3);
  assert.deepEqual(projectEvents(events), first);
  assert.deepEqual(await readProjection({ dataDir }), first);

  await writeFile(join(dataDir, "observation.json"), "broken", "utf8");
  assert.deepEqual(await rebuildProjection({ dataDir }), first);

  const second = await persistObservation(
    observation({ observedAt: SECOND, status: "running", terminalAt: undefined }),
    { dataDir },
  );
  assert.equal(second.observedAt, SECOND);
  assert.equal((await readProjection({ dataDir })).sessions[0].status, "running");
  assert.deepEqual((await readdir(dataDir)).filter((name) => name.endsWith(".tmp")), []);
});

test("duplicate event ids are rejected", async () => {
  const dataDir = await directory();
  await persistObservation(observation(), { dataDir });
  const [event] = await replayEvents({ dataDir });
  await assert.rejects(() => appendEvents([event], { dataDir }), StorageCorruptionError);
});

test("only an incomplete final line is ignored and repaired", async () => {
  const dataDir = await directory();
  await persistObservation(observation(), { dataDir });
  const before = await replayEvents({ dataDir });
  await appendFile(join(dataDir, "events.jsonl"), '{"partial":', "utf8");
  assert.deepEqual(await replayEvents({ dataDir }), before);

  await persistObservation(observation({ observedAt: SECOND }), { dataDir });
  const repaired = await readFile(join(dataDir, "events.jsonl"), "utf8");
  assert.equal(repaired.includes('"partial"'), false);
  assert.doesNotThrow(() => repaired.trimEnd().split("\n").forEach(JSON.parse));
});

test("middle corruption fails closed", async () => {
  const dataDir = await directory();
  await persistObservation(observation(), { dataDir });
  const log = await readFile(join(dataDir, "events.jsonl"), "utf8");
  const lines = log.trimEnd().split("\n");
  lines.splice(1, 0, "not-json");
  await writeFile(join(dataDir, "events.jsonl"), `${lines.join("\n")}\n`, "utf8");
  await assert.rejects(() => replayEvents({ dataDir }), StorageCorruptionError);
  await assert.rejects(() => persistObservation(observation({ observedAt: SECOND }), { dataDir }), StorageCorruptionError);
});

test("repeated observation does not duplicate a terminal transition", async () => {
  const dataDir = await directory();
  await persistObservation(observation(), { dataDir });
  await persistObservation(observation({ observedAt: SECOND }), { dataDir });
  const events = await replayEvents({ dataDir });
  assert.equal(events.filter((event) => event.type === "session.terminal").length, 1);
  assert.equal(events.filter((event) => event.type === "session.observed").length, 2);
});

test("forbidden extra fields never enter the event log or projection", async () => {
  const dataDir = await directory();
  const canary = "CANARY_PROMPT_TRANSCRIPT_PATH_TOOL_TOKEN";
  await persistObservation(observation({ extra: { prompt: canary, cwd: canary, transcript: canary } }), {
    dataDir,
  });
  const stored = `${await readFile(join(dataDir, "events.jsonl"), "utf8")}${await readFile(
    join(dataDir, "observation.json"),
    "utf8",
  )}`;
  assert.equal(stored.includes(canary), false);
  assert.equal(stored.includes("prompt"), false);
  assert.equal(stored.includes("transcript"), false);
  assert.equal(stored.includes("cwd"), false);
});
