import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFile, mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { validateCommandIntent, validateWorkProjection } from "../lib/domain/work.mjs";
import {
  appendEvents,
  persistObservation,
  readProjection,
  replayEvents,
  StorageCorruptionError,
} from "../lib/runtime/observation-store.mjs";
import {
  applyWorkCommand,
  IdempotencyConflictError,
  readWorkProjection,
} from "../lib/runtime/work-queue.mjs";

const FIRST = "2026-07-16T12:00:00.000Z";
const SECOND = "2026-07-16T12:01:00.000Z";
const THIRD = "2026-07-16T12:02:00.000Z";
const EXPIRES = "2026-07-16T13:00:00.000Z";

async function directory() {
  return mkdtemp(join(tmpdir(), "patchfleet-work-"));
}

function enqueue({
  intentId = "intent-enqueue-1",
  idempotencyKey = "key-enqueue-1",
  workItemId = "work-1",
  title = "Fix queue",
  instruction = "Implement the smallest durable queue.",
  workingDirectory = join(tmpdir(), "patchfleet-project"),
  createdAt = FIRST,
  expiresAt = EXPIRES,
} = {}) {
  return {
    schemaVersion: 1,
    intentId,
    idempotencyKey,
    type: "enqueue_work",
    actorId: "local-owner",
    createdAt,
    expiresAt,
    payload: {
      workItem: {
        schemaVersion: 1,
        workItemId,
        title,
        instruction,
        providerId: "codex",
        workingDirectory,
        status: "queued",
        createdAt,
        revision: 1,
      },
    },
  };
}

function remove({
  intentId = "intent-remove-1",
  idempotencyKey = "key-remove-1",
  workItemId = "work-1",
  expectedItemRevision = 1,
  createdAt = SECOND,
  expiresAt = EXPIRES,
} = {}) {
  return {
    schemaVersion: 1,
    intentId,
    idempotencyKey,
    type: "remove_queued_work",
    actorId: "local-owner",
    createdAt,
    expiresAt,
    payload: { workItemId, expectedItemRevision },
  };
}

test("enqueue persists one ordered local projection without changing observation state", async () => {
  const dataDir = await directory();
  const observation = await persistObservation({
    provider: {
      id: "codex",
      displayName: "Codex",
      state: "available",
      version: "1.2.3",
      capabilities: { recentObservation: true, explicitLiveStatus: true },
    },
    observedAt: FIRST,
    sessions: [],
  }, { dataDir });
  await applyWorkCommand(enqueue({
    intentId: "intent-enqueue-2",
    idempotencyKey: "key-enqueue-2",
    workItemId: "work-2",
    createdAt: SECOND,
  }), { dataDir, now: () => SECOND });
  await applyWorkCommand(enqueue(), { dataDir, now: () => FIRST });

  const projection = await readWorkProjection({ dataDir });
  assert.equal(projection.revision, 2);
  assert.deepEqual(projection.items.map((item) => item.workItemId), ["work-1", "work-2"]);
  assert.equal(projection.items[0].revision, 1);
  assert.equal(projection.receipts.length, 2);
  assert.deepEqual(await readProjection({ dataDir }), observation);
  assert.deepEqual(
    validateWorkProjection(JSON.parse(await readFile(join(dataDir, "work-items.json"), "utf8"))),
    projection,
  );
});

test("remove enforces item revision and records safe terminal outcomes", async () => {
  const dataDir = await directory();
  await applyWorkCommand(enqueue(), { dataDir, now: () => FIRST });

  const stale = await applyWorkCommand(remove({
    intentId: "intent-stale",
    idempotencyKey: "key-stale",
    expectedItemRevision: 2,
  }), { dataDir, now: () => SECOND });
  assert.deepEqual([stale.outcome, stale.reasonCode, stale.workProjectionRevision], [
    "rejected",
    "STALE_ITEM_REVISION",
    1,
  ]);

  const missing = await applyWorkCommand(remove({
    intentId: "intent-missing",
    idempotencyKey: "key-missing",
    workItemId: "missing",
  }), { dataDir, now: () => SECOND });
  assert.deepEqual([missing.outcome, missing.reasonCode], ["rejected", "WORK_ITEM_NOT_FOUND"]);

  const applied = await applyWorkCommand(remove(), { dataDir, now: () => SECOND });
  assert.deepEqual([applied.outcome, applied.reasonCode, applied.workProjectionRevision], [
    "applied",
    "WORK_REMOVED",
    2,
  ]);
  const projection = await readWorkProjection({ dataDir });
  assert.deepEqual(projection.items, []);
  assert.equal(projection.receipts.length, 4);

  const reused = enqueue({
    intentId: "intent-reused-work-id",
    idempotencyKey: "key-reused-work-id",
    createdAt: THIRD,
  });
  const rejected = await applyWorkCommand(reused, { dataDir, now: () => THIRD });
  assert.deepEqual([rejected.outcome, rejected.reasonCode], ["rejected", "WORK_ITEM_EXISTS"]);
  assert.equal(
    (await replayEvents({ dataDir })).filter((item) => item.type === "work.enqueued").length,
    1,
  );

  const duplicateIdentity = validateCommandIntent({
    ...reused,
    intentId: "intent-corrupt-reuse",
    idempotencyKey: "key-corrupt-reuse",
  });
  await assert.rejects(() => appendEvents([
    {
      id: randomUUID(),
      schemaVersion: 1,
      type: "command.requested",
      recordedAt: THIRD,
      payload: { intent: duplicateIdentity },
    },
    {
      id: randomUUID(),
      schemaVersion: 1,
      type: "work.enqueued",
      recordedAt: THIRD,
      payload: { intentId: duplicateIdentity.intentId, workItem: duplicateIdentity.payload.workItem },
    },
  ], { dataDir }), StorageCorruptionError);
});

