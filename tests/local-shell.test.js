const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { request } = require("node:http");
const { createServer } = require("node:net");
const { readFile } = require("node:fs/promises");
const { test } = require("node:test");

const requiredHeaders = {
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  server.close();
  await once(server, "close");
  return port;
}

function fetch(port, host, setHost = true) {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: "127.0.0.1", port, path: "/", headers: host ? { host } : {}, setHost },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function waitForServer(port, child) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error("Next.js exited before serving");
    try {
      await fetch(port, `127.0.0.1:${port}`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("Timed out waiting for Next.js");
}

test("local shell binds to loopback and enforces its request boundary", { timeout: 30000 }, async () => {
  const { scripts } = JSON.parse(await readFile("package.json", "utf8"));
  assert.match(scripts.dev, /--hostname 127\.0\.0\.1/);
  assert.match(scripts.start, /--hostname 127\.0\.0\.1/);

  const port = await freePort();
  const child = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "dev", "--turbopack", "--hostname", "127.0.0.1", "--port", String(port)],
    { stdio: "ignore" },
  );

  try {
    await waitForServer(port, child);

    for (const host of ["localhost", `localhost:${port}`, "127.0.0.1", `127.0.0.1:${port}`]) {
      const response = await fetch(port, host);
      assert.equal(response.statusCode, 200, host);
      for (const [name, value] of Object.entries(requiredHeaders)) {
        assert.equal(response.headers[name], value, name);
      }
    }

    for (const host of ["example.com", "localhost.example.com", "localhost:abc", "127.0.0.1:65536"]) {
      assert.equal((await fetch(port, host)).statusCode, 403, host);
    }
    assert.ok((await fetch(port, null, false)).statusCode >= 400, "missing Host");
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
  }
});
