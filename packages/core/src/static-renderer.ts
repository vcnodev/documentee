import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { escapeHtml } from "./html.js";
import { routeToOutputPath } from "./paths.js";
import { renderPlaygroundScript } from "./playground.js";
import { getRedirects, getSeoConfig, renderRedirectHtml, renderRedirectsFile, renderRobotsTxt, renderSeoHead, renderSitemapXml, renderVercelRedirectsJson } from "./seo.js";
import type { SiteManifest, SiteRoute } from "./manifest.js";

export interface StaticRenderOptions {
  outDir: string;
  htmlBudgetBytes?: number;
}

export async function renderStaticSite(manifest: SiteManifest, options: StaticRenderOptions): Promise<void> {
  await mkdir(options.outDir, { recursive: true });
  for (const route of manifest.routes) {
    const html = renderRoute(manifest, route);
    assertHtmlBudget(html, options.htmlBudgetBytes ?? 200_000, route.route);
    const outputPath = join(options.outDir, ...routeToOutputPath(route.route));
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html);
  }

  const seo = getSeoConfig(manifest.config);
  const redirects = getRedirects(manifest.config);

  if (seo.sitemap && manifest.config.site.url) {
    await writeFile(join(options.outDir, "sitemap.xml"), renderSitemapXml(manifest));
  }

  if (seo.robots.enabled) {
    await writeFile(join(options.outDir, "robots.txt"), renderRobotsTxt(manifest));
  }

  if (redirects.length > 0) {
    await writeFile(join(options.outDir, "_redirects"), renderRedirectsFile(redirects));
    await writeFile(join(options.outDir, "vercel.json"), renderVercelRedirectsJson(redirects));

    for (const redirect of redirects) {
      const outputPath = join(options.outDir, ...routeToOutputPath(redirect.from));
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, renderRedirectHtml(manifest, redirect));
    }
  }
}

