import { randomUUID } from "node:crypto";
import {
  projectWorkEvents,
  validateCommandIntent,
} from "../domain/work.mjs";
import {
  commitEventTransaction,
  readWorkProjection,
  rebuildWorkProjection,
} from "./observation-store.mjs";

export { readWorkProjection, rebuildWorkProjection };

export class IdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key was already used by a different command");
    this.code = "IDEMPOTENCY_KEY_REUSED";
  }
}

function event(type, recordedAt, payload) {
  return { id: randomUUID(), schemaVersion: 1, type, recordedAt, payload };
}

function nowValue(now) {
  const value = now();
  if (typeof value !== "string" || new Date(value).toISOString() !== value) {
    throw new TypeError("now must return an ISO timestamp");
  }
  return value;
}

function existingCommand(events, intent) {
  let requested;
  let receipt;
  for (const item of events) {
    if (item.type === "command.requested") {
      const candidate = item.payload.intent;
      if (candidate.intentId === intent.intentId || candidate.idempotencyKey === intent.idempotencyKey) {
        if (requested && requested.intentId !== candidate.intentId) throw new IdempotencyConflictError();
        requested = candidate;
      }
    } else if (item.type === "command.receipted" && item.payload.receipt.intentId === intent.intentId) {
      receipt = item.payload.receipt;
    }
  }
  if (requested && JSON.stringify(requested) !== JSON.stringify(intent)) {
    throw new IdempotencyConflictError();
  }
  return { requested, receipt };
}

function receipt(intent, outcome, reasonCode, completedAt, revision) {
  return {
    schemaVersion: 1,
    intentId: intent.intentId,
    idempotencyKey: intent.idempotencyKey,
    commandType: intent.type,
    outcome,
    reasonCode,
    completedAt,
    workProjectionRevision: revision,
    workItemId: intent.type === "enqueue_work"
      ? intent.payload.workItem.workItemId
      : intent.payload.workItemId,
  };
}

export function applyWorkCommand(value, { dataDir, now = () => new Date().toISOString() } = {}) {
  const intent = validateCommandIntent(value);

  return commitEventTransaction((events) => {
    const existing = existingCommand(events, intent);
    if (existing.receipt) return { additions: [], result: () => existing.receipt };
    const completedAt = nowValue(now);

    const projection = projectWorkEvents(events) ?? {
      schemaVersion: 1,
      revision: 0,
      items: [],
      receipts: [],
    };
    const additions = existing.requested
      ? []
      : [event("command.requested", completedAt, { intent })];
    const existingFact = events.find(
      (candidate) => candidate.type.startsWith("work.") && candidate.payload.intentId === intent.intentId,
    );
    let outcome = "applied";
    let reasonCode;

    if (!existingFact && intent.expiresAt <= completedAt) {
      outcome = "expired";
      reasonCode = "COMMAND_EXPIRED";
    } else if (intent.type === "enqueue_work") {
      const item = intent.payload.workItem;
      const workItemExists = events.some(
        (candidate) =>
          candidate.type === "work.enqueued" &&
          candidate.payload.workItem.workItemId === item.workItemId,
      );
      if (existingFact?.type === "work.enqueued") {
        reasonCode = "WORK_ENQUEUED";
      } else if (workItemExists) {
        outcome = "rejected";
        reasonCode = "WORK_ITEM_EXISTS";
      } else {
        additions.push(event("work.enqueued", completedAt, { intentId: intent.intentId, workItem: item }));
        projection.revision += 1;
        reasonCode = "WORK_ENQUEUED";
      }
    } else {
      const { workItemId, expectedItemRevision } = intent.payload;
      const item = projection.items.find((candidate) => candidate.workItemId === workItemId);
      if (existingFact?.type === "work.removed") {
        reasonCode = "WORK_REMOVED";
      } else if (!item) {
        outcome = "rejected";
        reasonCode = "WORK_ITEM_NOT_FOUND";
      } else if (item.status !== "queued") {
        outcome = "rejected";
        reasonCode = "WORK_ITEM_NOT_QUEUED";
      } else if (item.revision !== expectedItemRevision) {
        outcome = "rejected";
        reasonCode = "STALE_ITEM_REVISION";
      } else {
        additions.push(event("work.removed", completedAt, {
          intentId: intent.intentId,
          workItemId,
          expectedItemRevision,
        }));
        projection.revision += 1;
        reasonCode = "WORK_REMOVED";
      }
    }

    const terminal = receipt(intent, outcome, reasonCode, completedAt, projection.revision);
    additions.push(event("command.receipted", completedAt, { receipt: terminal }));
    return { additions, result: () => terminal };
  }, { dataDir });
}
