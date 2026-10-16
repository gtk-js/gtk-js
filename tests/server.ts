import type { AddressInfo } from "node:net";
import { createServer } from "vite-plus";

/** Serves the test client (client.html) at /gallery and /<case-name>. */
export async function startTestServer(): Promise<{ port: number; close(): Promise<void> }> {
  const server = await createServer({
    configFile: false,
    root: import.meta.dirname,
    logLevel: "warn",
    server: { host: "127.0.0.1", port: 0, hmr: false },
    plugins: [
      {
        name: "gtk-js:test-client-routes",
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url != null && /^\/[a-z0-9-]+$/.test(req.url)) req.url = "/client.html";
            next();
          });
        },
      },
    ],
  });
  await server.listen();
  const { port } = server.httpServer!.address() as AddressInfo;
  return { port, close: () => server.close() };
}
