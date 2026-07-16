import { randomUUID } from "node:crypto";
import {
  projectWorkEvents,
  validateCommandIntent,
} from "../domain/work.mjs";
import {
  cancelCodexRun,
  prepareCodexWork,
  startCodexWork,
} from "../providers/codex-control.mjs";
import {
  commitEventTransaction,
  readWorkProjection,
  rebuildWorkProjection,
} from "./observation-store.mjs";

export { readWorkProjection, rebuildWorkProjection };

const controlKey = Symbol.for("patchfleet.work-control-writer");
const controlWriter = (globalThis[controlKey] ??= { tail: Promise.resolve() });
const OPAQUE_ID = /^[A-Za-z0-9._:-]{1,256}$/;
const fallbackOwnerKey = Symbol.for("patchfleet.work-control-owner-epoch");
const runtimeOwnerEpoch = process.env["PATCHFLEET_OWNER_EPOCH"] ??
  (globalThis[fallbackOwnerKey] ??= randomUUID());

export function currentWorkControlOwnerEpoch() {
  return runtimeOwnerEpoch;
}

function checkedOwnerEpoch(value) {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) throw new TypeError("invalid owner epoch");
  return value;
}

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

function emptyProjection() {
  return { schemaVersion: 1, revision: 0, items: [], runs: [], receipts: [] };
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

function receipt(intent, outcome, reasonCode, completedAt, revision, workItemId) {
  return {
    schemaVersion: 1,
    intentId: intent.intentId,
    idempotencyKey: intent.idempotencyKey,
    commandType: intent.type,
    outcome,
    reasonCode,
    completedAt,
    workProjectionRevision: revision,
    workItemId,
  };
}

function workItemId(intent, projection) {
  if (intent.type === "enqueue_work") return intent.payload.workItem.workItemId;
  if (intent.type === "cancel_run") {
    return projection.runs.find((run) => run.runId === intent.payload.runId)?.workItemId ?? null;
  }
  return intent.payload.workItemId;
}

function pendingTarget(events, intent) {
  const receipted = new Set(events
    .filter((item) => item.type === "command.receipted")
    .map((item) => item.payload.receipt.intentId));
  return events.some((item) => {
    if (item.type !== "command.requested" || receipted.has(item.payload.intent.intentId)) return false;
    const candidate = item.payload.intent;
    if (candidate.intentId === intent.intentId || candidate.type !== intent.type) return false;
    return intent.type === "start_work"
      ? candidate.payload.workItemId === intent.payload.workItemId
      : candidate.payload.runId === intent.payload.runId;
  });
}

function serializedControl(operation) {
  const result = controlWriter.tail.then(operation, operation);
  controlWriter.tail = result.then(() => undefined, () => undefined);
  return result;
}

export function reconcileWorkControlOwnership({
  dataDir,
  now = () => new Date().toISOString(),
  ownerEpoch = runtimeOwnerEpoch,
} = {}) {
  const currentEpoch = checkedOwnerEpoch(ownerEpoch);
  return commitEventTransaction((events) => {
    const projection = projectWorkEvents(events);
    if (!projection) return { additions: [], result: () => false };
    const recordedAt = nowValue(now);
    const intents = new Map(events
      .filter((item) => item.type === "command.requested")
      .map((item) => [item.payload.intent.intentId, item.payload.intent]));
    const receipted = new Set(events
      .filter((item) => item.type === "command.receipted")
      .map((item) => item.payload.receipt.intentId));
    const terminalStarts = new Set(events
      .filter((item) => item.type === "run.started" || item.type === "run.start_unknown")
      .map((item) => item.payload.intentId));
    const additions = [];
    let revision = projection.revision;

    for (const launchEvent of events.filter((item) => item.type === "run.launching")) {
      const launch = launchEvent.payload;
      const intent = intents.get(launch.intentId);
      if (
        launch.ownerEpoch === currentEpoch ||
        !intent ||
        receipted.has(launch.intentId) ||
        terminalStarts.has(launch.intentId)
      ) {
        continue;
      }
      additions.push(event("run.start_unknown", recordedAt, {
        intentId: launch.intentId,
        workItemId: launch.workItemId,
        expectedItemRevision: launch.expectedItemRevision,
        ownerEpoch: launch.ownerEpoch,
      }));
      revision += 1;
      const terminal = receipt(
        intent,
        "failed",
        "START_OUTCOME_UNKNOWN",
        recordedAt,
        revision,
        launch.workItemId,
      );
      additions.push(event("command.receipted", recordedAt, { receipt: terminal }));
    }

    for (const run of projection.runs) {
      if (
        run.ownerEpoch === currentEpoch ||
        !["running", "cancelling"].includes(run.status)
      ) {
        continue;
      }
      additions.push(event("run.session_lost", recordedAt, {
        runId: run.runId,
        ownerEpoch: run.ownerEpoch,
      }));
      revision += 1;
      for (const intent of intents.values()) {
        if (
          intent.type !== "cancel_run" ||
          intent.payload.runId !== run.runId ||
          receipted.has(intent.intentId)
        ) {
          continue;
        }
        additions.push(event("command.receipted", recordedAt, { receipt: receipt(
          intent,
          "failed",
          "RUN_SESSION_LOST",
          recordedAt,
          revision,
          run.workItemId,
        ) }));
        receipted.add(intent.intentId);
      }
    }
    return { additions, result: () => additions.length > 0 };
  }, { dataDir });
}

export function applyWorkCommand(value, { dataDir, now = () => new Date().toISOString() } = {}) {
  const intent = validateCommandIntent(value);
  if (!["enqueue_work", "remove_queued_work"].includes(intent.type)) {
    throw new TypeError("control command requires applyWorkControlCommand");
  }

  return commitEventTransaction((events) => {
    const existing = existingCommand(events, intent);
    if (existing.receipt) return { additions: [], result: () => existing.receipt };
    const completedAt = nowValue(now);
    const projection = projectWorkEvents(events) ?? emptyProjection();
    const additions = existing.requested ? [] : [event("command.requested", completedAt, { intent })];
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
        (candidate) => candidate.type === "work.enqueued" && candidate.payload.workItem.workItemId === item.workItemId,
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
      const { workItemId: itemId, expectedItemRevision } = intent.payload;
      const item = projection.items.find((candidate) => candidate.workItemId === itemId);
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
          workItemId: itemId,
          expectedItemRevision,
        }));
        projection.revision += 1;
        reasonCode = "WORK_REMOVED";
      }
    }

    const terminal = receipt(
      intent,
      outcome,
      reasonCode,
      completedAt,
      projection.revision,
      workItemId(intent, projection),
    );
    additions.push(event("command.receipted", completedAt, { receipt: terminal }));
    return { additions, result: () => terminal };
  }, { dataDir });
}

