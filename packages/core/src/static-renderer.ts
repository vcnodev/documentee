import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { escapeHtml } from "./html.js";
import { routeToOutputPath } from "./paths.js";
import { renderPlaygroundScript } from "./playground.js";
import { getRedirects, getSeoConfig, renderRedirectHtml, renderRedirectsFile, renderRobotsTxt, renderSeoHead, renderSitemapXml, renderVercelRedirectsJson } from "./seo.js";
import type { SiteManifest, SiteRoute } from "./manifest.js";
import type { DocumenteeConfig } from "./config.js";

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
  const body = route.kind === "search" || route.route === "/search"
    ? renderSearchPage(manifest)
    : route.kind === "api-operation" && route.operation
    ? renderApiOperation(route)
    : route.kind === "schema" && route.schema
      ? renderSchema(route)
      : route.kind === "api-portal" && route.apiPortal
        ? renderApiPortal(route)
        : route.html;
  const nav = renderNavigation(manifest, route);
  const versions = renderVersionSwitcher(manifest);
  const script = route.operation?.playground?.enabled ? renderPlaygroundScript() : "";
  const searchAssets = renderSearchAssets(manifest, route);
  const theme = renderThemeCss(manifest);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${renderSeoHead(manifest, route)}
  ${searchAssets.head}
  <style>
    ${theme.variables}
    * { box-sizing: border-box; }
    body { background: var(--doc-background); color: var(--doc-text); font-family: var(--doc-font-family); margin: 0; min-height: 100vh; }
    .doc-shell { display: grid; grid-template-columns: var(--doc-nav-width) minmax(0, 1fr); }
    .doc-sidebar { align-self: start; background: color-mix(in srgb, var(--doc-background) 94%, var(--doc-border)); border-right: 1px solid var(--doc-border); display: flex; flex-direction: column; gap: 18px; min-height: 100vh; padding: 22px; position: sticky; top: 0; }
    .doc-brand { color: inherit; display: grid; gap: 4px; font-weight: 800; text-decoration: none; }
    .doc-brand span { color: var(--doc-muted-text); font-size: 13px; font-weight: 500; }
    .doc-search-link { align-items: center; border: 1px solid var(--doc-border); border-radius: var(--doc-radius); color: var(--doc-muted-text); display: flex; font-size: 14px; justify-content: space-between; padding: 10px 12px; text-decoration: none; }
    .doc-search-link:after { content: "Search"; color: var(--doc-muted-text); font-family: var(--doc-code-font-family); font-size: 12px; }
    .nav-group { display: grid; gap: 6px; }
    .nav-group span, .version-switcher span { color: var(--doc-muted-text); font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .nav-link, .version-switcher a { border-radius: calc(var(--doc-radius) - 2px); color: var(--doc-muted-text); display: block; font-size: 14px; line-height: 1.35; padding: 7px 9px; text-decoration: none; }
    .nav-link:hover, .version-switcher a:hover, .doc-search-link:hover { background: color-mix(in srgb, var(--doc-primary) 9%, transparent); color: var(--doc-text); }
    .nav-link.is-active { background: color-mix(in srgb, var(--doc-primary) 12%, transparent); color: var(--doc-primary); font-weight: 800; }
    .doc-main { min-width: 0; }
    .doc-topbar { align-items: center; border-bottom: 1px solid var(--doc-border); display: flex; justify-content: space-between; min-height: 58px; padding: 0 clamp(20px, 5vw, 56px); }
    .doc-topbar span { color: var(--doc-muted-text); font-size: 13px; }
    .doc-content { max-width: 920px; padding: 42px clamp(20px, 5vw, 56px) 72px; }
    .doc-content h1 { font-size: clamp(34px, 5vw, 54px); line-height: 1.03; margin: 0 0 18px; }
    .doc-content h2 { border-top: 1px solid var(--doc-border); font-size: 24px; margin: 34px 0 14px; padding-top: 26px; }
    .doc-content h3 { font-size: 18px; margin: 24px 0 10px; }
    .doc-content p, .doc-content li { line-height: 1.72; }
    .doc-content table { border-collapse: collapse; display: block; margin: 18px 0; overflow-x: auto; width: 100%; }
    .doc-content td, .doc-content th { border-bottom: 1px solid var(--doc-border); padding: 10px 12px; text-align: left; }
    code, pre { background: var(--doc-code-background); font-family: var(--doc-code-font-family); }
    pre { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); overflow: auto; padding: 14px; }
    .method { border: 1px solid color-mix(in srgb, var(--doc-primary) 28%, var(--doc-border)); border-radius: 999px; color: var(--doc-primary); display: inline-flex; font-size: 13px; font-weight: 800; padding: 5px 9px; vertical-align: middle; }
    .path { color: var(--doc-muted-text); font-family: var(--doc-code-font-family); font-size: 0.88em; overflow-wrap: anywhere; }
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
    .doc-card, .doc-card-list-item { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); color: inherit; display: flex; gap: 12px; padding: 16px; text-decoration: none; }
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
    .doc-callout { background: color-mix(in srgb, var(--doc-accent) 8%, transparent); border: 1px solid color-mix(in srgb, var(--doc-accent) 24%, var(--doc-border)); border-radius: var(--doc-radius); margin: 20px 0; padding: 14px 16px; }
    .doc-steps { border-left: 1px solid var(--doc-border); margin: 22px 0; padding-left: 28px; }
    .doc-steps li { padding-left: 8px; }
    .doc-tabs, .doc-code-group, .doc-example, .doc-code-block, .doc-pre, .doc-snippet { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin: 20px 0; overflow: hidden; }
    .doc-tab, .doc-example-body { padding: 16px; }
    .doc-example figcaption, .doc-code-block figcaption, .doc-pre figcaption, .doc-snippet figcaption { background: color-mix(in srgb, var(--doc-border) 32%, transparent); border-bottom: 1px solid var(--doc-border); color: var(--doc-muted-text); font-size: 13px; font-weight: 800; padding: 9px 12px; }
    .doc-example pre, .doc-code-block pre, .doc-pre pre { border: 0; border-radius: 0; margin: 0; }
    .doc-card-list { display: grid; gap: 12px; margin: 20px 0; }
    .doc-file-tree { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); font-family: var(--doc-code-font-family); margin: 20px 0; padding: 10px 12px; }
    .doc-file-tree details { margin-left: 10px; }
    .doc-file, .doc-folder { display: block; padding: 4px 0; }
    .doc-expandable { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin: 20px 0; padding: 0; }
    .doc-expandable summary { cursor: pointer; font-weight: 800; padding: 13px 15px; }
    .doc-expandable div { color: var(--doc-muted-text); padding: 0 15px 15px; }
    .version-switcher { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); display: grid; gap: 8px; margin: 8px 0 18px; padding: 12px; }
    .api-portal-list { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-top: 24px; }
    .api-portal-card { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); display: grid; gap: 12px; padding: 18px; }
    .api-portal-card h2 { font-size: 18px; margin: 0; }
    .api-portal-card p { color: var(--doc-muted-text); margin: 0; }
    .api-portal-card-meta { display: flex; flex-wrap: wrap; gap: 8px; }
    .api-portal-card-meta span { border: 1px solid var(--doc-border); border-radius: 999px; color: var(--doc-muted-text); font-size: 12px; padding: 4px 8px; }
    .api-section { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin: 20px 0; padding: 18px; }
    .api-section h2 { border-top: 0; margin-top: 0; padding-top: 0; }
    .api-playground { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin-top: 28px; padding: 18px; }
    .api-playground form { display: grid; gap: 16px; }
    .api-playground fieldset { border: 1px solid #e4e4e7; border-radius: 8px; display: grid; gap: 10px; margin: 0; padding: 14px; }
    .api-playground label { display: grid; gap: 6px; font-weight: 700; }
    .api-playground input, .api-playground select, .api-playground textarea { border: 1px solid var(--doc-border); border-radius: 6px; font: inherit; padding: 8px 10px; }
    .api-playground textarea { min-height: 120px; }
    .api-playground button { border: 1px solid var(--doc-text); border-radius: 6px; cursor: pointer; font: inherit; font-weight: 700; padding: 9px 12px; width: fit-content; }
    .api-playground pre { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin: 0; min-height: 80px; overflow: auto; padding: 12px; white-space: pre-wrap; }
    .api-playground-note { color: var(--doc-muted-text); font-size: 14px; }
    .search-panel { display: grid; gap: 18px; }
    .search-pagefind { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); min-height: 72px; padding: 16px; }
    .search-fallback-list { display: grid; gap: 10px; list-style: none; margin: 0; padding: 0; }
    .search-fallback-list a { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); color: inherit; display: grid; gap: 4px; padding: 14px; text-decoration: none; }
    .search-fallback-list span { color: var(--doc-muted-text); font-size: 13px; }
    @media (max-width: 820px) {
      .doc-shell { display: block; }
      .doc-sidebar { border-bottom: 1px solid var(--doc-border); border-right: 0; min-height: 0; position: static; }
      .doc-topbar { min-height: 48px; }
      .doc-content { padding-top: 28px; }
    }
    ${theme.customCss}
  </style>
