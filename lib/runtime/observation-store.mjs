import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename } from "node:fs/promises";
import { join } from "node:path";
import {
  normalizeObservation,
  safeObservationError,
  validateProjection,
} from "../domain/observation.mjs";

const EVENT_FILE = "events.jsonl";
const PROJECTION_FILE = "observation.json";
const EVENT_TYPES = new Set([
  "observation.failed",
  "provider.observed",
  "session.observed",
  "session.terminal",
]);
const TERMINAL_STATES = new Set(["completed", "failed", "interrupted"]);
const OPAQUE_ID = /^[A-Za-z0-9._:-]{1,256}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const writerKey = Symbol.for("patchfleet.observation-writer");
const writer = (globalThis[writerKey] ??= { tail: Promise.resolve() });

export class StorageCorruptionError extends Error {
  constructor() {
    super("Local observation storage is corrupt");
    this.code = "LOCAL_STORAGE_CORRUPT";
  }
}

function dataDirectory(override) {
  return override ?? process.env.PATCHFLEET_DATA_DIR ?? join(process.cwd(), ".patchfleet");
}

function record(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
  return value;
}

function exact(value, keys) {
  const actual = Object.keys(record(value));
  if (actual.some((key) => !keys.includes(key))) throw new TypeError();
}

function iso(value) {
  if (typeof value !== "string" || new Date(value).toISOString() !== value) throw new TypeError();
  return value;
}

function validateError(value) {
  exact(value, ["code", "message"]);
  const safe = safeObservationError(value.code);
  if (value.message !== safe.message) throw new TypeError();
  return safe;
}

function validateEvent(value) {
  exact(value, ["id", "schemaVersion", "type", "recordedAt", "payload"]);
  if (!UUID.test(value.id) || value.schemaVersion !== 1 || !EVENT_TYPES.has(value.type)) {
    throw new TypeError();
  }
  iso(value.recordedAt);
  const payload = record(value.payload);

  if (value.type === "provider.observed") {
    exact(payload, ["providerId", "state", "version", "capabilities", "error", "observedAt", "sessionIds"]);
    if (payload.providerId !== "codex" || !Array.isArray(payload.sessionIds)) throw new TypeError();
    exact(payload.capabilities, ["recentObservation", "explicitLiveStatus"]);
    if (payload.error) validateError(payload.error);
    if (new Set(payload.sessionIds).size !== payload.sessionIds.length) throw new TypeError();
    for (const id of payload.sessionIds) if (!OPAQUE_ID.test(id)) throw new TypeError();
    normalizeObservation({
      provider: payload,
      observedAt: payload.observedAt,
      sessions: [],
    });
  } else if (value.type === "session.observed") {
    exact(payload, ["providerId", "providerSessionId", "status", "createdAt", "lastObservedAt", "terminalAt"]);
    if (payload.providerId !== "codex") throw new TypeError();
    normalizeObservation({
      provider: {
        state: "available",
        version: "0.0.0",
        capabilities: { recentObservation: true, explicitLiveStatus: true },
      },
      observedAt: payload.lastObservedAt,
      sessions: [payload],
    });
  } else if (value.type === "session.terminal") {
    exact(payload, ["providerId", "providerSessionId", "status", "lastObservedAt", "terminalAt"]);
    if (
      payload.providerId !== "codex" ||
      !OPAQUE_ID.test(payload.providerSessionId) ||
      !TERMINAL_STATES.has(payload.status)
    ) {
      throw new TypeError();
    }
    iso(payload.lastObservedAt);
    if (payload.terminalAt !== undefined) iso(payload.terminalAt);
  } else {
    exact(payload, ["providerId", "observedAt", "error"]);
    if (payload.providerId !== "codex") throw new TypeError();
    iso(payload.observedAt);
    validateError(payload.error);
  }
  return value;
}

function event(type, recordedAt, payload) {
  return validateEvent({ id: randomUUID(), schemaVersion: 1, type, recordedAt, payload });
}

async function readLog(directory) {
  let bytes;
  try {
    bytes = await readFile(join(directory, EVENT_FILE));
  } catch (error) {
    if (error.code === "ENOENT") return { events: [], validBytes: 0, incompleteTail: false };
    throw error;
  }

  const incompleteTail = bytes.length > 0 && bytes.at(-1) !== 10;
  const lastNewline = bytes.lastIndexOf(10);
  const validBytes = incompleteTail ? lastNewline + 1 : bytes.length;
  const text = bytes.subarray(0, validBytes).toString("utf8");
  const lines = text ? text.slice(0, -1).split("\n") : [];
  const events = [];
  const ids = new Set();
  try {
    for (const line of lines) {
      if (!line) throw new TypeError();
      const parsed = validateEvent(JSON.parse(line));
      if (ids.has(parsed.id)) throw new TypeError();
      ids.add(parsed.id);
      events.push(parsed);
    }
  } catch {
    throw new StorageCorruptionError();
  }
  return { events, validBytes, incompleteTail };
}

export async function replayEvents({ dataDir } = {}) {
  return (await readLog(dataDirectory(dataDir))).events;
}

