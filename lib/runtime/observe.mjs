import { observeClaude } from "../providers/claude.mjs";
import { observeCodex } from "../providers/codex.mjs";
import { observeGemini } from "../providers/gemini.mjs";
import { drainGeminiInbox } from "./gemini-inbox.mjs";
import { persistGeminiLifecycleSignal, persistObservation } from "./observation-store.mjs";

export async function refreshObservations({ dataDir } = {}) {
  const observations = await Promise.all([observeCodex(), observeClaude(), observeGemini()]);
  let projection;
  for (const observation of observations) {
    const activeGemini = observation.provider.id === "gemini" && observation.provider.state === "available";
    const preserveGemini = observation.provider.id === "gemini" && (
      activeGemini || (
        observation.provider.state === "degraded" &&
        observation.provider.error?.code !== "GEMINI_HOOK_SETUP_REQUIRED"
      )
    );
    projection = await persistObservation(observation, {
      dataDir,
      preserveSessions: preserveGemini,
    });
    if (activeGemini) {
      projection = await drainGeminiInbox(
        (signal) => persistGeminiLifecycleSignal(signal, { dataDir }),
        { dataDir },
      ) ?? projection;
    }
  }
  return projection;
}
