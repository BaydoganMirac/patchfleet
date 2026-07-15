import { observeCodex } from "../providers/codex.mjs";
import { persistObservation } from "./observation-store.mjs";

export async function refreshCodexObservation({
  adapter = observeCodex,
  adapterOptions,
  dataDir,
} = {}) {
  return persistObservation(await adapter(adapterOptions), { dataDir });
}