test("expired and duplicate commands produce one semantic receipt and no repeated fact", async () => {
  const dataDir = await directory();
  const command = enqueue();
  const [first, duplicate] = await Promise.all([
    applyWorkCommand(command, { dataDir, now: () => FIRST }),
    applyWorkCommand(command, { dataDir, now: () => FIRST }),
  ]);
  assert.deepEqual(duplicate, first);

  const events = await replayEvents({ dataDir });
  assert.equal(events.filter((item) => item.type === "command.requested").length, 1);
  assert.equal(events.filter((item) => item.type === "work.enqueued").length, 1);
  assert.equal(events.filter((item) => item.type === "command.receipted").length, 1);

  await assert.rejects(
    () => applyWorkCommand(enqueue({ title: "Different" }), { dataDir, now: () => FIRST }),
    IdempotencyConflictError,
  );

  const expired = await applyWorkCommand(enqueue({
    intentId: "intent-expired",
    idempotencyKey: "key-expired",
    workItemId: "work-expired",
    createdAt: FIRST,
    expiresAt: SECOND,
  }), { dataDir, now: () => THIRD });
  assert.deepEqual([expired.outcome, expired.reasonCode, expired.workProjectionRevision], [
    "expired",
    "COMMAND_EXPIRED",
    1,
  ]);
  assert.equal((await readWorkProjection({ dataDir })).items.length, 1);
});

test("a durable pending request can finish after restart without a second request", async () => {
  const dataDir = await directory();
  const intent = validateCommandIntent(enqueue());
  await appendEvents([{
    id: randomUUID(),
    schemaVersion: 1,
    type: "command.requested",
    recordedAt: FIRST,
    payload: { intent },
  }], { dataDir });

  assert.deepEqual(await readWorkProjection({ dataDir }), {
    schemaVersion: 1,
    revision: 0,
    items: [],
    runs: [],
    receipts: [],
  });
  const receipt = await applyWorkCommand(intent, { dataDir, now: () => SECOND });
  assert.equal(receipt.outcome, "applied");
  const events = await replayEvents({ dataDir });
  assert.equal(events.filter((item) => item.type === "command.requested").length, 1);
  assert.equal(events.filter((item) => item.type === "work.enqueued").length, 1);
});

test("a pending request expires terminally and terminal duplicates return its first receipt", async () => {
  const dataDir = await directory();
  const intent = validateCommandIntent(enqueue({ expiresAt: SECOND }));
  await appendEvents([{
    id: randomUUID(),
    schemaVersion: 1,
    type: "command.requested",
    recordedAt: FIRST,
    payload: { intent },
  }], { dataDir });

  const expired = await applyWorkCommand(intent, { dataDir, now: () => SECOND });
  assert.deepEqual([expired.outcome, expired.reasonCode], ["expired", "COMMAND_EXPIRED"]);
  assert.deepEqual(
    await applyWorkCommand(intent, { dataDir, now: () => THIRD }),
    expired,
  );
  const events = await replayEvents({ dataDir });
  assert.equal(events.filter((item) => item.type === "command.requested").length, 1);
  assert.equal(events.filter((item) => item.type === "command.receipted").length, 1);
  assert.equal(events.some((item) => item.type === "work.enqueued"), false);
});