function prepareControl(intent, { dataDir, now, providerAvailable, ownerEpoch }) {
  return commitEventTransaction((events) => {
    const existing = existingCommand(events, intent);
    if (existing.receipt) return { additions: [], result: () => ({ receipt: existing.receipt }) };
    const completedAt = nowValue(now);
    const projection = projectWorkEvents(events) ?? emptyProjection();
    const additions = existing.requested ? [] : [event("command.requested", completedAt, { intent })];
    const itemId = workItemId(intent, projection);
    let outcome;
    let reasonCode;
    let target;

    if (existing.requested) {
      const requestIndex = events.findIndex((candidate) =>
        candidate.type === "command.requested" && candidate.payload.intent.intentId === intent.intentId);
      const fact = events.slice(requestIndex + 1).find((candidate) =>
        (
          candidate.payload.intentId === intent.intentId &&
          ["run.started", "run.start_unknown", "run.interrupted"].includes(candidate.type)
        ) || (
          intent.type === "cancel_run" &&
          candidate.type === "run.session_lost" &&
          candidate.payload.runId === intent.payload.runId
        ));
      const recovered = {
        "run.started": ["applied", "WORK_STARTED"],
        "run.start_unknown": ["failed", "START_OUTCOME_UNKNOWN"],
        "run.interrupted": ["applied", "RUN_CANCELLED"],
        "run.session_lost": ["failed", "RUN_SESSION_LOST"],
      }[fact?.type];
      if (recovered) {
        const terminal = receipt(
          intent,
          recovered[0],
          recovered[1],
          completedAt,
          projection.revision,
          itemId,
        );
        additions.push(event("command.receipted", completedAt, { receipt: terminal }));
        return { additions, result: () => ({ receipt: terminal }) };
      }
    }

    if (intent.expiresAt <= completedAt) {
      outcome = "expired";
      reasonCode = "COMMAND_EXPIRED";
    } else if (!providerAvailable) {
      outcome = "rejected";
      reasonCode = "PROVIDER_CONTROL_UNAVAILABLE";
    } else if (pendingTarget(events, intent)) {
      outcome = "rejected";
      reasonCode = intent.type === "start_work" ? "WORK_START_PENDING" : "RUN_CANCEL_PENDING";
    } else if (intent.type === "start_work") {
      const item = projection.items.find((candidate) => candidate.workItemId === intent.payload.workItemId);
      const ownPending = existing.requested && item?.status === "launching";
      if (!item) {
        outcome = "rejected";
        reasonCode = "WORK_ITEM_NOT_FOUND";
      } else if (item.status !== "queued" && !ownPending) {
        outcome = "rejected";
        reasonCode = "WORK_ITEM_NOT_QUEUED";
      } else if (item.revision !== intent.payload.expectedItemRevision) {
        outcome = "rejected";
        reasonCode = "STALE_ITEM_REVISION";
      } else {
        const launch = events.find(
          (candidate) => candidate.type === "run.launching" && candidate.payload.intentId === intent.intentId,
        );
        const preparation = events.find(
          (candidate) => candidate.type === "run.prepared" && candidate.payload.intentId === intent.intentId,
        );
        const turnRequest = events.find(
          (candidate) => candidate.type === "turn.requested" && candidate.payload.intentId === intent.intentId,
        );
        const launchOwnerEpoch = launch?.payload.ownerEpoch ?? ownerEpoch;
        if (!launch) {
          additions.push(event("run.launching", completedAt, {
            intentId: intent.intentId,
            workItemId: item.workItemId,
            expectedItemRevision: intent.payload.expectedItemRevision,
            ownerEpoch: launchOwnerEpoch,
          }));
        }
        target = {
          ...item,
          ownerEpoch: launchOwnerEpoch,
          ...(preparation ? { providerSessionId: preparation.payload.providerSessionId } : {}),
          turnRequested: Boolean(turnRequest),
        };
      }
    } else {
      const run = projection.runs.find((candidate) => candidate.runId === intent.payload.runId);
      const ownPending = existing.requested && run?.status === "cancelling";
      if (!run) {
        outcome = "rejected";
        reasonCode = "RUN_NOT_FOUND";
      } else if (run.status !== "running" && !ownPending) {
        outcome = "rejected";
        reasonCode = "RUN_NOT_ACTIVE";
      } else if (run.revision !== intent.payload.expectedRunRevision) {
        outcome = "rejected";
        reasonCode = "STALE_RUN_REVISION";
      } else {
        target = {
          ...run,
          workingDirectory: projection.items.find((candidate) => candidate.workItemId === run.workItemId)?.workingDirectory,
        };
      }
    }

    if (target) return { additions, result: () => ({ target }) };
    const terminal = receipt(intent, outcome, reasonCode, completedAt, projection.revision, itemId);
    additions.push(event("command.receipted", completedAt, { receipt: terminal }));
    return { additions, result: () => ({ receipt: terminal }) };
  }, { dataDir });
}