</head>
<body class="doc-shell">
  <aside class="doc-sidebar">
    <a class="doc-brand" href="/">${escapeHtml(manifest.config.site.name)}${manifest.config.site.description ? `<span>${escapeHtml(manifest.config.site.description)}</span>` : ""}</a>
    ${renderSearchLink(manifest)}
    ${versions}
    ${nav}
  </aside>
  <main class="doc-main">
    <header class="doc-topbar"><span>${escapeHtml(route.title)}</span><span>${escapeHtml(route.kind)}</span></header>
    <div class="doc-content">
      ${body}
    </div>
  </main>
  ${script}
  ${searchAssets.body}
</body>
</html>
`;
}

function renderThemeCss(manifest: SiteManifest): { variables: string; customCss: string } {
  const theme = manifest.config.theme;
  const preset = theme.preset ? themePresets[theme.preset] : {};
  const darkMode = theme.darkMode ? "light dark" : "light";
  const values = {
    "--doc-primary": theme.primaryColor ?? preset.primaryColor ?? "#18181b",
    "--doc-accent": theme.accentColor ?? preset.accentColor ?? theme.primaryColor ?? preset.primaryColor ?? "#18181b",
    "--doc-background": theme.backgroundColor ?? preset.backgroundColor ?? "Canvas",
    "--doc-text": theme.textColor ?? preset.textColor ?? "CanvasText",
    "--doc-muted-text": theme.mutedTextColor ?? preset.mutedTextColor ?? "#52525b",
    "--doc-border": theme.borderColor ?? preset.borderColor ?? "#d4d4d8",
    "--doc-code-background": theme.codeBackgroundColor ?? preset.codeBackgroundColor ?? "transparent",
    "--doc-font-family": theme.fontFamily ?? preset.fontFamily ?? "Inter, ui-sans-serif, system-ui, sans-serif",
    "--doc-code-font-family": theme.codeFontFamily ?? preset.codeFontFamily ?? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    "--doc-radius": theme.radius ?? preset.radius ?? "8px",
    "--doc-nav-width": theme.navWidth ?? preset.navWidth ?? "280px",
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

type ThemeConfig = DocumenteeConfig["theme"];
type ThemePreset = Partial<Omit<ThemeConfig, "preset" | "customCss" | "darkMode">>;

const themePresets: Record<NonNullable<ThemeConfig["preset"]>, ThemePreset> = {
  mint: {
    primaryColor: "#0f766e",
    accentColor: "#14b8a6",
    backgroundColor: "#f8fffc",
    textColor: "#10201c",
    mutedTextColor: "#4b635d",
    borderColor: "#b7d8ce",
    codeBackgroundColor: "#ecfdf5",
  },
  slate: {
    primaryColor: "#334155",
    accentColor: "#2563eb",
    backgroundColor: "#f8fafc",
    textColor: "#0f172a",
    mutedTextColor: "#64748b",
    borderColor: "#cbd5e1",
    codeBackgroundColor: "#f1f5f9",
  },
  neutral: {
    primaryColor: "#18181b",
    accentColor: "#52525b",
    backgroundColor: "#ffffff",
    textColor: "#18181b",
    mutedTextColor: "#71717a",
    borderColor: "#d4d4d8",
    codeBackgroundColor: "#f4f4f5",
  },
  highContrast: {
    primaryColor: "#000000",
    accentColor: "#1d4ed8",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    mutedTextColor: "#1f2937",
    borderColor: "#000000",
    codeBackgroundColor: "#f3f4f6",
  },
};

function renderNavigation(manifest: SiteManifest, currentRoute: SiteRoute): string {
  if (manifest.config.navigation.length === 0) {
    return manifest.routes
      .map((item) => renderNavLink(item, currentRoute))
      .join("\n");
  }

  return manifest.config.navigation
    .map((group) => {
      const pageLinks = group.pages
        .map((pageRef) => routeFromPageRef(pageRef, manifest.config.content.directory))
        .map((route) => manifest.routes.find((candidate) => candidate.route === route))
        .filter((route): route is SiteRoute => Boolean(route))
        .map((item) => renderNavLink(item, currentRoute));

      const apiLinks = group.openapi
        ? manifest.routes
            .filter((item) => item.operation?.specId === group.openapi)
            .map((item) => renderNavLink(item, currentRoute))
        : [];

      return `<section class="nav-group">
  <span>${escapeHtml(group.group)}</span>
  ${[...pageLinks, ...apiLinks].join("\n  ")}
