import assert from "node:assert/strict";
import { test } from "node:test";
import { assertProviderObservation } from "./support/provider-observation-conformance.mjs";

const PROVIDER = Object.freeze({ id: "test", displayName: "Test Provider" });
const ERRORS = Object.freeze({ TEST_ERROR: "Safe test error." });
const valid = {
  schemaVersion: 1,
  provider: {
    id: "test",
    displayName: "Test Provider",
    state: "available",
    version: "1.2.3",
    capabilities: { recentObservation: true, explicitLiveStatus: true },
  },
  observedAt: "2026-07-15T12:00:00.000Z",
  sessions: [{
    providerSessionId: "session-1",
    status: "running",
    createdAt: "2026-07-15T11:00:00.000Z",
    lastObservedAt: "2026-07-15T12:00:00.000Z",
  }],
};

test("provider observation conformance accepts the minimum valid shape", () => {
  assert.doesNotThrow(() => assertProviderObservation(valid, PROVIDER, ERRORS));
  const prerelease = structuredClone(valid);
  prerelease.provider.version = "1.2.3-alpha+001";
  assert.doesNotThrow(() => assertProviderObservation(prerelease, PROVIDER, ERRORS));
});

test("provider observation conformance rejects unsafe normalized output", () => {
  const cases = [
    ["extra field", (value) => { value.extra = true; }],
    ["unsafe error", (value) => {
      value.provider.state = "degraded";
      value.provider.error = { code: "TEST_ERROR", message: "unsafe detail" };
    }],
    ["duplicate session id", (value) => { value.sessions.push(structuredClone(value.sessions[0])); }],
    ["invalid lifecycle", (value) => { value.sessions[0].status = "paused"; }],
    ["invalid timestamp", (value) => { value.observedAt = "not-a-timestamp"; }],
    ["leading zero version", (value) => { value.provider.version = "01.2.3"; }],
    ["empty prerelease identifier", (value) => { value.provider.version = "1.2.3-."; }],
    ["terminal timestamp on running session", (value) => {
      value.sessions[0].terminalAt = "2026-07-15T12:00:00.000Z";
    }],
  ];

  for (const [name, mutate] of cases) {
    const candidate = structuredClone(valid);
    mutate(candidate);
    assert.throws(() => assertProviderObservation(candidate, PROVIDER, ERRORS), undefined, name);
  }
});
