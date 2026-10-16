import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { TestProject } from "vite-plus/test/node";
import { startTestServer } from "./server.ts";

declare module "vite-plus/test" {
  export interface ProvidedContext {
    webServerPort: number;
    nativeServerPort: number;
  }
}

function debugLog(message: string): void {
  if (process.env.GTK_JS_TEST_DEBUG != null) {
    console.error(`[setup] ${message}`);
  }
}

async function waitForNativeReady(port: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 15000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/ready`, {
        signal: AbortSignal.timeout(1000),
      });

      if (response.ok) {
        debugLog(`native server ready on ${port}`);
        return;
      }
    } catch {
      // Keep polling until the server is ready or times out.
    }

    await sleep(100);
  }

  throw new Error(`Native server on port ${port} did not become ready within 15s`);
}

async function waitForPortFile(path: string): Promise<number> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 15000) {
    try {
      const text = (await readFile(path, "utf8")).trim();
      const port = Number(text);
      if (Number.isInteger(port) && port > 0) {
        return port;
      }
    } catch {
      // Keep polling until the port file exists and contains a port.
    }

    await sleep(100);
  }

  throw new Error(`Native server did not write a port file within 15s: ${path}`);
}

/** Starts the web test server and the native GTK server for the `native` test project. */
export default async function setup(project: TestProject) {
  // Start the web test server while the native binary builds.
  const [server, cargoBuildExit] = await Promise.all([
    startTestServer(),
    new Promise<number | null>((resolve, reject) => {
      spawn("cargo", ["build", "--manifest-path", "tests/native/Cargo.toml"], { stdio: "inherit" })
        .on("exit", resolve)
        .on("error", reject);
    }),
  ]);
  debugLog(`web test server listening on ${server.port}`);

  if (cargoBuildExit !== 0) {
    await server.close();
    throw new Error(`cargo build failed (exit ${cargoBuildExit})`);
  }
  debugLog("native binary build finished");

  const nativeServerDir = await mkdtemp(join(tmpdir(), "gtk-js-native-"));
  const nativePortFile = join(nativeServerDir, "port");
  // In its own process group, so stopping it also stops the Xvfb that xvfb-run starts.
  const nativeServer = spawn(
    "xvfb-run",
    ["-a", "tests/native/target/debug/gtk-js-test", "serve", "--port-file", nativePortFile],
    { stdio: ["ignore", "ignore", "inherit"], detached: true },
  );
  debugLog(`spawned native server pid=${nativeServer.pid ?? "unknown"}`);

  const stop = async () => {
    debugLog("stopping native server and web server");
    if (nativeServer.pid != null) {
      try {
        process.kill(-nativeServer.pid);
      } catch {
        // Already exited.
      }
    }
    await server.close();
    await rm(nativeServerDir, { recursive: true, force: true });
  };

  try {
    const nativeServerPort = await waitForPortFile(nativePortFile);
    debugLog(`native server listening on ${nativeServerPort}`);
    await waitForNativeReady(nativeServerPort);

    project.provide("webServerPort", server.port);
    project.provide("nativeServerPort", nativeServerPort);
  } catch (error) {
    await stop();
    throw error;
  }

  return stop;
}