</section>`;
    })
    .join("\n");
}

function renderNavLink(item: SiteRoute, currentRoute: SiteRoute): string {
  const active = item.route === currentRoute.route ? " is-active" : "";
  return `<a class="nav-link${active}" href="${hrefForRoute(item.route)}">${escapeHtml(item.title)}</a>`;
}

function renderSearchLink(manifest: SiteManifest): string {
  if (manifest.config.search.provider !== "pagefind") return "";
  return `<a class="doc-search-link" href="/search/">Search docs</a>`;
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
  const auth = operation.auth.length > 0 ? `<section class="api-section"><h2>Authentication</h2><p>${operation.auth.map(escapeHtml).join(", ")}</p></section>` : "";
  const parameters = operation.parameters.length > 0
    ? `<section class="api-section"><h2>Parameters</h2><table><tbody>${operation.parameters.map((parameter) => `<tr><td>${escapeHtml(parameter.name)}</td><td>${escapeHtml(parameter.location)}</td><td>${parameter.required ? "required" : "optional"}</td></tr>`).join("")}</tbody></table></section>`
    : "";
  const requestBody = operation.requestBody
    ? `<section class="api-section"><h2>Request Body</h2><p>${operation.requestBody.mediaTypes.map(escapeHtml).join(", ") || "No media type declared"}</p>${renderSchemaRefs(operation.specId, operation.requestBody.schemaRefs)}</section>`
    : "";
  const responses = operation.responses.length > 0
    ? `<section class="api-section"><h2>Responses</h2>${operation.responses.map((response) => `<article><h3>${escapeHtml(response.status)}</h3><p>${escapeHtml(response.description)}</p>${response.mediaTypes.length > 0 ? `<p>${response.mediaTypes.map(escapeHtml).join(", ")}</p>` : ""}${renderSchemaRefs(operation.specId, response.schemaRefs)}</article>`).join("")}</section>`
    : "";
  const codeSamples = operation.codeSamples.length > 0
    ? `<section class="api-section"><h2>Code Samples</h2>${operation.codeSamples.map((sample) => `<figure><figcaption>${escapeHtml(sample.lang)}</figcaption><pre><code>${escapeHtml(sample.source)}</code></pre></figure>`).join("")}</section>`
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
      const operations = `${spec.operationCount} ${spec.operationCount === 1 ? "operation" : "operations"}`;
      const link = spec.firstOperationRoute
        ? `<p><a href="${hrefForRoute(spec.firstOperationRoute)}">View reference</a></p>`
        : "";
      return `<section class="api-portal-card">
      <h2>${escapeHtml(spec.name)}</h2>
      <div class="api-portal-card-meta"><span>${escapeHtml(spec.id)}</span>${spec.version ? `<span>${escapeHtml(spec.version.label)}</span>` : ""}<span>${escapeHtml(operations)}</span></div>
      ${link}
    </section>`;
    }).join("\n    ")}
  </div>
</article>`;
}

