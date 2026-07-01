import { createServer, type Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { buildCommand } from "./build.js";

export interface PreviewOptions {
  outDir?: string;
  port?: number;
  host?: string;
}

export async function previewCommand(projectRoot: string, options: PreviewOptions = {}): Promise<Server> {
  const outDir = resolve(options.outDir ?? "dist");
  await buildCommand(projectRoot, outDir);

  const server = createServer(async (request, response) => {
    try {
      const filePath = await resolvePreviewFile(outDir, request.url ?? "/");
      if (!filePath) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      response.writeHead(200, { "content-type": contentType(filePath) });
      response.end(await readFile(filePath));
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise<void>((resolveListen) => {
    server.listen(options.port ?? 3000, options.host ?? "127.0.0.1", resolveListen);
  });

  return server;
}

async function resolvePreviewFile(outDir: string, url: string): Promise<string | undefined> {
  const parsed = new URL(url, "http://documentee.local");
  const pathname = decodeURIComponent(parsed.pathname);
  const safePath = pathname.replace(/^\/+/, "");
  const candidates = pathname.endsWith("/") || extname(pathname) === ""
    ? [join(outDir, safePath, "index.html"), join(outDir, safePath)]
    : [join(outDir, safePath)];

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (!isInside(outDir, resolved)) continue;
    if (await isFile(resolved)) return resolved;
  }

  return undefined;
}

function isInside(root: string, filePath: string): boolean {
  const path = relative(root, filePath);
  return path === "" || (!path.startsWith("..") && !path.startsWith("/"));
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function contentType(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".xml":
      return "application/xml; charset=utf-8";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