function checkpointStart(intent, target, providerSessionId, { dataDir, now }) {
  return commitEventTransaction((events) => {
    const existing = existingCommand(events, intent);
    if (existing.receipt) throw new TypeError("command is already terminal");
    if (!existing.requested) throw new TypeError("missing command request");
    const preparation = events.find(
      (candidate) => candidate.type === "run.prepared" && candidate.payload.intentId === intent.intentId,
    );
    const turnRequest = events.find(
      (candidate) => candidate.type === "turn.requested" && candidate.payload.intentId === intent.intentId,
    );
    if (preparation) {
      if (
        preparation.payload.providerSessionId !== providerSessionId ||
        preparation.payload.ownerEpoch !== target.ownerEpoch ||
        (turnRequest && (
          turnRequest.payload.providerSessionId !== providerSessionId ||
          turnRequest.payload.ownerEpoch !== target.ownerEpoch
        ))
      ) {
        throw new TypeError("run preparation conflict");
      }
      const additions = turnRequest ? [] : [event("turn.requested", nowValue(now), {
        intentId: intent.intentId,
        providerSessionId,
        ownerEpoch: target.ownerEpoch,
      })];
      return { additions, result: () => ({ providerSessionId }) };
    }
    const recordedAt = nowValue(now);
    return {
      additions: [event("run.prepared", recordedAt, {
        intentId: intent.intentId,
        workItemId: target.workItemId,
        providerId: "codex",
        providerSessionId,
        expectedItemRevision: intent.payload.expectedItemRevision,
        ownerEpoch: target.ownerEpoch,
      }), event("turn.requested", recordedAt, {
        intentId: intent.intentId,
        providerSessionId,
        ownerEpoch: target.ownerEpoch,
      })],
      result: () => ({ providerSessionId }),
    };
  }, { dataDir });
}

