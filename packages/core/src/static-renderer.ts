import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { escapeHtml } from "./html.js";
import { routeToOutputPath } from "./paths.js";
import type { SiteManifest, SiteRoute } from "./manifest.js";

export interface StaticRenderOptions {
  outDir: string;
  htmlBudgetBytes?: number;
}

export async function renderStaticSite(manifest: SiteManifest, options: StaticRenderOptions): Promise<void> {
  for (const route of manifest.routes) {
    const html = renderRoute(manifest, route);
    assertHtmlBudget(html, options.htmlBudgetBytes ?? 200_000, route.route);
    const outputPath = join(options.outDir, ...routeToOutputPath(route.route));
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html);
  }
}

export function renderRoute(manifest: SiteManifest, route: SiteRoute): string {
  const body = route.kind === "api-operation" && route.operation
    ? renderApiOperation(route)
    : route.kind === "schema" && route.schema
      ? renderSchema(route)
      : route.html;
  const nav = renderNavigation(manifest);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(route.title)} | ${escapeHtml(manifest.config.site.name)}</title>
  <meta name="description" content="${escapeHtml(route.description)}">
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
    nav { border-right: 1px solid #d4d4d8; padding: 24px; display: flex; flex-direction: column; gap: 10px; }
    main { max-width: 880px; padding: 40px; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .method { font-weight: 700; }
    .path { color: #52525b; }
  </style>
</head>
<body>
  <nav>
    <strong>${escapeHtml(manifest.config.site.name)}</strong>
    ${nav}
  </nav>
  <main>
    ${body}
  </main>
</body>
</html>
`;
}

function renderNavigation(manifest: SiteManifest): string {
  if (manifest.config.navigation.length === 0) {
    return manifest.routes
      .map((item) => `<a href="${hrefForRoute(item.route)}">${escapeHtml(item.title)}</a>`)
      .join("\n");
  }

  return manifest.config.navigation
    .map((group) => {
      const pageLinks = group.pages
        .map((pageRef) => routeFromPageRef(pageRef, manifest.config.content.directory))
        .map((route) => manifest.routes.find((candidate) => candidate.route === route))
        .filter((route): route is SiteRoute => Boolean(route))
        .map((item) => `<a href="${hrefForRoute(item.route)}">${escapeHtml(item.title)}</a>`);

      const apiLinks = group.openapi
        ? manifest.routes
            .filter((item) => item.operation?.specId === group.openapi)
            .map((item) => `<a href="${hrefForRoute(item.route)}">${escapeHtml(item.title)}</a>`)
        : [];

      return `<section class="nav-group">
  <span>${escapeHtml(group.group)}</span>
  ${[...pageLinks, ...apiLinks].join("\n  ")}
</section>`;
    })
    .join("\n");
}

export function assertHtmlBudget(html: string, budgetBytes: number, route = "route"): void {
  const bytes = Buffer.byteLength(html, "utf8");
  if (bytes > budgetBytes) {
    throw new Error(`${route} HTML payload is ${bytes} bytes, over budget ${budgetBytes} bytes`);
  }
}

function renderApiOperation(route: SiteRoute): string {
  const operation = route.operation;
  if (!operation) return "";
  const summary = operation.summary ? `<p>${escapeHtml(operation.summary)}</p>` : "";
  const description = operation.description ? `<p>${escapeHtml(operation.description)}</p>` : "";
  const tags = operation.tags.length > 0 ? `<p>Tags: ${operation.tags.map(escapeHtml).join(", ")}</p>` : "";
  const badges = [operation.deprecated ? "Deprecated" : "", operation.beta ? "Beta" : ""].filter(Boolean);
  const badgeHtml = badges.length > 0 ? `<p>${badges.map((badge) => `<span class="badge">${badge}</span>`).join(" ")}</p>` : "";
  const auth = operation.auth.length > 0 ? `<section><h2>Authentication</h2><p>${operation.auth.map(escapeHtml).join(", ")}</p></section>` : "";
  const parameters = operation.parameters.length > 0
    ? `<section><h2>Parameters</h2><table><tbody>${operation.parameters.map((parameter) => `<tr><td>${escapeHtml(parameter.name)}</td><td>${escapeHtml(parameter.location)}</td><td>${parameter.required ? "required" : "optional"}</td></tr>`).join("")}</tbody></table></section>`
    : "";
  const requestBody = operation.requestBody
    ? `<section><h2>Request Body</h2><p>${operation.requestBody.mediaTypes.map(escapeHtml).join(", ") || "No media type declared"}</p>${renderSchemaRefs(operation.requestBody.schemaRefs)}</section>`
    : "";
  const responses = operation.responses.length > 0
    ? `<section><h2>Responses</h2>${operation.responses.map((response) => `<article><h3>${escapeHtml(response.status)}</h3><p>${escapeHtml(response.description)}</p>${response.mediaTypes.length > 0 ? `<p>${response.mediaTypes.map(escapeHtml).join(", ")}</p>` : ""}${renderSchemaRefs(response.schemaRefs)}</article>`).join("")}</section>`
    : "";
  const codeSamples = operation.codeSamples.length > 0
    ? `<section><h2>Code Samples</h2>${operation.codeSamples.map((sample) => `<figure><figcaption>${escapeHtml(sample.lang)}</figcaption><pre><code>${escapeHtml(sample.source)}</code></pre></figure>`).join("")}</section>`
    : "";

  return `<article>
  <h1><span class="method">${escapeHtml(operation.method)}</span> <span class="path">${escapeHtml(operation.path)}</span></h1>
  ${badgeHtml}
  ${summary}
  ${description}
  ${tags}
  ${auth}
  ${parameters}
  ${requestBody}
  ${responses}
  ${codeSamples}
</article>`;
}

function renderSchema(route: SiteRoute): string {
  if (!route.schema) return "";
  return `<article>
  <h1>${escapeHtml(route.title)}</h1>
  <p>${escapeHtml(route.description)}</p>
  <p>Spec: ${escapeHtml(route.schema.specId)}</p>
</article>`;
}

function renderSchemaRefs(schemaRefs: string[]): string {
  if (schemaRefs.length === 0) return "";
  return `<p>Schemas: ${schemaRefs.map((schema) => `<a href="/schemas/${escapeHtml(schema)}/">${escapeHtml(schema)}</a>`).join(", ")}</p>`;
}

function hrefForRoute(route: string): string {
  if (route === "/") return "/";
  return `${route.replace(/\/$/g, "")}/`;
}

function routeFromPageRef(pageRef: string, contentDirectory: string): string {
  let value = pageRef.replace(/\.(mdx|md)$/i, "");
  const contentPrefix = `${contentDirectory.replace(/^\/+|\/+$/g, "")}/`;
  if (value.startsWith(contentPrefix)) value = value.slice(contentPrefix.length);
  if (value === "index") return "/";
  if (value.endsWith("/index")) value = value.slice(0, -"index".length).replace(/\/$/g, "");
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}
