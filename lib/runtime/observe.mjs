import { observeClaude } from "../providers/claude.mjs";
import { observeCodex } from "../providers/codex.mjs";
import { observeGemini } from "../providers/gemini.mjs";
import { persistObservation } from "./observation-store.mjs";

export async function refreshObservations({ dataDir } = {}) {
  const observations = await Promise.all([observeCodex(), observeClaude(), observeGemini()]);
  let projection;
  for (const observation of observations) {
    projection = await persistObservation(observation, { dataDir });
  }
  return projection;
}