function finishControl(intent, target, result, { dataDir, now, outcome, reasonCode }) {
  return commitEventTransaction((events) => {
    const existing = existingCommand(events, intent);
    if (existing.receipt) return { additions: [], result: () => existing.receipt };
    if (!existing.requested) throw new TypeError("missing command request");
    const completedAt = nowValue(now);
    const projection = projectWorkEvents(events) ?? emptyProjection();
    const additions = [];
    const currentRun = intent.type === "cancel_run"
      ? projection.runs.find((candidate) => candidate.runId === intent.payload.runId)
      : null;
    let terminalOutcome = outcome;
    let terminalReasonCode = reasonCode;

    if (outcome === "applied" && intent.type === "start_work") {
      additions.push(event("run.started", completedAt, {
        intentId: intent.intentId,
        expectedItemRevision: intent.payload.expectedItemRevision,
        ownerEpoch: target.ownerEpoch,
        run: {
          schemaVersion: 1,
          runId: `run:${intent.intentId}`,
          workItemId: target.workItemId,
          providerId: "codex",
          ownerEpoch: target.ownerEpoch,
          providerSessionId: result.providerSessionId,
          providerTurnId: result.providerTurnId,
          status: result.status,
          startedAt: completedAt,
          terminalAt: result.terminalAt,
          revision: 1,
        },
      }));
      projection.revision += 1;
    } else if (
      outcome === "failed" &&
      intent.type === "start_work" &&
      reasonCode === "START_OUTCOME_UNKNOWN"
    ) {
      additions.push(event("run.start_unknown", completedAt, {
        intentId: intent.intentId,
        workItemId: target.workItemId,
        expectedItemRevision: intent.payload.expectedItemRevision,
        ownerEpoch: target.ownerEpoch,
      }));
      projection.revision += 1;
    } else if (
      outcome === "failed" &&
      intent.type === "cancel_run" &&
      reasonCode === "RUN_SESSION_LOST"
    ) {
      if (currentRun?.status === "cancelling") {
        additions.push(event("run.session_lost", completedAt, {
          runId: target.runId,
          ownerEpoch: target.ownerEpoch,
        }));
        projection.revision += 1;
      } else if (currentRun?.status !== "failed") {
        terminalReasonCode = "PROVIDER_CONTROL_FAILED";
      }
    } else if (outcome === "applied") {
      if (["cancelling", "interrupted"].includes(currentRun?.status)) {
        additions.push(event("run.interrupted", completedAt, {
          intentId: intent.intentId,
          runId: target.runId,
          expectedRunRevision: intent.payload.expectedRunRevision,
        }));
        if (currentRun.status === "cancelling") projection.revision += 1;
      } else {
        terminalOutcome = "failed";
        terminalReasonCode = "PROVIDER_CONTROL_FAILED";
      }
    }

    const terminal = receipt(
      intent,
      terminalOutcome,
      terminalReasonCode,
      completedAt,
      projection.revision,
      target.workItemId,
    );
    additions.push(event("command.receipted", completedAt, { receipt: terminal }));
    return { additions, result: () => terminal };
  }, { dataDir });
}

