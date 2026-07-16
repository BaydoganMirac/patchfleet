import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const mode = process.argv[2];
if (!new Set(["dev", "start"]).has(mode)) throw new TypeError("expected dev or start");

const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [
  require.resolve("next/dist/bin/next"),
  mode,
  ...(mode === "dev" ? ["--turbopack"] : []),
  "--hostname",
  "127.0.0.1",
], {
  env: {
    ...process.env,
    PATCHFLEET_OWNER_EPOCH: randomUUID(),
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}
child.once("error", (error) => {
  throw error;
});
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