export function renderRoute(manifest: SiteManifest, route: SiteRoute): string {
  const body = route.kind === "api-operation" && route.operation
    ? renderApiOperation(route)
    : route.kind === "schema" && route.schema
      ? renderSchema(route)
      : route.kind === "api-portal" && route.apiPortal
        ? renderApiPortal(route)
        : route.html;
  const nav = renderNavigation(manifest);
  const versions = renderVersionSwitcher(manifest);
  const script = route.operation?.playground?.enabled ? renderPlaygroundScript() : "";
  const theme = renderThemeCss(manifest);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${renderSeoHead(manifest, route)}
  <style>
    ${theme.variables}
    body { background: var(--doc-background); color: var(--doc-text); margin: 0; display: grid; grid-template-columns: var(--doc-nav-width) 1fr; min-height: 100vh; }
    nav { border-right: 1px solid var(--doc-border); padding: 24px; display: flex; flex-direction: column; gap: 10px; }
    main { max-width: 880px; padding: 40px; }
    code, pre { background: var(--doc-code-background); font-family: var(--doc-code-font-family); }
    .method { font-weight: 700; }
    .path { color: var(--doc-muted-text); }
    a { color: var(--doc-primary); }
    .doc-badge, .badge { border: 1px solid var(--doc-border); border-radius: 999px; display: inline-flex; font-size: 12px; font-weight: 700; line-height: 1; padding: 4px 8px; }
    .doc-badge-success { border-color: #16a34a; color: #166534; }
    .doc-badge-warning { border-color: #f59e0b; color: #92400e; }
    .doc-badge-danger { border-color: #dc2626; color: #991b1b; }
    .doc-icon { align-items: center; border: 1px solid var(--doc-border); border-radius: 6px; display: inline-flex; font-family: var(--doc-code-font-family); font-size: 12px; height: 24px; justify-content: center; min-width: 24px; padding: 0 4px; }
    .doc-card-group { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin: 20px 0; }
    .doc-card-group-1 { grid-template-columns: 1fr; }
    .doc-card-group-2 { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .doc-card-group-3 { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
    .doc-card { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); color: inherit; display: flex; gap: 12px; padding: 16px; text-decoration: none; }
    .doc-card h3 { font-size: 16px; margin: 0 0 6px; }
    .doc-card p { color: var(--doc-muted-text); margin: 0; }
    .doc-card-icon { flex: 0 0 auto; }
    .doc-accordion-group { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin: 20px 0; overflow: hidden; }
    .doc-accordion { border-top: 1px solid var(--doc-border); padding: 0; }
    .doc-accordion:first-child { border-top: 0; }
    .doc-accordion summary { cursor: pointer; font-weight: 700; padding: 14px 16px; }
    .doc-accordion div { color: var(--doc-muted-text); padding: 0 16px 16px; }
    .doc-field { border-left: 3px solid var(--doc-accent); margin: 16px 0; padding: 4px 0 4px 14px; }
    .doc-field div { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; }
    .doc-field p { color: var(--doc-muted-text); margin: 6px 0 0; }
    .doc-field-type, .doc-field-required { border: 1px solid var(--doc-border); border-radius: 6px; font-family: var(--doc-code-font-family); font-size: 12px; padding: 2px 6px; }
    .doc-field-required { color: #991b1b; }
    .doc-frame { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin: 20px 0; overflow: hidden; padding: 12px; }
    .doc-frame img { display: block; height: auto; max-width: 100%; }
    .doc-frame figcaption { color: var(--doc-muted-text); font-size: 13px; margin-top: 10px; }
    .version-switcher { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); display: grid; gap: 8px; margin: 8px 0 18px; padding: 12px; }
    .version-switcher span { color: var(--doc-muted-text); font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .version-switcher a { color: inherit; text-decoration: none; }
    .api-portal-list { display: grid; gap: 14px; margin-top: 24px; }
    .api-portal-spec { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); padding: 16px; }
    .api-portal-spec h2 { font-size: 18px; margin: 0 0 8px; }
    .api-portal-spec p { color: var(--doc-muted-text); margin: 4px 0; }
    .api-playground { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin-top: 28px; padding: 18px; }
    .api-playground form { display: grid; gap: 16px; }
    .api-playground fieldset { border: 1px solid #e4e4e7; border-radius: 8px; display: grid; gap: 10px; margin: 0; padding: 14px; }
    .api-playground label { display: grid; gap: 6px; font-weight: 700; }
    .api-playground input, .api-playground select, .api-playground textarea { border: 1px solid var(--doc-border); border-radius: 6px; font: inherit; padding: 8px 10px; }
    .api-playground textarea { min-height: 120px; }
    .api-playground button { border: 1px solid var(--doc-text); border-radius: 6px; cursor: pointer; font: inherit; font-weight: 700; padding: 9px 12px; width: fit-content; }
    .api-playground pre { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin: 0; min-height: 80px; overflow: auto; padding: 12px; white-space: pre-wrap; }
    .api-playground-note { color: var(--doc-muted-text); font-size: 14px; }
    ${theme.customCss}
  </style>
</head>
<body>
  <nav>
    <strong>${escapeHtml(manifest.config.site.name)}</strong>
    ${versions}
    ${nav}
  </nav>
  <main>
    ${body}
  </main>
  ${script}
</body>
</html>
`;
}

function renderThemeCss(manifest: SiteManifest): { variables: string; customCss: string } {
  const theme = manifest.config.theme;
  const darkMode = theme.darkMode ? "light dark" : "light";
  const values = {
    "--doc-primary": theme.primaryColor ?? "#18181b",
    "--doc-accent": theme.accentColor ?? theme.primaryColor ?? "#18181b",
    "--doc-background": theme.backgroundColor ?? "Canvas",
    "--doc-text": theme.textColor ?? "CanvasText",
    "--doc-muted-text": theme.mutedTextColor ?? "#52525b",
    "--doc-border": theme.borderColor ?? "#d4d4d8",
    "--doc-code-background": theme.codeBackgroundColor ?? "transparent",
    "--doc-font-family": theme.fontFamily ?? "Inter, ui-sans-serif, system-ui, sans-serif",
    "--doc-code-font-family": theme.codeFontFamily ?? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    "--doc-radius": theme.radius ?? "8px",
    "--doc-nav-width": theme.navWidth ?? "280px",
  };
  const variables = [
    `:root { color-scheme: ${cssValue(darkMode)}; font-family: var(--doc-font-family);`,
    ...Object.entries(values).map(([name, value]) => `      ${name}: ${cssValue(value)};`),
    "    }",
  ].join("\n");

  return {
    variables,
    customCss: theme.customCss ? sanitizeStyleText(theme.customCss) : "",
  };
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

function renderVersionSwitcher(manifest: SiteManifest): string {
  const versions = manifest.versions ?? [];
  if (versions.length === 0) return "";

  return `<section class="version-switcher">
  <span>Versions</span>
  ${versions.map((version) => `<a href="${hrefForRoute(version.routePrefix)}">${escapeHtml(version.label)}</a>`).join("\n  ")}
</section>`;
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
    ? `<section><h2>Request Body</h2><p>${operation.requestBody.mediaTypes.map(escapeHtml).join(", ") || "No media type declared"}</p>${renderSchemaRefs(operation.specId, operation.requestBody.schemaRefs)}</section>`
    : "";
  const responses = operation.responses.length > 0
    ? `<section><h2>Responses</h2>${operation.responses.map((response) => `<article><h3>${escapeHtml(response.status)}</h3><p>${escapeHtml(response.description)}</p>${response.mediaTypes.length > 0 ? `<p>${response.mediaTypes.map(escapeHtml).join(", ")}</p>` : ""}${renderSchemaRefs(operation.specId, response.schemaRefs)}</article>`).join("")}</section>`
    : "";
  const codeSamples = operation.codeSamples.length > 0
    ? `<section><h2>Code Samples</h2>${operation.codeSamples.map((sample) => `<figure><figcaption>${escapeHtml(sample.lang)}</figcaption><pre><code>${escapeHtml(sample.source)}</code></pre></figure>`).join("")}</section>`
    : "";
  const playground = renderApiPlayground(route);

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
  ${playground}
</article>`;
}

function renderApiPortal(route: SiteRoute): string {
  const portal = route.apiPortal;
  if (!portal) return "";

  return `<article>
  <h1>${escapeHtml(portal.title)}</h1>
  <div class="api-portal-list">
    ${portal.specs.map((spec) => {
      const version = spec.version ? `<p>${escapeHtml(spec.version.label)}</p>` : "";
      const operations = `${spec.operationCount} ${spec.operationCount === 1 ? "operation" : "operations"}`;
      const link = spec.firstOperationRoute
        ? `<p><a href="${hrefForRoute(spec.firstOperationRoute)}">View reference</a></p>`
        : "";
      return `<section class="api-portal-spec">
      <h2>${escapeHtml(spec.name)}</h2>
      <p>${escapeHtml(spec.id)}</p>
      ${version}
      <p>${escapeHtml(operations)}</p>
      ${link}
    </section>`;
    }).join("\n    ")}
  </div>
</article>`;
}

function renderApiPlayground(route: SiteRoute): string {
  const operation = route.operation;
  const playground = operation?.playground;
  if (!operation || !playground?.enabled) return "";

  const pathParams = renderParameterInputs(operation.parameters.filter((parameter) => parameter.location === "path"), "Path Parameters");
  const queryParams = renderParameterInputs(operation.parameters.filter((parameter) => parameter.location === "query"), "Query Parameters");
  const headerParams = renderParameterInputs(operation.parameters.filter((parameter) => parameter.location === "header"), "Header Parameters");
  const auth = renderPlaygroundAuth(playground);
  const body = operation.requestBody ? renderPlaygroundBody(operation.requestBody.mediaTypes) : "";

  return `<section class="api-playground">
  <h2>Try It</h2>
  <form data-documentee-playground data-method="${escapeHtml(operation.method)}" data-path="${escapeHtml(operation.path)}" data-auth="${escapeHtml(playground.auth)}" data-api-key-name="${escapeHtml(playground.apiKeyName ?? "")}" data-api-key-location="${escapeHtml(playground.apiKeyLocation)}">
    <label>Base URL
      <input name="baseUrl" value="${escapeHtml(playground.baseUrl ?? "")}" required>
    </label>
    <p><span class="method">${escapeHtml(operation.method)}</span> <span class="path">${escapeHtml(operation.path)}</span></p>
    ${pathParams}
    ${queryParams}
    ${headerParams}
    ${auth}
    ${body}
    <p class="api-playground-note">Browser requests depend on this API's CORS policy. Secrets are only kept in this form and are not stored by Documentee.</p>
    <button type="submit" data-playground-submit>Send Request</button>
    <pre data-playground-result aria-live="polite">Response output will appear here.</pre>
  </form>
</section>`;
}

function renderParameterInputs(parameters: Array<{ name: string; location: string; required: boolean }>, title: string): string {
  if (parameters.length === 0) return "";
  return `<fieldset>
  <legend>${escapeHtml(title)}</legend>
  ${parameters.map((parameter) => `<label>${escapeHtml(parameter.name)}${parameter.required ? " *" : ""}
    <input name="${escapeHtml(parameter.name)}" data-param-location="${escapeHtml(parameter.location)}"${parameter.required ? " required" : ""}>
  </label>`).join("\n  ")}
</fieldset>`;
}

function renderPlaygroundAuth(playground: NonNullable<NonNullable<SiteRoute["operation"]>["playground"]>): string {
  if (playground.auth === "none") return "";
  const label = playground.auth === "bearer" ? "Bearer Token" : `API Key${playground.apiKeyName ? ` (${playground.apiKeyName})` : ""}`;
  return `<fieldset>
  <legend>Authentication</legend>
  <label>${escapeHtml(label)}
    <input name="documenteeAuth" type="password" autocomplete="off">
  </label>
</fieldset>`;
}

function renderPlaygroundBody(mediaTypes: string[]): string {
  const options = (mediaTypes.length > 0 ? mediaTypes : ["application/json"])
    .map((mediaType) => `<option value="${escapeHtml(mediaType)}">${escapeHtml(mediaType)}</option>`)
    .join("");
  return `<fieldset>
  <legend>Request Body</legend>
  <label>Media Type
    <select name="mediaType">${options}</select>
  </label>
  <label>Body
    <textarea name="body" spellcheck="false"></textarea>
  </label>
</fieldset>`;
}

function renderSchema(route: SiteRoute): string {
  if (!route.schema) return "";
  return `<article>
  <h1>${escapeHtml(route.title)}</h1>
  <p>${escapeHtml(route.description)}</p>
  <p>Spec: ${escapeHtml(route.schema.specId)}</p>
</article>`;
}

function renderSchemaRefs(specId: string, schemaRefs: string[]): string {
  if (schemaRefs.length === 0) return "";
  return `<p>Schemas: ${schemaRefs.map((schema) => `<a href="${hrefForRoute(joinSchemaRoute(specId, schema))}">${escapeHtml(schema)}</a>`).join(", ")}</p>`;
}

function hrefForRoute(route: string): string {
  if (route === "/") return "/";
  return `${route.replace(/\/$/g, "")}/`;
}

function routeFromPageRef(pageRef: string, contentDirectory: string): string {
  if (pageRef.startsWith("/")) return normalizeRoute(pageRef);
  let value = pageRef.replace(/\.(mdx|md)$/i, "");
  const contentPrefix = `${contentDirectory.replace(/^\/+|\/+$/g, "")}/`;
  if (value.startsWith(contentPrefix)) value = value.slice(contentPrefix.length);
  if (value === "index") return "/";
  if (value.endsWith("/index")) value = value.slice(0, -"index".length).replace(/\/$/g, "");
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

function joinSchemaRoute(specId: string, schema: string): string {
  return `/schemas/${specId.replace(/^\/+|\/+$/g, "")}/${schema.replace(/^\/+|\/+$/g, "")}`;
}

function normalizeRoute(route: string): string {
  const stripped = route.replace(/\/+$/g, "");
  return stripped.length === 0 ? "/" : stripped;
}

function cssValue(value: string): string {
  return value.replace(/[<>{};]/g, "");
}

function sanitizeStyleText(value: string): string {
  return value.replace(/<\/style/gi, "<\\/style");
}
