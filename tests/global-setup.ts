import { type ChildProcess, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { type BrowserServer, chromium, firefox } from "playwright";
import type { TestProject } from "vite-plus/test/node";
import { debugLog } from "./debug.ts";
import { startTestServer } from "./server.ts";

declare module "vite-plus/test" {
  export interface ProvidedContext {
    webServerPort: number;
    nativeServerPort: number;
    /** WebSocket endpoints of the browsers tests/setup.ts connects to, by browser name. */
    browserEndpoints: Record<string, string>;
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
        debugLog("setup", `native server ready on ${port}`);
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

/** Rejects when the process can't be started or exits; never resolves. */
function failure(child: ChildProcess, what: string): Promise<never> {
  const failed = new Promise<never>((_, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      reject(new Error(`${what} exited (${signal ?? `exit ${code}`})`)),
    );
  });
  // Handled by whoever races it; this only keeps a later exit from being unhandled.
  failed.catch(() => {});
  return failed;
}

/** Resolves when the command succeeds. */
function run(command: string, args: string[]): Promise<void> {
  const child = spawn(command, args, { stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args[0]} failed (${signal ?? `exit ${code}`})`)),
    );
  });
}

/**
 * Starts the servers and browsers the `native` test project uses: the web test server, a
 * Chromium and a Firefox (tests/setup.ts connects to them), and the native GTK server.
 * The browsers start while the native binary builds.
 */
export default async function setup(project: TestProject) {
  // Undone in reverse when setup fails, and at teardown.
  const cleanups: (() => unknown)[] = [];
  const stop = async () => {
    debugLog("setup", "stopping servers and browsers");
    for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  };

  const started = <T>(resource: Promise<T>, close: (value: T) => unknown) =>
    resource.then((value) => {
      cleanups.push(() => close(value));
      return value;
    });
  const launch = (type: typeof chromium) =>
    started(type.launchServer({ headless: true }), (browser) => browser.close());

  try {
    const tasks = [
      started(startTestServer(), (server) => server.close()),
      launch(chromium),
      launch(firefox),
      run("cargo", ["build", "--manifest-path", "tests/native/Cargo.toml"]),
    ] as const;
    // All of them, so that if one fails, whatever the others started is stopped too.
    await Promise.allSettled(tasks);
    const [server, chromiumServer, firefoxServer] = await Promise.all(tasks);
    const browsers: Record<string, BrowserServer> = {
      chromium: chromiumServer,
      firefox: firefoxServer,
    };
    debugLog("setup", `web test server on ${server.port}, browsers launched, native binary built`);

    const nativeServerDir = await mkdtemp(join(tmpdir(), "gtk-js-native-"));
    const removeDir = () => rmSync(nativeServerDir, { recursive: true, force: true });
    cleanups.push(removeDir);
    const nativePortFile = join(nativeServerDir, "port");
    // In its own process group, so stopping it also stops the Xvfb that xvfb-run starts.
    const nativeServer = spawn(
      "xvfb-run",
      ["-a", "tests/native/target/debug/gtk-js-test", "serve", "--port-file", nativePortFile],
      { stdio: ["ignore", "ignore", "inherit"], detached: true },
    );
    const stopNativeServer = () => {
      if (nativeServer.pid == null || nativeServer.exitCode != null) return;
      try {
        process.kill(-nativeServer.pid);
      } catch {
        // Already exited.
      }
    };
    // Vitest exits on Ctrl-C without running the teardown, and the terminal's SIGINT doesn't
    // reach the server's own process group: stop it, synchronously, however the run ends.
    const onExit = () => {
      stopNativeServer();
      removeDir();
    };
    process.once("exit", onExit);
    cleanups.push(stopNativeServer, () => process.off("exit", onExit));
    debugLog("setup", `spawned native server pid=${nativeServer.pid ?? "unknown"}`);

    const nativeServerExited = failure(nativeServer, "The native server");
    const nativeServerPort = await Promise.race([
      waitForPortFile(nativePortFile),
      nativeServerExited,
    ]);
    debugLog("setup", `native server listening on ${nativeServerPort}`);
    await Promise.race([waitForNativeReady(nativeServerPort), nativeServerExited]);

    project.provide("webServerPort", server.port);
    project.provide("nativeServerPort", nativeServerPort);
    project.provide(
      "browserEndpoints",
      Object.fromEntries(Object.entries(browsers).map(([name, b]) => [name, b.wsEndpoint()])),
    );
  } catch (error) {
    await stop();
    throw error;
  }

  return stop;
}