export function applyWorkControlCommand(value, {
  dataDir,
  now = () => new Date().toISOString(),
  providerAvailable = true,
  command = "codex",
  timeoutMs = 5_000,
  ownerEpoch = runtimeOwnerEpoch,
  prepare = prepareCodexWork,
  start = startCodexWork,
  cancel = cancelCodexRun,
} = {}) {
  const intent = validateCommandIntent(value);
  if (!["start_work", "cancel_run"].includes(intent.type)) {
    throw new TypeError("queue command requires applyWorkCommand");
  }
  const currentEpoch = checkedOwnerEpoch(ownerEpoch);

  return serializedControl(async () => {
    await reconcileWorkControlOwnership({ dataDir, now, ownerEpoch: currentEpoch });
    const prepared = await prepareControl(intent, {
      dataDir,
      now,
      providerAvailable,
      ownerEpoch: currentEpoch,
    });
    if (prepared.receipt) return prepared.receipt;
    const target = prepared.target;
    let checkpointing = false;
    let finalizing = false;
    if (intent.type === "start_work" && target.turnRequested) {
      return finishControl(intent, target, null, {
        dataDir,
        now,
        outcome: "failed",
        reasonCode: "START_OUTCOME_UNKNOWN",
      });
    }
    try {
      if (intent.type === "start_work") {
        let providerSessionId = target.providerSessionId;
        if (!providerSessionId) {
          const result = await prepare({
            intentId: intent.intentId,
            workingDirectory: target.workingDirectory,
            command,
            timeoutMs,
          });
          providerSessionId = result.providerSessionId;
        }
        if (!target.turnRequested) {
          checkpointing = true;
          providerSessionId = (await checkpointStart(
            intent,
            target,
            providerSessionId,
            { dataDir, now },
          )).providerSessionId;
          checkpointing = false;
        }
        const result = await start({
          intentId: intent.intentId,
          instruction: target.instruction,
          providerSessionId,
          workingDirectory: target.workingDirectory,
          command,
          timeoutMs,
        });
        finalizing = true;
        return finishControl(intent, target, result, {
          dataDir,
          now,
          outcome: "applied",
          reasonCode: "WORK_STARTED",
        });
      }
      await cancel({
        runId: target.runId,
        providerSessionId: target.providerSessionId,
        providerTurnId: target.providerTurnId,
        workingDirectory: target.workingDirectory,
        command,
        timeoutMs,
      });
      finalizing = true;
      return finishControl(intent, target, null, {
        dataDir,
        now,
        outcome: "applied",
        reasonCode: "RUN_CANCELLED",
      });
    } catch (error) {
      if (intent.type === "start_work" && (checkpointing || finalizing || error?.outcomeUnknown)) {
        return finishControl(intent, target, null, {
          dataDir,
          now,
          outcome: "failed",
          reasonCode: "START_OUTCOME_UNKNOWN",
        });
      }
      if (
        intent.type === "cancel_run" &&
        (finalizing || error?.outcomeUnknown || error?.code === "CODEX_SESSION_LOST")
      ) {
        return finishControl(intent, target, null, {
          dataDir,
          now,
          outcome: "failed",
          reasonCode: "RUN_SESSION_LOST",
        });
      }
      const rejected = error?.code === "WORKSPACE_NOT_ALLOWED" || error?.code === "CODEX_RUN_NOT_ACTIVE";
      return finishControl(intent, target, null, {
        dataDir,
        now,
        outcome: rejected ? "rejected" : "failed",
        reasonCode: error?.code === "WORKSPACE_NOT_ALLOWED"
          ? "WORKSPACE_NOT_ALLOWED"
          : error?.code === "CODEX_RUN_NOT_ACTIVE"
            ? "RUN_NOT_ACTIVE"
            : "PROVIDER_CONTROL_FAILED",
      });
    }
  });
}
