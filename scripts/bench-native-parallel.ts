import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";

const cases = [
  "button-circular",
  "button-disabled",
  "button-icon",
  "button-pill",
  "button-text-default",
  "button-text-destructive",
  "button-text-flat",
  "button-text-suggested",
  "link-default",
  "link-visited",
  "menu-button-circular",
  "menu-button-disabled",
  "menu-button-flat",
  "menu-button-icon",
  "menu-button-text-default",
  "toggle-disabled",
  "toggle-text-checked",
  "toggle-text-default",
  "toggle-text-flat",
] as const;

async function readListeningPort(stream: ReadableStream<Uint8Array> | null): Promise<number> {
  if (!stream) {
    throw new Error("Native server stdout is unavailable");
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      throw new Error(`Native server exited before reporting a port.\nPartial output: ${buffer}`);
    }

    buffer += decoder.decode(value, { stream: true });
    const newlineIndex = buffer.indexOf("\n");
    if (newlineIndex === -1) {
      continue;
    }

    const line = buffer.slice(0, newlineIndex).trim();
    const match = /^LISTENING:(\d+)$/.exec(line);
    if (!match) {
      throw new Error(`Unexpected native server startup line: ${line}`);
    }

    reader.releaseLock();
    return Number(match[1]);
  }
}

async function waitForReady(port: number): Promise<void> {
  const startedAt = performance.now();

  while (performance.now() - startedAt < 15_000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/ready`);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the server is ready.
    }

    await sleep(50);
  }

  throw new Error(`Native server on port ${port} did not become ready in time`);
}

const proc = spawn("xvfb-run", ["-a", "tests/native/target/debug/gtk-js-test", "serve"], {
  stdio: ["ignore", "pipe", "inherit"],
});

try {
  const port = await readListeningPort(Readable.toWeb(proc.stdout) as ReadableStream<Uint8Array>);
  await waitForReady(port);

  const overallStart = performance.now();
  const results = await Promise.all(
    cases.map(async (name) => {
      const start = performance.now();
      const response = await fetch(`http://127.0.0.1:${port}/${name}`);
      if (!response.ok) {
        throw new Error(`${name}: HTTP ${response.status}`);
      }

      await response.text();
      return {
        name,
        ms: performance.now() - start,
      };
    }),
  );

  const totalMs = performance.now() - overallStart;
  results.sort((a, b) => b.ms - a.ms);

  console.log(
    JSON.stringify(
      {
        count: results.length,
        totalMs,
        slowest: results.slice(0, 10),
      },
      null,
      2,
    ),
  );
} finally {
  proc.kill();
}