test("expiry uses the clock after a command reaches the serialized writer", async () => {
  const dataDir = await directory();
  let clock = FIRST;
  const blocker = enqueue({
    intentId: "intent-writer-blocker",
    idempotencyKey: "key-writer-blocker",
    workItemId: "work-writer-blocker",
  });
  const queued = enqueue({
    intentId: "intent-writer-queued",
    idempotencyKey: "key-writer-queued",
    workItemId: "work-writer-queued",
    expiresAt: SECOND,
  });

  const blockingResult = applyWorkCommand(blocker, { dataDir, now: () => clock });
  const queuedResult = applyWorkCommand(queued, { dataDir, now: () => clock });
  clock = SECOND;

  assert.equal((await blockingResult).outcome, "applied");
  const expired = await queuedResult;
  assert.deepEqual([expired.outcome, expired.reasonCode], ["expired", "COMMAND_EXPIRED"]);
  assert.deepEqual(
    await applyWorkCommand(queued, {
      dataDir,
      now: () => { throw new Error("terminal duplicate must not read the clock"); },
    }),
    expired,
  );
  assert.deepEqual(
    (await readWorkProjection({ dataDir })).items.map((item) => item.workItemId),
    ["work-writer-blocker"],
  );
});

test("replay repairs a crash tail, rebuilds projection, and rejects middle corruption", async () => {
  const dataDir = await directory();
  await applyWorkCommand(enqueue(), { dataDir, now: () => FIRST });
  const stale = await readFile(join(dataDir, "work-items.json"), "utf8");
  await appendFile(join(dataDir, "events.jsonl"), '{"partial":', "utf8");
  await applyWorkCommand(enqueue({
    intentId: "intent-enqueue-2",
    idempotencyKey: "key-enqueue-2",
    workItemId: "work-2",
    createdAt: SECOND,
  }), { dataDir, now: () => SECOND });
  assert.equal((await readFile(join(dataDir, "events.jsonl"), "utf8")).includes('"partial"'), false);

  await writeFile(join(dataDir, "work-items.json"), stale, "utf8");
  const recovered = await readWorkProjection({ dataDir });
  assert.deepEqual(recovered.items.map((item) => item.workItemId), ["work-1", "work-2"]);
  assert.deepEqual(JSON.parse(await readFile(join(dataDir, "work-items.json"), "utf8")), recovered);

  await unlink(join(dataDir, "work-items.json"));
  assert.deepEqual(await readWorkProjection({ dataDir }), recovered);
  await writeFile(join(dataDir, "work-items.json"), "broken", "utf8");
  assert.deepEqual(await readWorkProjection({ dataDir }), recovered);

  const log = await readFile(join(dataDir, "events.jsonl"), "utf8");
  const lines = log.trimEnd().split("\n");
  lines.splice(1, 0, "not-json");
  await writeFile(join(dataDir, "events.jsonl"), `${lines.join("\n")}\n`, "utf8");
  await assert.rejects(() => readWorkProjection({ dataDir }), StorageCorruptionError);
});

test("receipt reason corruption fails closed before projection recovery", async () => {
  const dataDir = await directory();
  await applyWorkCommand(enqueue(), { dataDir, now: () => FIRST });
  const path = join(dataDir, "events.jsonl");
  const log = await readFile(path, "utf8");
  const corrupted = log.replace('"reasonCode":"WORK_ENQUEUED"', '"reasonCode":"WORK_REMOVED"');
  assert.notEqual(corrupted, log);
  await writeFile(path, corrupted, "utf8");
  await assert.rejects(() => readWorkProjection({ dataDir }), StorageCorruptionError);
});

test("exact schemas reject invalid or forbidden fields and receipts disclose no local work text", async () => {
  const valid = enqueue();
  for (const candidate of [
    { ...valid, schemaVersion: 2 },
    { ...valid, extra: true },
    { ...valid, type: "start_work" },
    { ...valid, payload: { workItem: { ...valid.payload.workItem, providerId: "claude" } } },
    { ...valid, payload: { workItem: { ...valid.payload.workItem, workingDirectory: "relative" } } },
    { ...valid, payload: { workItem: { ...valid.payload.workItem, instruction: "" } } },
    { ...valid, payload: { workItem: { ...valid.payload.workItem, revision: 2 } } },
    { ...valid, payload: { workItem: { ...valid.payload.workItem, prompt: "CANARY" } } },
  ]) {
    assert.throws(() => validateCommandIntent(candidate), TypeError);
  }

  const dataDir = await directory();
  const canary = "CANARY_LOCAL_TITLE_INSTRUCTION_PATH";
  const result = await applyWorkCommand(enqueue({
    title: canary,
    instruction: canary,
    workingDirectory: join(tmpdir(), canary),
  }), { dataDir, now: () => FIRST });
  assert.equal(JSON.stringify(result).includes(canary), false);
  const projection = await readWorkProjection({ dataDir });
  assert.equal(JSON.stringify(projection.receipts).includes(canary), false);
  assert.equal(JSON.stringify(projection.items).includes(canary), true);
});
