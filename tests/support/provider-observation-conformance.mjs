import assert from "node:assert/strict";

const PROVIDER_STATES = new Set(["available", "degraded", "unavailable"]);
const SESSION_STATES = new Set([
  "completed",
  "failed",
  "interrupted",
  "running",
  "unknown",
]);
const TERMINAL_STATES = new Set(["completed", "failed", "interrupted"]);
const OPAQUE_ID = /^[A-Za-z0-9._:-]{1,256}$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function record(value, name) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${name} must be an object`);
}

function exact(value, keys, name) {
  record(value, name);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${name} fields must match`);
}

function timestamp(value, name) {
  assert.equal(typeof value, "string", `${name} must be a string`);
  assert(!Number.isNaN(Date.parse(value)), `${name} must be an ISO timestamp`);
  assert.equal(new Date(value).toISOString(), value, `${name} must be an ISO timestamp`);
}

export function assertProviderObservation(observation, expectedProvider, allowedErrors) {
  exact(expectedProvider, ["id", "displayName"], "expected provider");
  record(allowedErrors, "allowed errors");
  assert.equal(typeof expectedProvider.id, "string", "expected provider id must be a string");
  assert.equal(typeof expectedProvider.displayName, "string", "expected provider display name must be a string");
  exact(observation, ["schemaVersion", "provider", "observedAt", "sessions"], "observation");
  assert.equal(observation.schemaVersion, 1, "unsupported observation schema");

  const provider = observation.provider;
  exact(
    provider,
    ["id", "displayName", "state", "version", "capabilities", ...(Object.hasOwn(provider, "error") ? ["error"] : [])],
    "provider",
  );
  assert.equal(typeof provider.id, "string", "provider id must be a string");
  assert.equal(typeof provider.displayName, "string", "provider display name must be a string");
  assert.equal(provider.id, expectedProvider.id, "provider id must match");
  assert.equal(provider.displayName, expectedProvider.displayName, "provider display name must match");
  assert(PROVIDER_STATES.has(provider.state), "invalid provider state");
  assert(provider.version === null || (typeof provider.version === "string" && VERSION.test(provider.version)), "invalid provider version");

  exact(provider.capabilities, ["recentObservation", "explicitLiveStatus"], "capabilities");
  assert.equal(typeof provider.capabilities.recentObservation, "boolean", "invalid recent observation capability");
  assert.equal(typeof provider.capabilities.explicitLiveStatus, "boolean", "invalid live status capability");

  const hasError = Object.hasOwn(provider, "error");
  assert.equal(hasError, provider.state !== "available", "provider state and error must agree");
  if (hasError) {
    exact(provider.error, ["code", "message"], "provider error");
    assert.equal(typeof provider.error.code, "string", "invalid provider error code");
    assert.equal(typeof provider.error.message, "string", "invalid provider error message");
    assert(Object.hasOwn(allowedErrors, provider.error.code), "unknown provider error code");
    assert.equal(provider.error.message, allowedErrors[provider.error.code], "unsafe provider error message");
  }

  timestamp(observation.observedAt, "observedAt");
  assert(Array.isArray(observation.sessions), "sessions must be an array");
  assert(observation.sessions.length <= 20, "too many sessions");
  if (provider.state === "unavailable") assert.equal(observation.sessions.length, 0, "unavailable provider cannot contain sessions");

  const ids = new Set();
  for (const session of observation.sessions) {
    exact(
      session,
      ["providerSessionId", "status", "createdAt", "lastObservedAt", ...(Object.hasOwn(session, "terminalAt") ? ["terminalAt"] : [])],
      "session",
    );
    assert.equal(typeof session.providerSessionId, "string", "invalid provider session id");
    assert(OPAQUE_ID.test(session.providerSessionId), "invalid provider session id");
    assert(!ids.has(session.providerSessionId), "duplicate provider session id");
    ids.add(session.providerSessionId);
    assert(SESSION_STATES.has(session.status), "invalid session state");
    if (session.createdAt !== null) timestamp(session.createdAt, "createdAt");
    timestamp(session.lastObservedAt, "lastObservedAt");
    if (Object.hasOwn(session, "terminalAt")) {
      assert(TERMINAL_STATES.has(session.status), "terminalAt requires a terminal session");
      timestamp(session.terminalAt, "terminalAt");
    }
  }
}
