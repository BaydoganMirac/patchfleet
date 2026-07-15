import { execFile } from "node:child_process";
import { validateProviderLifecycleSignal } from "../domain/provider-lifecycle-signal.mjs";

const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_HOOK_BYTES = 16_384;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const ERRORS = Object.freeze({
  GEMINI_HOOK_SETUP_REQUIRED: "Gemini CLI hook setup is required.",
  GEMINI_NOT_FOUND: "Gemini CLI is not installed or is not on PATH.",
  GEMINI_PROBE_FAILED: "Gemini CLI could not be checked.",
  GEMINI_PROBE_TIMEOUT: "Gemini CLI version check timed out.",
  GEMINI_VERSION_MALFORMED: "Gemini CLI returned an unsupported version.",
});
const HOOK_STATUS = Object.freeze({
  SessionStart: "unknown",
  BeforeAgent: "running",
  AfterAgent: "completed",
  SessionEnd: "unknown",
});

function observation(code, observedAt, version = null) {
  return {
    schemaVersion: 1,
    provider: {
      id: "gemini",
      displayName: "Gemini CLI",
      state: code === "GEMINI_NOT_FOUND" ? "unavailable" : "degraded",
      version,
      capabilities: { recentObservation: false, explicitLiveStatus: false },
      error: { code, message: ERRORS[code] },
    },
    observedAt,
    sessions: [],
  };
}

export function probeGemini({ command = "gemini", timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    execFile(
      command,
      ["--version"],
      { encoding: "utf8", maxBuffer: 1_024, timeout: timeoutMs, windowsHide: true },
      (error, stdout) => {
        if (error?.code === "ENOENT") {
          return resolve({ state: "unavailable", code: "GEMINI_NOT_FOUND", version: null });
        }
        if (error?.killed || error?.signal === "SIGTERM") {
          return resolve({ state: "degraded", code: "GEMINI_PROBE_TIMEOUT", version: null });
        }
        if (error) {
          return resolve({ state: "degraded", code: "GEMINI_PROBE_FAILED", version: null });
        }

        const version = stdout.trim();
        if (!VERSION.test(version)) {
          return resolve({ state: "degraded", code: "GEMINI_VERSION_MALFORMED", version: null });
        }
        return resolve({ state: "available", version });
      },
    );
  });
}

export async function observeGemini({
  command = "gemini",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = () => new Date(),
} = {}) {
  const observedAt = now().toISOString();
  const probe = await probeGemini({ command, timeoutMs });
  if (probe.state !== "available") return observation(probe.code, observedAt);
  return observation("GEMINI_HOOK_SETUP_REQUIRED", observedAt, probe.version);
}

export function decodeGeminiHook(input) {
  if (typeof input !== "string" || Buffer.byteLength(input) > MAX_HOOK_BYTES) {
    throw new TypeError("invalid Gemini hook payload");
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    throw new TypeError("invalid Gemini hook payload");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("invalid Gemini hook payload");
  }

  if (!Object.hasOwn(HOOK_STATUS, payload.hook_event_name)) {
    throw new TypeError("unsupported Gemini hook event");
  }
  const status = HOOK_STATUS[payload.hook_event_name];

  let signal;
  try {
    signal = validateProviderLifecycleSignal({
      schemaVersion: 1,
      providerId: "gemini",
      providerSessionId: payload.session_id,
      status,
      observedAt: payload.timestamp,
    });
  } catch {
    throw new TypeError("invalid Gemini hook payload");
  }

  return payload.hook_event_name === "SessionEnd" ? null : signal;
}
