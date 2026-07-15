const ERROR_MESSAGES = Object.freeze({
  CODEX_APP_SERVER_EXITED: "Codex observation stopped unexpectedly.",
  CODEX_APP_SERVER_START_FAILED: "Codex observation could not start.",
  CODEX_APP_SERVER_TIMEOUT: "Codex observation timed out.",
  CODEX_NOT_FOUND: "Codex CLI is not installed or is not on PATH.",
  CODEX_PROBE_FAILED: "Codex CLI could not be checked.",
  CODEX_PROBE_TIMEOUT: "Codex CLI version check timed out.",
  CODEX_PROTOCOL_INVALID_JSON: "Codex returned an unsupported response.",
  CODEX_PROTOCOL_MALFORMED: "Codex returned an unsupported response.",
  CODEX_PROTOCOL_METHOD_ERROR: "Codex rejected the observation request.",
  CODEX_SYSTEM_ERROR: "Codex reported an observation error.",
  CODEX_VERSION_MALFORMED: "Codex CLI returned an unsupported version.",
});

const STATES = new Set(["available", "degraded", "unavailable"]);
const SESSION_STATES = new Set([
  "completed",
  "failed",
  "interrupted",
  "running",
  "unknown",
]);
const OPAQUE_ID = /^[A-Za-z0-9._:-]{1,256}$/;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/;

function record(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function iso(value, name) {
  if (typeof value !== "string" || new Date(value).toISOString() !== value) {
    throw new TypeError(`${name} must be an ISO timestamp`);
  }
  return value;
}

function exactKeys(value, allowed, name) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new TypeError(`${name} has an unknown field`);
  }
}

export function safeObservationError(code) {
  if (!Object.hasOwn(ERROR_MESSAGES, code)) {
    throw new TypeError("Unknown observation error code");
  }
  return { code, message: ERROR_MESSAGES[code] };
}

export function normalizeObservation(value) {
  const input = record(value, "observation");
  const provider = record(input.provider, "provider");
  if (!STATES.has(provider.state)) throw new TypeError("Invalid provider state");
  if (provider.version !== null && !VERSION.test(provider.version)) {
    throw new TypeError("Invalid provider version");
  }

  const capabilities = record(provider.capabilities, "capabilities");
  if (
    typeof capabilities.recentObservation !== "boolean" ||
    typeof capabilities.explicitLiveStatus !== "boolean"
  ) {
    throw new TypeError("Invalid provider capabilities");
  }

  const error = provider.error ? safeObservationError(provider.error.code) : undefined;
  if ((provider.state === "available") === Boolean(error)) {
    throw new TypeError("Provider state and error disagree");
  }

  if (!Array.isArray(input.sessions) || input.sessions.length > 20) {
    throw new TypeError("Invalid session list");
  }

  const seen = new Set();
  const sessions = input.sessions.map((candidate) => {
    const session = record(candidate, "session");
    if (!OPAQUE_ID.test(session.providerSessionId) || seen.has(session.providerSessionId)) {
      throw new TypeError("Invalid provider session id");
    }
    if (!SESSION_STATES.has(session.status)) throw new TypeError("Invalid session state");
    seen.add(session.providerSessionId);

    const normalized = {
      providerSessionId: session.providerSessionId,
      status: session.status,
      createdAt: iso(session.createdAt, "createdAt"),
      lastObservedAt: iso(session.lastObservedAt, "lastObservedAt"),
    };
    if (session.terminalAt !== undefined) {
      normalized.terminalAt = iso(session.terminalAt, "terminalAt");
    }
    return normalized;
  });

  if (provider.state === "unavailable" && sessions.length) {
    throw new TypeError("Unavailable provider cannot contain sessions");
  }

  return {
    schemaVersion: 1,
    provider: {
      id: "codex",
      displayName: "Codex",
      state: provider.state,
      version: provider.version,
      capabilities: {
        recentObservation: capabilities.recentObservation,
        explicitLiveStatus: capabilities.explicitLiveStatus,
      },
      ...(error ? { error } : {}),
    },
    observedAt: iso(input.observedAt, "observedAt"),
    sessions,
  };
}

export function validateProjection(value) {
  const input = record(value, "projection");
  exactKeys(input, ["schemaVersion", "provider", "observedAt", "sessions"], "projection");
  if (input.schemaVersion !== 1) throw new TypeError("Unsupported projection version");

  const provider = record(input.provider, "provider");
  exactKeys(
    provider,
    ["id", "displayName", "state", "version", "capabilities", "error"],
    "provider",
  );
  if (provider.id !== "codex" || provider.displayName !== "Codex") {
    throw new TypeError("Invalid provider identity");
  }
  exactKeys(
    record(provider.capabilities, "capabilities"),
    ["recentObservation", "explicitLiveStatus"],
    "capabilities",
  );
  if (provider.error) {
    exactKeys(record(provider.error, "error"), ["code", "message"], "error");
    if (safeObservationError(provider.error.code).message !== provider.error.message) {
      throw new TypeError("Unsafe observation error message");
    }
  }
  if (!Array.isArray(input.sessions)) throw new TypeError("Invalid session list");
  for (const session of input.sessions) {
    exactKeys(
      record(session, "session"),
      ["providerSessionId", "status", "createdAt", "lastObservedAt", "terminalAt"],
      "session",
    );
  }
  return normalizeObservation(input);
}
