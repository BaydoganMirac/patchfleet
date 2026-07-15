const PROVIDERS = new Set(["claude", "codex", "gemini"]);
const STATES = new Set(["completed", "failed", "interrupted", "running", "unknown"]);
const OPAQUE_ID = /^[A-Za-z0-9._:-]{1,256}$/;
const FIELDS = ["schemaVersion", "providerId", "providerSessionId", "status", "observedAt"];

export function validateProviderLifecycleSignal(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("lifecycle signal must be an object");
  }
  const keys = Object.keys(value);
  if (keys.length !== FIELDS.length || !keys.every((key) => FIELDS.includes(key))) {
    throw new TypeError("lifecycle signal fields must match");
  }
  if (value.schemaVersion !== 1) throw new TypeError("unsupported lifecycle signal version");
  if (!PROVIDERS.has(value.providerId)) throw new TypeError("invalid provider id");
  if (typeof value.providerSessionId !== "string" || !OPAQUE_ID.test(value.providerSessionId)) {
    throw new TypeError("invalid provider session id");
  }
  if (!STATES.has(value.status)) throw new TypeError("invalid lifecycle status");
  if (
    typeof value.observedAt !== "string" ||
    Number.isNaN(Date.parse(value.observedAt)) ||
    new Date(value.observedAt).toISOString() !== value.observedAt
  ) {
    throw new TypeError("observedAt must be an ISO timestamp");
  }

  return {
    schemaVersion: 1,
    providerId: value.providerId,
    providerSessionId: value.providerSessionId,
    status: value.status,
    observedAt: value.observedAt,
  };
}