function renderSearchPage(manifest: SiteManifest): string {
  const routes = manifest.routes
    .filter((item) => item.route !== "/search")
    .filter((item) => item.kind !== "schema")
    .filter((item) => item.title.trim().length > 0);

  return `<article id="search" class="search-panel">
  <h1>Search</h1>
  ${manifest.config.search.provider === "pagefind" ? `<div id="pagefind-search" class="search-pagefind" data-pagefind-ui></div>` : ""}
  <noscript></noscript>
  <section>
    <h2>All pages</h2>
    <ul class="search-fallback-list">
      ${routes.map((item) => `<li><a href="${hrefForRoute(item.route)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description || item.route)}</span></a></li>`).join("\n      ")}
    </ul>
  </section>
</article>`;
}

function renderSearchAssets(manifest: SiteManifest, route: SiteRoute): { head: string; body: string } {
  if (manifest.config.search.provider !== "pagefind" || route.route !== "/search") {
    return { head: "", body: "" };
  }

  return {
    head: '<link href="/_pagefind/pagefind-ui.css" rel="stylesheet">',
    body: `<script type="module">
    import { PagefindUI } from "/_pagefind/pagefind-ui.js";
    new PagefindUI({ element: "#pagefind-search", showSubResults: true });
  </script>`,
  };
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
