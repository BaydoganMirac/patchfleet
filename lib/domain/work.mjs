import { isAbsolute } from "node:path";

const COMMAND_TYPES = new Set([
  "enqueue_work",
  "remove_queued_work",
  "start_work",
  "cancel_run",
]);
const OUTCOMES = new Set(["applied", "rejected", "expired", "failed"]);
const WORK_STATUSES = new Set([
  "queued",
  "launching",
  "running",
  "cancelling",
  "blocked",
  "completed",
  "failed",
  "interrupted",
]);
const RUN_STATUSES = new Set([
  "running",
  "cancelling",
  "completed",
  "failed",
  "interrupted",
]);
const TERMINAL_STATUSES = new Set(["completed", "failed", "interrupted"]);
const RECEIPT_REASONS = Object.freeze({
  enqueue_work: Object.freeze({
    applied: new Set(["WORK_ENQUEUED"]),
    rejected: new Set(["WORK_ITEM_EXISTS"]),
    expired: new Set(["COMMAND_EXPIRED"]),
    failed: new Set(["COMMAND_FAILED"]),
  }),
  remove_queued_work: Object.freeze({
    applied: new Set(["WORK_REMOVED"]),
    rejected: new Set([
      "STALE_ITEM_REVISION",
      "WORK_ITEM_NOT_FOUND",
      "WORK_ITEM_NOT_QUEUED",
    ]),
    expired: new Set(["COMMAND_EXPIRED"]),
    failed: new Set(["COMMAND_FAILED"]),
  }),
  start_work: Object.freeze({
    applied: new Set(["WORK_STARTED"]),
    rejected: new Set([
      "PROVIDER_CONTROL_UNAVAILABLE",
      "STALE_ITEM_REVISION",
      "WORKSPACE_NOT_ALLOWED",
      "WORK_ITEM_NOT_FOUND",
      "WORK_ITEM_NOT_QUEUED",
      "WORK_START_PENDING",
    ]),
    expired: new Set(["COMMAND_EXPIRED"]),
    failed: new Set(["PROVIDER_CONTROL_FAILED", "START_OUTCOME_UNKNOWN"]),
  }),
  cancel_run: Object.freeze({
    applied: new Set(["RUN_CANCELLED"]),
    rejected: new Set([
      "PROVIDER_CONTROL_UNAVAILABLE",
      "RUN_CANCEL_PENDING",
      "RUN_NOT_ACTIVE",
      "RUN_NOT_FOUND",
      "STALE_RUN_REVISION",
    ]),
    expired: new Set(["COMMAND_EXPIRED"]),
    failed: new Set(["PROVIDER_CONTROL_FAILED", "RUN_SESSION_LOST"]),
  }),
});
const PROVIDERS = new Set(["codex"]);
const OPAQUE_ID = /^[A-Za-z0-9._:-]{1,256}$/;

function record(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function exact(value, fields, name) {
  const keys = Object.keys(record(value, name));
  if (keys.length !== fields.length || !keys.every((key) => fields.includes(key))) {
    throw new TypeError(`${name} fields must match`);
  }
}

function opaque(value, name) {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(`${name} must be an opaque id`);
  }
  return value;
}

function iso(value, name) {
  if (typeof value !== "string" || new Date(value).toISOString() !== value) {
    throw new TypeError(`${name} must be an ISO timestamp`);
  }
  return value;
}

