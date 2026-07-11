import { createServer, type Server } from "node:http";
import { buildManifest, loadConfig, renderRouteWithPlugins } from "@documentee/core";

export interface DevOptions {
  port?: number;
  host?: string;
}

export async function devCommand(projectRoot: string, options: DevOptions = {}): Promise<Server> {
  const server = createServer(async (request, response) => {
    try {
      const config = await loadConfig(projectRoot);
      const manifest = await buildManifest(projectRoot, config);
      const routePath = normalizeRequestPath(request.url ?? "/");
      const route = manifest.routes.find((candidate) => candidate.route === routePath);

      if (!route) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(await renderRouteWithPlugins(manifest, route));
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port ?? 3000, options.host ?? "127.0.0.1", resolve);
  });

  return server;
}

function normalizeRequestPath(url: string): string {
  const parsed = new URL(url, "http://documentee.local");
  const path = parsed.pathname.replace(/\/+$/g, "");
  return path.length === 0 ? "/" : path;
}
