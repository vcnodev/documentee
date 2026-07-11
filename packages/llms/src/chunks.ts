import type { ApiOperation } from "@documentee/openapi";
import type { SiteManifest, SiteRoute } from "@documentee/core";
import type { AgentChunk, AgentChunkIndex, AgentChunkApiOperation } from "./types.js";

interface Heading {
  level: number;
  title: string;
}

export function createAgentChunkIndex(manifest: SiteManifest): AgentChunkIndex {
  const chunks = [
    ...manifest.routes.filter((route) => route.kind === "page").flatMap((route) => chunksFromPage(route)),
    ...manifest.operations.map((operation) => chunkFromOperation(operation)),
  ].sort((a, b) => a.route.localeCompare(b.route) || a.headingPath.join("/").localeCompare(b.headingPath.join("/")));

  return { chunks };
}

function chunksFromPage(route: SiteRoute): AgentChunk[] {
  const chunks: AgentChunk[] = [];
  const headings: Heading[] = [];
  const buffer: string[] = [];

  for (const line of route.markdown.split(/\r?\n/)) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      while (headings.length > 0 && headings[headings.length - 1].level >= level) {
        headings.pop();
      }
      headings.push({ level, title: cleanHeading(heading[2]) });
      continue;
    }
    buffer.push(line);
  }

  flush();
  return chunks;

  function flush(): void {
    const text = buffer.join("\n").trim();
    buffer.length = 0;
    if (!text) return;

    chunks.push({
      route: route.route,
      headingPath: headings.length > 0 ? headings.map((heading) => heading.title) : [route.title],
      ...(route.sourceProjectPath ? { source: route.sourceProjectPath } : {}),
      text,
      links: linksFromMarkdown(text),
    });
  }
}

function chunkFromOperation(operation: ApiOperation): AgentChunk {
  const text = [operation.summary, operation.description].filter(Boolean).join("\n\n");
  return {
    route: operation.route,
    headingPath: [`${operation.method} ${operation.path}`],
    text,
    links: operation.responses.flatMap((response) => response.schemaRefs.map((schema) => `/schemas/${operation.specId}/${schema}`)),
    api: apiChunkMetadata(operation),
  };
}

function apiChunkMetadata(operation: ApiOperation): AgentChunkApiOperation {
  return {
    specId: operation.specId,
    method: operation.method,
    path: operation.path,
    tags: operation.tags,
    deprecated: operation.deprecated,
    beta: operation.beta,
    auth: operation.auth,
    parameters: operation.parameters.map((parameter) => ({
      name: parameter.name,
      location: parameter.location,
      required: parameter.required,
      ...(parameter.schemaType ? { schemaType: parameter.schemaType } : {}),
      ...(parameter.schemaRef ? { schemaRef: parameter.schemaRef } : {}),
    })),
    responses: operation.responses.map((response) => ({
      status: response.status,
      mediaTypes: response.mediaTypes,
      schemaRefs: response.schemaRefs,
    })),
  };
}

function linksFromMarkdown(markdown: string): string[] {
  const links = new Set<string>();
  for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    links.add(match[1]);
  }
  return [...links].sort();
}

function cleanHeading(value: string): string {
  return value.replace(/[`*_~]/g, "").replace(/\s+/g, " ").trim();
}
