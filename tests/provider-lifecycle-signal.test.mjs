import assert from "node:assert/strict";
import { test } from "node:test";
import { validateProviderLifecycleSignal } from "../lib/domain/provider-lifecycle-signal.mjs";

const valid = {
  schemaVersion: 1,
  providerId: "codex",
  providerSessionId: "session-1",
  status: "running",
  observedAt: "2026-07-16T12:00:00.000Z",
};

test("lifecycle signal accepts only the normalized contract", () => {
  for (const providerId of ["claude", "codex", "gemini"]) {
    assert.deepEqual(validateProviderLifecycleSignal({ ...valid, providerId }), { ...valid, providerId });
  }
  for (const status of ["completed", "failed", "interrupted", "running", "unknown"]) {
    assert.equal(validateProviderLifecycleSignal({ ...valid, status }).status, status);
  }

  const normalized = validateProviderLifecycleSignal(valid);
  assert.notStrictEqual(normalized, valid);
});

test("lifecycle signal rejects invalid values", () => {
  const cases = [
    null,
    [],
    { ...valid, schemaVersion: 2 },
    { ...valid, schemaVersion: "1" },
    { ...valid, providerId: "other" },
    { ...valid, providerId: 1 },
    { ...valid, providerSessionId: "invalid id" },
    { ...valid, providerSessionId: "a".repeat(257) },
    { ...valid, providerSessionId: 1 },
    { ...valid, status: "waiting" },
    { ...valid, status: 1 },
    { ...valid, observedAt: "not-a-timestamp" },
    { ...valid, observedAt: "2026-07-16T12:00:00Z" },
    { ...valid, observedAt: 1 },
    { ...valid, extra: true },
  ];
  for (const key of Object.keys(valid)) {
    const candidate = { ...valid };
    delete candidate[key];
    cases.push(candidate);
  }

  for (const candidate of cases) {
    assert.throws(() => validateProviderLifecycleSignal(candidate), TypeError);
  }
});

test("lifecycle signal rejects forbidden payload fields", () => {
  const canary = "must-not-survive";
  for (const field of [
    "prompt",
    "response",
    "transcript",
    "cwd",
    "environment",
    "token",
    "source",
    "nativePayload",
  ]) {
    assert.throws(
      () => validateProviderLifecycleSignal({ ...valid, [field]: canary }),
      TypeError,
      field,
    );
  }
  assert(!JSON.stringify(validateProviderLifecycleSignal(valid)).includes(canary));
});