function revision(value, name, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${name} must be a revision`);
  }
  return value;
}

function boundedText(value, name, maximum) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum || value.trim() !== value) {
    throw new TypeError(`${name} is invalid`);
  }
  return value;
}

export function validateWorkItem(value) {
  const input = record(value, "work item");
  exact(input, [
    "schemaVersion",
    "workItemId",
    "title",
    "instruction",
    "providerId",
    "workingDirectory",
    "status",
    "createdAt",
    "revision",
  ], "work item");
  if (input.schemaVersion !== 1) throw new TypeError("unsupported work item version");
  if (!PROVIDERS.has(input.providerId)) throw new TypeError("invalid provider id");
  if (
    typeof input.workingDirectory !== "string" ||
    input.workingDirectory.length > 4096 ||
    input.workingDirectory.includes("\0") ||
    !isAbsolute(input.workingDirectory)
  ) {
    throw new TypeError("working directory must be absolute");
  }
  if (!WORK_STATUSES.has(input.status)) throw new TypeError("invalid work status");

  return {
    schemaVersion: 1,
    workItemId: opaque(input.workItemId, "workItemId"),
    title: boundedText(input.title, "title", 160),
    instruction: boundedText(input.instruction, "instruction", 50_000),
    providerId: input.providerId,
    workingDirectory: input.workingDirectory,
    status: input.status,
    createdAt: iso(input.createdAt, "createdAt"),
    revision: revision(input.revision, "item revision", 1),
  };
}

export function validateRun(value) {
  const input = record(value, "run");
  exact(input, [
    "schemaVersion",
    "runId",
    "workItemId",
    "providerId",
    "ownerEpoch",
    "providerSessionId",
    "providerTurnId",
    "status",
    "startedAt",
    "terminalAt",
    "revision",
  ], "run");
  if (input.schemaVersion !== 1 || input.providerId !== "codex" || !RUN_STATUSES.has(input.status)) {
    throw new TypeError("invalid run");
  }
  if (input.terminalAt !== null) iso(input.terminalAt, "terminalAt");
  if (TERMINAL_STATUSES.has(input.status) !== (input.terminalAt !== null)) {
    throw new TypeError("invalid run terminal state");
  }
  return {
    schemaVersion: 1,
    runId: opaque(input.runId, "runId"),
    workItemId: opaque(input.workItemId, "workItemId"),
    providerId: "codex",
    ownerEpoch: opaque(input.ownerEpoch, "ownerEpoch"),
    providerSessionId: opaque(input.providerSessionId, "providerSessionId"),
    providerTurnId: opaque(input.providerTurnId, "providerTurnId"),
    status: input.status,
    startedAt: iso(input.startedAt, "startedAt"),
    terminalAt: input.terminalAt,
    revision: revision(input.revision, "run revision", 1),
  };
}

export function validateCommandIntent(value) {
  const input = record(value, "command intent");
  exact(input, [
    "schemaVersion",
    "intentId",
    "idempotencyKey",
    "type",
    "actorId",
    "createdAt",
    "expiresAt",
    "payload",
  ], "command intent");
  if (input.schemaVersion !== 1) throw new TypeError("unsupported command intent version");
  if (!COMMAND_TYPES.has(input.type)) throw new TypeError("unsupported command type");
  const createdAt = iso(input.createdAt, "createdAt");
  const expiresAt = iso(input.expiresAt, "expiresAt");
  if (expiresAt <= createdAt) throw new TypeError("command expiry must follow creation");

  const payload = record(input.payload, "command payload");
  let normalizedPayload;
  if (input.type === "enqueue_work") {
    exact(payload, ["workItem"], "enqueue payload");
    normalizedPayload = { workItem: validateWorkItem(payload.workItem) };
    if (normalizedPayload.workItem.status !== "queued" || normalizedPayload.workItem.revision !== 1) {
      throw new TypeError("new work item must be queued at revision one");
    }
  } else if (input.type === "cancel_run") {
    exact(payload, ["runId", "expectedRunRevision"], "cancel payload");
    normalizedPayload = {
      runId: opaque(payload.runId, "runId"),
      expectedRunRevision: revision(payload.expectedRunRevision, "expected run revision", 1),
    };
  } else {
    exact(payload, ["workItemId", "expectedItemRevision"], `${input.type} payload`);
    normalizedPayload = {
      workItemId: opaque(payload.workItemId, "workItemId"),
      expectedItemRevision: revision(payload.expectedItemRevision, "expected item revision", 1),
    };
  }

  return {
    schemaVersion: 1,
    intentId: opaque(input.intentId, "intentId"),
    idempotencyKey: opaque(input.idempotencyKey, "idempotencyKey"),
    type: input.type,
    actorId: opaque(input.actorId, "actorId"),
    createdAt,
    expiresAt,
    payload: normalizedPayload,
  };
}

export function validateCommandReceipt(value) {
  const input = record(value, "command receipt");
  exact(input, [
    "schemaVersion",
    "intentId",
    "idempotencyKey",
    "commandType",
    "outcome",
    "reasonCode",
    "completedAt",
    "workProjectionRevision",
    "workItemId",
  ], "command receipt");
  if (input.schemaVersion !== 1) throw new TypeError("unsupported command receipt version");
  if (!COMMAND_TYPES.has(input.commandType)) throw new TypeError("unsupported command type");
  if (!OUTCOMES.has(input.outcome)) throw new TypeError("invalid command outcome");
  if (!RECEIPT_REASONS[input.commandType]?.[input.outcome]?.has(input.reasonCode)) {
    throw new TypeError("invalid reason code");
  }
  if (input.workItemId !== null) opaque(input.workItemId, "workItemId");
  return {
    schemaVersion: 1,
    intentId: opaque(input.intentId, "intentId"),
    idempotencyKey: opaque(input.idempotencyKey, "idempotencyKey"),
    commandType: input.commandType,
    outcome: input.outcome,
    reasonCode: input.reasonCode,
    completedAt: iso(input.completedAt, "completedAt"),
    workProjectionRevision: revision(input.workProjectionRevision, "work projection revision"),
    workItemId: input.workItemId,
  };
}

export function validateWorkEvent(value) {
  const input = record(value, "event");
  const payload = record(input.payload, "event payload");
  if (input.type === "command.requested") {
    exact(payload, ["intent"], "command requested payload");
    return { ...input, payload: { intent: validateCommandIntent(payload.intent) } };
  }
  if (input.type === "command.receipted") {
    exact(payload, ["receipt"], "command receipt payload");
    const receipt = validateCommandReceipt(payload.receipt);
    if (receipt.completedAt !== input.recordedAt) throw new TypeError("receipt timestamp mismatch");
    return { ...input, payload: { receipt } };
  }
  if (input.type === "work.enqueued") {
    exact(payload, ["intentId", "workItem"], "work enqueued payload");
    return {
      ...input,
      payload: {
        intentId: opaque(payload.intentId, "intentId"),
        workItem: validateWorkItem(payload.workItem),
      },
    };
  }
  if (input.type === "work.removed") {
    exact(payload, ["intentId", "workItemId", "expectedItemRevision"], "work removed payload");
    return {
      ...input,
      payload: {
        intentId: opaque(payload.intentId, "intentId"),
        workItemId: opaque(payload.workItemId, "workItemId"),
        expectedItemRevision: revision(payload.expectedItemRevision, "expected item revision", 1),
      },
    };
  }
  if (input.type === "run.started") {
    exact(payload, ["intentId", "run", "expectedItemRevision", "ownerEpoch"], "run started payload");
    return {
      ...input,
      payload: {
        intentId: opaque(payload.intentId, "intentId"),
        run: validateRun(payload.run),
        expectedItemRevision: revision(payload.expectedItemRevision, "expected item revision", 1),
        ownerEpoch: opaque(payload.ownerEpoch, "ownerEpoch"),
      },
    };
  }
  if (input.type === "run.launching") {
    exact(payload, ["intentId", "workItemId", "expectedItemRevision", "ownerEpoch"], "run launching payload");
    return {
      ...input,
      payload: {
        intentId: opaque(payload.intentId, "intentId"),
        workItemId: opaque(payload.workItemId, "workItemId"),
        expectedItemRevision: revision(payload.expectedItemRevision, "expected item revision", 1),
        ownerEpoch: opaque(payload.ownerEpoch, "ownerEpoch"),
      },
    };
  }
  if (input.type === "run.prepared") {
    exact(payload, [
      "intentId",
      "workItemId",
      "providerId",
      "providerSessionId",
      "expectedItemRevision",
      "ownerEpoch",
    ], "run prepared payload");
    if (payload.providerId !== "codex") throw new TypeError("invalid prepared provider");
    return {
      ...input,
      payload: {
        intentId: opaque(payload.intentId, "intentId"),
        workItemId: opaque(payload.workItemId, "workItemId"),
        providerId: "codex",
        providerSessionId: opaque(payload.providerSessionId, "providerSessionId"),
        expectedItemRevision: revision(payload.expectedItemRevision, "expected item revision", 1),
        ownerEpoch: opaque(payload.ownerEpoch, "ownerEpoch"),
      },
    };
  }
  if (input.type === "turn.requested") {
    exact(payload, ["intentId", "providerSessionId", "ownerEpoch"], "turn requested payload");
    return {
      ...input,
      payload: {
        intentId: opaque(payload.intentId, "intentId"),
        providerSessionId: opaque(payload.providerSessionId, "providerSessionId"),
        ownerEpoch: opaque(payload.ownerEpoch, "ownerEpoch"),
      },
    };
  }
  if (input.type === "run.start_unknown") {
    exact(payload, ["intentId", "workItemId", "expectedItemRevision", "ownerEpoch"], "run start unknown payload");
    return {
      ...input,
      payload: {
        intentId: opaque(payload.intentId, "intentId"),
        workItemId: opaque(payload.workItemId, "workItemId"),
        expectedItemRevision: revision(payload.expectedItemRevision, "expected item revision", 1),
        ownerEpoch: opaque(payload.ownerEpoch, "ownerEpoch"),
      },
    };
  }
  if (input.type === "run.session_lost") {
    exact(payload, ["runId", "ownerEpoch"], "run session lost payload");
    return {
      ...input,
      payload: {
        runId: opaque(payload.runId, "runId"),
        ownerEpoch: opaque(payload.ownerEpoch, "ownerEpoch"),
      },
    };
  }
  if (input.type === "run.interrupted") {
    exact(payload, ["intentId", "runId", "expectedRunRevision"], "run interrupted payload");
    return {
      ...input,
      payload: {
        intentId: opaque(payload.intentId, "intentId"),
        runId: opaque(payload.runId, "runId"),
        expectedRunRevision: revision(payload.expectedRunRevision, "expected run revision", 1),
      },
    };
  }
  throw new TypeError("unsupported work event");
}

export function validateWorkProjection(value) {
  const input = record(value, "work projection");
  exact(input, ["schemaVersion", "revision", "items", "runs", "receipts"], "work projection");
  if (
    input.schemaVersion !== 1 ||
    !Array.isArray(input.items) ||
    !Array.isArray(input.runs) ||
    !Array.isArray(input.receipts)
  ) {
    throw new TypeError("unsupported work projection");
  }
  const items = input.items.map(validateWorkItem);
  const runs = input.runs.map(validateRun);
  const receipts = input.receipts.map(validateCommandReceipt);
  if (new Set(items.map((item) => item.workItemId)).size !== items.length) throw new TypeError("duplicate work item");
  if (new Set(runs.map((item) => item.runId)).size !== runs.length) throw new TypeError("duplicate run");
  if (new Set(receipts.map((item) => item.intentId)).size !== receipts.length) throw new TypeError("duplicate receipt");
  return {
    schemaVersion: 1,
    revision: revision(input.revision, "work projection revision"),
    items,
    runs,
    receipts,
  };
}

function pending(intents, facts, receipted, predicate) {
  return [...intents.values()].some(
    (intent) => !facts.has(intent.intentId) && !receipted.has(intent.intentId) && predicate(intent),
  );
}

function receiptWorkItemId(intent, runs) {
  if (!intent) return null;
  if (intent.type === "enqueue_work") return intent.payload.workItem.workItemId;
  if (intent.type === "cancel_run") return runs.get(intent.payload.runId)?.workItemId ?? null;
  return intent.payload.workItemId;
}

export function projectWorkEvents(events) {
  const intents = new Map();
  const keys = new Set();
  const items = new Map();
  const runs = new Map();
  const runsBySession = new Map();
  const seenWorkItemIds = new Set();
  const launches = new Map();
  const preparations = new Map();
  const turnRequests = new Map();
  const cancelSnapshots = new Map();
  const facts = new Map();
  const receipts = [];
  const receipted = new Set();
  let revisionValue = 0;
  let found = false;

  for (const candidate of events) {
    if (candidate.type === "session.observed" || candidate.type === "session.terminal") {
      if (candidate.payload.providerId !== "codex") continue;
      const run = runs.get(runsBySession.get(candidate.payload.providerSessionId));
      const nextStatus = candidate.payload.status;
      if (
        !run ||
        !["running", "completed", "failed", "interrupted"].includes(nextStatus) ||
        TERMINAL_STATUSES.has(run.status) ||
        nextStatus === run.status
      ) {
        continue;
      }
      const terminalAt = TERMINAL_STATUSES.has(nextStatus)
        ? (candidate.payload.terminalAt ?? candidate.payload.lastObservedAt)
        : null;
      const nextRun = validateRun({
        ...run,
        status: nextStatus,
        terminalAt,
        revision: run.revision + 1,
      });
      runs.set(run.runId, nextRun);
      const item = items.get(run.workItemId);
      items.set(item.workItemId, validateWorkItem({
        ...item,
        status: nextStatus,
        revision: item.revision + 1,
      }));
      revisionValue += 1;
      continue;
    }
    if (
      !candidate.type.startsWith("command.") &&
      !candidate.type.startsWith("work.") &&
      !candidate.type.startsWith("run.") &&
      !candidate.type.startsWith("turn.")
    ) {
      continue;
    }
    found = true;
    const event = validateWorkEvent(candidate);
    if (event.type === "command.requested") {
      const { intent } = event.payload;
      if (intents.has(intent.intentId) || keys.has(intent.idempotencyKey)) throw new TypeError("duplicate command");
      intents.set(intent.intentId, intent);
      keys.add(intent.idempotencyKey);
      if (intent.type === "cancel_run") {
        const run = runs.get(intent.payload.runId);
        cancelSnapshots.set(intent.intentId, run ? { status: run.status, revision: run.revision } : null);
      }
    } else if (event.type === "work.enqueued") {
      const intent = intents.get(event.payload.intentId);
      if (
        !intent ||
        intent.type !== "enqueue_work" ||
        facts.has(intent.intentId) ||
        JSON.stringify(intent.payload.workItem) !== JSON.stringify(event.payload.workItem) ||
        seenWorkItemIds.has(event.payload.workItem.workItemId)
      ) {
        throw new TypeError("invalid enqueue event");
      }
      items.set(event.payload.workItem.workItemId, event.payload.workItem);
      seenWorkItemIds.add(event.payload.workItem.workItemId);
      facts.set(intent.intentId, event.type);
      revisionValue += 1;
    } else if (event.type === "work.removed") {
      const intent = intents.get(event.payload.intentId);
      const item = items.get(event.payload.workItemId);
      if (
        !intent ||
        intent.type !== "remove_queued_work" ||
        facts.has(intent.intentId) ||
        intent.payload.workItemId !== event.payload.workItemId ||
        intent.payload.expectedItemRevision !== event.payload.expectedItemRevision ||
        !item ||
        item.status !== "queued" ||
        item.revision !== event.payload.expectedItemRevision
      ) {
        throw new TypeError("invalid remove event");
      }
      items.delete(event.payload.workItemId);
      facts.set(intent.intentId, event.type);
      revisionValue += 1;
    } else if (event.type === "run.launching") {
      const intent = intents.get(event.payload.intentId);
      const item = items.get(event.payload.workItemId);
      if (
        !intent ||
        intent.type !== "start_work" ||
        launches.has(intent.intentId) ||
        intent.payload.workItemId !== event.payload.workItemId ||
        intent.payload.expectedItemRevision !== event.payload.expectedItemRevision ||
        !item ||
        item.status !== "queued" ||
        item.revision !== event.payload.expectedItemRevision
      ) {
        throw new TypeError("invalid run launching event");
      }
      launches.set(intent.intentId, event.payload);
    } else if (event.type === "run.prepared") {
      const intent = intents.get(event.payload.intentId);
      const item = items.get(event.payload.workItemId);
      const launch = launches.get(event.payload.intentId);
      if (
        !intent ||
        intent.type !== "start_work" ||
        preparations.has(intent.intentId) ||
        launch?.ownerEpoch !== event.payload.ownerEpoch ||
        intent.payload.workItemId !== event.payload.workItemId ||
        intent.payload.expectedItemRevision !== event.payload.expectedItemRevision ||
        !item ||
        item.status !== "queued" ||
        item.revision !== event.payload.expectedItemRevision
      ) {
        throw new TypeError("invalid run preparation event");
      }
      preparations.set(intent.intentId, event.payload);
    } else if (event.type === "turn.requested") {
      const preparation = preparations.get(event.payload.intentId);
      if (
        !preparation ||
        turnRequests.has(event.payload.intentId) ||
        preparation.providerSessionId !== event.payload.providerSessionId ||
        preparation.ownerEpoch !== event.payload.ownerEpoch
      ) {
        throw new TypeError("invalid turn request event");
      }
      turnRequests.set(event.payload.intentId, event.payload);
    } else if (event.type === "run.start_unknown") {
      const intent = intents.get(event.payload.intentId);
      const item = items.get(event.payload.workItemId);
      const launch = launches.get(event.payload.intentId);
      if (
        !intent ||
        intent.type !== "start_work" ||
        facts.has(intent.intentId) ||
        launch?.ownerEpoch !== event.payload.ownerEpoch ||
        intent.payload.workItemId !== event.payload.workItemId ||
        intent.payload.expectedItemRevision !== event.payload.expectedItemRevision ||
        !item ||
        item.status !== "queued" ||
        item.revision !== event.payload.expectedItemRevision
      ) {
        throw new TypeError("invalid unknown run start event");
      }
      items.set(item.workItemId, validateWorkItem({
        ...item,
        status: "blocked",
        revision: item.revision + 1,
      }));
      facts.set(intent.intentId, event.type);
      revisionValue += 1;
    } else if (event.type === "run.started") {
      const intent = intents.get(event.payload.intentId);
      const item = items.get(event.payload.run.workItemId);
      const launch = launches.get(event.payload.intentId);
      const preparation = preparations.get(event.payload.intentId);
      const turnRequest = turnRequests.get(event.payload.intentId);
      if (
        !intent ||
        intent.type !== "start_work" ||
        facts.has(intent.intentId) ||
        event.payload.run.runId !== `run:${intent.intentId}` ||
        launch?.ownerEpoch !== event.payload.ownerEpoch ||
        preparation?.ownerEpoch !== event.payload.ownerEpoch ||
        turnRequest?.ownerEpoch !== event.payload.ownerEpoch ||
        event.payload.run.ownerEpoch !== event.payload.ownerEpoch ||
        preparation?.providerSessionId !== event.payload.run.providerSessionId ||
        turnRequest?.providerSessionId !== event.payload.run.providerSessionId ||
        intent.payload.workItemId !== event.payload.run.workItemId ||
        intent.payload.expectedItemRevision !== event.payload.expectedItemRevision ||
        !item ||
        item.status !== "queued" ||
        item.revision !== event.payload.expectedItemRevision ||
        runs.has(event.payload.run.runId) ||
        runsBySession.has(event.payload.run.providerSessionId)
      ) {
        throw new TypeError("invalid run start event");
      }
      runs.set(event.payload.run.runId, event.payload.run);
      runsBySession.set(event.payload.run.providerSessionId, event.payload.run.runId);
      items.set(item.workItemId, validateWorkItem({
        ...item,
        status: event.payload.run.status,
        revision: item.revision + 1,
      }));
      facts.set(intent.intentId, event.type);
      revisionValue += 1;
    } else if (event.type === "run.session_lost") {
      const run = runs.get(event.payload.runId);
      const item = run ? items.get(run.workItemId) : null;
      if (
        !run ||
        run.ownerEpoch !== event.payload.ownerEpoch ||
        run.status !== "running" ||
        !item
      ) {
        throw new TypeError("invalid run session lost event");
      }
      runs.set(run.runId, validateRun({
        ...run,
        status: "failed",
        terminalAt: event.recordedAt,
        revision: run.revision + 1,
      }));
      items.set(item.workItemId, validateWorkItem({
        ...item,
        status: "blocked",
        revision: item.revision + 1,
      }));
      revisionValue += 1;
    } else if (event.type === "run.interrupted") {
      const intent = intents.get(event.payload.intentId);
      const run = runs.get(event.payload.runId);
      const item = run ? items.get(run.workItemId) : null;
      const snapshot = cancelSnapshots.get(event.payload.intentId);
      const transitions = run?.status === "running" && run.revision === event.payload.expectedRunRevision;
      const alreadyInterrupted = run?.status === "interrupted" &&
        run.revision === event.payload.expectedRunRevision + 1;
      if (
        !intent ||
        intent.type !== "cancel_run" ||
        facts.has(intent.intentId) ||
        intent.payload.runId !== event.payload.runId ||
        intent.payload.expectedRunRevision !== event.payload.expectedRunRevision ||
        !run ||
        snapshot?.status !== "running" ||
        snapshot.revision !== event.payload.expectedRunRevision ||
        (!transitions && !alreadyInterrupted) ||
        !item
      ) {
        throw new TypeError("invalid run interrupt event");
      }
      if (transitions) {
        runs.set(run.runId, validateRun({
          ...run,
          status: "interrupted",
          terminalAt: event.recordedAt,
          revision: run.revision + 1,
        }));
        items.set(item.workItemId, validateWorkItem({
          ...item,
          status: "interrupted",
          revision: item.revision + 1,
        }));
        revisionValue += 1;
      }
      facts.set(intent.intentId, event.type);
    } else {
      const { receipt } = event.payload;
      const intent = intents.get(receipt.intentId);
      const fact = facts.get(receipt.intentId);
      const workItemId = receiptWorkItemId(intent, runs);
      const item = items.get(workItemId);
      const run = intent?.type === "cancel_run" ? runs.get(intent.payload.runId) : null;
      const appliedReason = {
        "work.enqueued": "WORK_ENQUEUED",
        "work.removed": "WORK_REMOVED",
        "run.started": "WORK_STARTED",
        "run.interrupted": "RUN_CANCELLED",
      }[fact];
      const failedReason = {
        "run.start_unknown": "START_OUTCOME_UNKNOWN",
      }[fact];
      let rejectedIsValid = false;
      if (intent?.type === "enqueue_work") {
        rejectedIsValid = receipt.reasonCode === "WORK_ITEM_EXISTS" && seenWorkItemIds.has(workItemId);
      } else if (intent?.type === "remove_queued_work") {
        const startPending = pending(intents, facts, receipted, (candidate) =>
          candidate.type === "start_work" && candidate.payload.workItemId === workItemId);
        rejectedIsValid =
          (receipt.reasonCode === "WORK_ITEM_NOT_FOUND" && !item) ||
          (receipt.reasonCode === "WORK_ITEM_NOT_QUEUED" && Boolean(item) && (item.status !== "queued" || startPending)) ||
          (receipt.reasonCode === "STALE_ITEM_REVISION" && item?.status === "queued" && item.revision !== intent.payload.expectedItemRevision);
      } else if (intent?.type === "start_work") {
        const anotherPending = pending(intents, facts, receipted, (candidate) =>
          candidate.intentId !== intent.intentId &&
          candidate.type === "start_work" &&
          candidate.payload.workItemId === workItemId);
        rejectedIsValid =
          ["PROVIDER_CONTROL_UNAVAILABLE", "WORKSPACE_NOT_ALLOWED"].includes(receipt.reasonCode) ||
          (receipt.reasonCode === "WORK_ITEM_NOT_FOUND" && !item) ||
          (receipt.reasonCode === "WORK_ITEM_NOT_QUEUED" && Boolean(item) && item.status !== "queued") ||
          (receipt.reasonCode === "WORK_START_PENDING" && anotherPending) ||
          (receipt.reasonCode === "STALE_ITEM_REVISION" && item?.status === "queued" && item.revision !== intent.payload.expectedItemRevision);
      } else if (intent?.type === "cancel_run") {
        const anotherPending = pending(intents, facts, receipted, (candidate) =>
          candidate.intentId !== intent.intentId &&
          candidate.type === "cancel_run" &&
          candidate.payload.runId === intent.payload.runId);
        rejectedIsValid =
          receipt.reasonCode === "PROVIDER_CONTROL_UNAVAILABLE" ||
          (receipt.reasonCode === "RUN_NOT_FOUND" && !run) ||
          (receipt.reasonCode === "RUN_NOT_ACTIVE" && Boolean(run) && run.status !== "running") ||
          (receipt.reasonCode === "RUN_CANCEL_PENDING" && anotherPending) ||
          (receipt.reasonCode === "STALE_RUN_REVISION" && run?.status === "running" && run.revision !== intent.payload.expectedRunRevision);
      }
      const outcomeIsValid =
        (receipt.outcome === "applied" && Boolean(fact) && receipt.reasonCode === appliedReason) ||
        (receipt.outcome === "rejected" && !fact && receipt.completedAt < intent?.expiresAt && rejectedIsValid) ||
        (receipt.outcome === "expired" && !fact && receipt.completedAt >= intent?.expiresAt) ||
        (receipt.outcome === "failed" && (
          (!fact && ["PROVIDER_CONTROL_FAILED", "RUN_SESSION_LOST"].includes(receipt.reasonCode)) ||
          (Boolean(failedReason) && receipt.reasonCode === failedReason)
        ));
      if (
        !intent ||
        intent.idempotencyKey !== receipt.idempotencyKey ||
        intent.type !== receipt.commandType ||
        receipted.has(receipt.intentId) ||
        receipt.workProjectionRevision !== revisionValue ||
        !outcomeIsValid ||
        receipt.workItemId !== workItemId
      ) {
        throw new TypeError("invalid command receipt event");
      }
      receipts.push(receipt);
      receipted.add(receipt.intentId);
    }
  }

  if (!found) return null;
  for (const intent of intents.values()) {
    if (facts.has(intent.intentId) || receipted.has(intent.intentId)) continue;
    if (intent.type === "start_work") {
      const item = items.get(intent.payload.workItemId);
      if (item?.status === "queued") items.set(item.workItemId, { ...item, status: "launching" });
    } else if (intent.type === "cancel_run") {
      const run = runs.get(intent.payload.runId);
      const item = run ? items.get(run.workItemId) : null;
      if (run?.status === "running") runs.set(run.runId, { ...run, status: "cancelling" });
      if (item?.status === "running") items.set(item.workItemId, { ...item, status: "cancelling" });
    }
  }
  return validateWorkProjection({
    schemaVersion: 1,
    revision: revisionValue,
    items: [...items.values()].sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt) || left.workItemId.localeCompare(right.workItemId),
    ),
    runs: [...runs.values()].sort(
      (left, right) => left.startedAt.localeCompare(right.startedAt) || left.runId.localeCompare(right.runId),
    ),
    receipts,
  });
}
