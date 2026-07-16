import { isAbsolute } from "node:path";

const COMMAND_TYPES = new Set(["enqueue_work", "remove_queued_work"]);
const OUTCOMES = new Set(["applied", "rejected", "expired", "failed"]);
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
  if (input.status !== "queued") throw new TypeError("invalid work status");

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
  if (input.type === "enqueue_work") {
    exact(payload, ["workItem"], "enqueue payload");
  } else {
    exact(payload, ["workItemId", "expectedItemRevision"], "remove payload");
  }

  const normalizedPayload = input.type === "enqueue_work"
    ? { workItem: validateWorkItem(payload.workItem) }
    : {
        workItemId: opaque(payload.workItemId, "workItemId"),
        expectedItemRevision: revision(payload.expectedItemRevision, "expected item revision", 1),
      };
  if (input.type === "enqueue_work" && normalizedPayload.workItem.revision !== 1) {
    throw new TypeError("new work item revision must be one");
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
  if (
    typeof input.reasonCode !== "string" ||
    !RECEIPT_REASONS[input.commandType]?.[input.outcome]?.has(input.reasonCode)
  ) {
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
  throw new TypeError("unsupported work event");
}

export function validateWorkProjection(value) {
  const input = record(value, "work projection");
  exact(input, ["schemaVersion", "revision", "items", "receipts"], "work projection");
  if (input.schemaVersion !== 1 || !Array.isArray(input.items) || !Array.isArray(input.receipts)) {
    throw new TypeError("unsupported work projection");
  }
  const items = input.items.map(validateWorkItem);
  const receipts = input.receipts.map(validateCommandReceipt);
  if (new Set(items.map((item) => item.workItemId)).size !== items.length) throw new TypeError("duplicate work item");
  if (new Set(receipts.map((item) => item.intentId)).size !== receipts.length) throw new TypeError("duplicate receipt");
  return {
    schemaVersion: 1,
    revision: revision(input.revision, "work projection revision"),
    items,
    receipts,
  };
}

export function projectWorkEvents(events) {
  const intents = new Map();
  const keys = new Set();
  const items = new Map();
  const seenWorkItemIds = new Set();
  const facts = new Map();
  const receipts = [];
  const receipted = new Set();
  let revisionValue = 0;
  let found = false;

  for (const candidate of events) {
    if (!candidate.type.startsWith("command.") && !candidate.type.startsWith("work.")) continue;
    found = true;
    const event = validateWorkEvent(candidate);
    if (event.type === "command.requested") {
      const { intent } = event.payload;
      if (intents.has(intent.intentId) || keys.has(intent.idempotencyKey)) throw new TypeError("duplicate command");
      intents.set(intent.intentId, intent);
      keys.add(intent.idempotencyKey);
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
    } else {
      const { receipt } = event.payload;
      const intent = intents.get(receipt.intentId);
      const fact = facts.get(receipt.intentId);
      const workItemId = intent?.type === "enqueue_work"
        ? intent.payload.workItem.workItemId
        : intent?.payload.workItemId;
      const item = items.get(workItemId);
      const appliedReason = fact === "work.enqueued" ? "WORK_ENQUEUED" : "WORK_REMOVED";
      const rejectedIsValid = intent?.type === "enqueue_work"
        ? receipt.reasonCode === "WORK_ITEM_EXISTS" && seenWorkItemIds.has(workItemId)
        : (
            (receipt.reasonCode === "WORK_ITEM_NOT_FOUND" && !item) ||
            (receipt.reasonCode === "WORK_ITEM_NOT_QUEUED" && Boolean(item) && item.status !== "queued") ||
            (
              receipt.reasonCode === "STALE_ITEM_REVISION" &&
              item?.status === "queued" &&
              item.revision !== intent?.payload.expectedItemRevision
            )
          );
      const outcomeIsValid =
        (receipt.outcome === "applied" && Boolean(fact) && receipt.reasonCode === appliedReason) ||
        (
          receipt.outcome === "rejected" &&
          !fact &&
          receipt.completedAt < intent?.expiresAt &&
          rejectedIsValid
        ) ||
        (
          receipt.outcome === "expired" &&
          !fact &&
          receipt.completedAt >= intent?.expiresAt
        ) ||
        (receipt.outcome === "failed" && !fact);
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
  return validateWorkProjection({
    schemaVersion: 1,
    revision: revisionValue,
    items: [...items.values()].sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt) || left.workItemId.localeCompare(right.workItemId),
    ),
    receipts,
  });
}
