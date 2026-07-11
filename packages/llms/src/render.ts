import type { SiteManifest } from "@documentee/core";
import { createAgentChunkIndex } from "./chunks.js";
import type { LlmsJsonDocument, LlmsJsonRoute } from "./types.js";

export function renderLlmsTxt(manifest: SiteManifest): string {
  const lines = [
    `# ${manifest.config.site.name}`,
    "",
    manifest.config.site.description,
    "",
    "## Docs",
    ...manifest.routes
      .filter((route) => route.kind === "page")
      .map((route) => `- [${route.title}](${route.route})${route.description ? `: ${route.description}` : ""}`),
    "",
    "## API Specifications",
    ...manifest.config.openapi.specs.map((spec) => `- OpenAPI spec \`${spec.id}\`: \`${spec.source}\``),
    "",
  ];

  return `${lines.filter((line, index) => line !== undefined && !(line === "" && lines[index - 1] === "")).join("\n")}\n`;
}

export function renderLlmsFullTxt(manifest: SiteManifest): string {
  const pageSections = manifest.routes
    .filter((route) => route.kind === "page")
    .map((route) => [`## ${route.title}`, "", route.description, "", route.markdown].filter(Boolean).join("\n"));

  const operationSections = manifest.operations.map((operation) =>
    [
      `## ${operation.method} ${operation.path}`,
      "",
      operation.summary,
      "",
      operation.description,
      "",
      `Route: ${operation.route}`,
    ].filter(Boolean).join("\n"),
  );

  return [
    `# ${manifest.config.site.name}`,
    "",
    manifest.config.site.description,
    "",
    ...pageSections,
    "",
    "# API Reference",
    "",
    ...operationSections,
    "",
  ].filter(Boolean).join("\n");
}

export function renderLlmsJson(manifest: SiteManifest): string {
  const chunksByRoute = new Map<string, ReturnType<typeof createAgentChunkIndex>["chunks"]>();
  for (const chunk of createAgentChunkIndex(manifest).chunks) {
    chunksByRoute.set(chunk.route, [...(chunksByRoute.get(chunk.route) ?? []), chunk]);
  }

  const document: LlmsJsonDocument = {
    site: {
      name: manifest.config.site.name,
      ...(manifest.config.site.description ? { description: manifest.config.site.description } : {}),
      ...(manifest.config.site.url ? { url: manifest.config.site.url } : {}),
    },
    routes: [
      ...manifest.routes
        .filter((route) => route.kind === "page")
        .map((route): LlmsJsonRoute => ({
          route: route.route,
          title: route.title,
          description: route.description,
          contentType: "guide",
          ...(route.sourceProjectPath ? { source: route.sourceProjectPath } : {}),
          chunks: chunksByRoute.get(route.route) ?? [],
        })),
      ...manifest.operations.map((operation): LlmsJsonRoute => ({
        route: operation.route,
        title: `${operation.method} ${operation.path}`,
        description: operation.summary ?? operation.description ?? "",
        contentType: "api-operation",
        api: {
          specId: operation.specId,
          method: operation.method,
          path: operation.path,
          tags: operation.tags,
          deprecated: operation.deprecated,
          beta: operation.beta,
          auth: operation.auth,
        },
        chunks: chunksByRoute.get(operation.route) ?? [],
      })),
    ].sort((a, b) => a.route.localeCompare(b.route)),
  };

  return `${JSON.stringify(document, null, 2)}\n`;
}