export function projectEvents(events) {
  const sessions = new Map();
  let provider;
  let observedAt;
  let currentIds = [];

  try {
    for (const candidate of events) {
      const item = validateEvent(candidate);
      const payload = item.payload;
      if (item.type === "session.observed") {
        sessions.set(payload.providerSessionId, {
          providerSessionId: payload.providerSessionId,
          status: payload.status,
          createdAt: payload.createdAt,
          lastObservedAt: payload.lastObservedAt,
          ...(payload.terminalAt ? { terminalAt: payload.terminalAt } : {}),
        });
      } else if (item.type === "session.terminal") {
        const session = sessions.get(payload.providerSessionId);
        if (!session) throw new TypeError();
        sessions.set(payload.providerSessionId, {
          ...session,
          status: payload.status,
          lastObservedAt: payload.lastObservedAt,
          ...(payload.terminalAt ? { terminalAt: payload.terminalAt } : {}),
        });
      } else if (item.type === "provider.observed") {
        currentIds = payload.sessionIds;
        if (currentIds.some((id) => !sessions.has(id))) throw new TypeError();
        provider = {
          state: payload.state,
          version: payload.version,
          capabilities: payload.capabilities,
          ...(payload.error ? { error: payload.error } : {}),
        };
        observedAt = payload.observedAt;
      }
    }
    if (!provider) return null;
    return normalizeObservation({
      provider,
      observedAt,
      sessions: currentIds.map((id) => sessions.get(id)),
    });
  } catch (error) {
    if (error instanceof StorageCorruptionError) throw error;
    throw new StorageCorruptionError();
  }
}

async function writeProjection(directory, projection) {
  const target = join(directory, PROJECTION_FILE);
  const temporary = `${target}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(projection)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, target);
}

async function appendInternal(directory, additions, state) {
  const existingIds = new Set(state.events.map((item) => item.id));
  for (const item of additions) {
    validateEvent(item);
    if (existingIds.has(item.id)) throw new StorageCorruptionError();
    existingIds.add(item.id);
  }

  const combined = [...state.events, ...additions];
  const projection = projectEvents(combined);
  if (!projection) throw new StorageCorruptionError();

  await mkdir(directory, { recursive: true, mode: 0o700 });
  const logPath = join(directory, EVENT_FILE);
  if (state.incompleteTail) {
    const recovery = await open(logPath, "r+");
    try {
      await recovery.truncate(state.validBytes);
      await recovery.sync();
    } finally {
      await recovery.close();
    }
  }

  const log = await open(logPath, "a", 0o600);
  try {
    await log.writeFile(`${additions.map((item) => JSON.stringify(item)).join("\n")}\n`, "utf8");
    await log.sync();
  } finally {
    await log.close();
  }
  await writeProjection(directory, projection);
  return projection;
}

function serialized(operation) {
  const result = writer.tail.then(operation, operation);
  writer.tail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function appendEvents(additions, { dataDir } = {}) {
  return serialized(async () => {
    const directory = dataDirectory(dataDir);
    return appendInternal(directory, additions, await readLog(directory));
  });
}

export function persistObservation(value, { dataDir } = {}) {
  const observation = normalizeObservation(value);
  return serialized(async () => {
    const directory = dataDirectory(dataDir);
    const state = await readLog(directory);
    const latestStatus = new Map();
    for (const item of state.events) {
      if (item.type === "session.observed" || item.type === "session.terminal") {
        latestStatus.set(item.payload.providerSessionId, item.payload.status);
      }
    }
    const additions = [];

    for (const session of observation.sessions) {
      additions.push(event("session.observed", observation.observedAt, {
        providerId: "codex",
        ...session,
      }));
      if (
        TERMINAL_STATES.has(session.status) &&
        latestStatus.get(session.providerSessionId) !== session.status
      ) {
        additions.push(event("session.terminal", observation.observedAt, {
          providerId: "codex",
          providerSessionId: session.providerSessionId,
          status: session.status,
          lastObservedAt: session.lastObservedAt,
          ...(session.terminalAt ? { terminalAt: session.terminalAt } : {}),
        }));
      }
      latestStatus.set(session.providerSessionId, session.status);
    }

    if (observation.provider.error) {
      additions.push(event("observation.failed", observation.observedAt, {
        providerId: "codex",
        observedAt: observation.observedAt,
        error: observation.provider.error,
      }));
    }
    additions.push(event("provider.observed", observation.observedAt, {
      providerId: "codex",
      state: observation.provider.state,
      version: observation.provider.version,
      capabilities: observation.provider.capabilities,
      ...(observation.provider.error ? { error: observation.provider.error } : {}),
      observedAt: observation.observedAt,
      sessionIds: observation.sessions.map((session) => session.providerSessionId),
    }));

    return appendInternal(directory, additions, state);
  });
}

export function rebuildProjection({ dataDir } = {}) {
  return serialized(async () => {
    const directory = dataDirectory(dataDir);
    const projection = projectEvents((await readLog(directory)).events);
    if (projection) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeProjection(directory, projection);
    }
    return projection;
  });
}

export async function readProjection({ dataDir } = {}) {
  const directory = dataDirectory(dataDir);
  try {
    await readLog(directory);
    const content = await readFile(join(directory, PROJECTION_FILE), "utf8");
    return validateProjection(JSON.parse(content));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    if (error instanceof StorageCorruptionError) throw error;
    throw new StorageCorruptionError();
  }
}
