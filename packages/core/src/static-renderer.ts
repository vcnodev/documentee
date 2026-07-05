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
  const rawBody = route.kind === "search" || route.route === "/search"
    ? renderSearchPage(manifest)
    : route.kind === "api-operation" && route.operation
    ? renderApiOperation(route)
    : route.kind === "schema" && route.schema
      ? renderSchema(route)
      : route.kind === "api-portal" && route.apiPortal
        ? renderApiPortal(manifest, route)
        : route.html;
  const codeEnhancedBody = enhanceCodeBlocks(rawBody);
  const { html: body, headings } = enhanceContentHeadings(codeEnhancedBody);
  const nav = renderNavigation(manifest, route);
  const versions = renderVersionSwitcher(manifest);
  const mobileHeader = renderMobileHeader(manifest, versions, nav);
  const script = route.operation?.playground?.enabled ? renderPlaygroundScript() : "";
  const copyScript = body.includes("data-copy-code") ? renderCopyScript() : "";
  const apiNavFilterScript = nav.includes("data-api-nav-filter") ? renderApiNavFilterScript() : "";
  const searchAssets = renderSearchAssets(manifest, route);
  const searchModal = renderSearchModal(manifest);
  const searchModalScript = renderSearchModalScript(manifest);
  const theme = renderThemeCss(manifest);
  const contentClass = route.kind === "api-operation" || route.kind === "api-portal" ? " api-doc-content" : "";
  const pageToc = renderPageToc(headings, route.kind === "api-operation" ? " api-page-toc" : "");
  const breadcrumbs = renderBreadcrumbs(manifest, route);
  const pageNav = renderPageNav(manifest, route);

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
    .skip-link { background: var(--doc-text); border-radius: var(--doc-radius); color: var(--doc-background); font-weight: 800; left: 16px; padding: 9px 12px; position: fixed; text-decoration: none; top: 16px; transform: translateY(-140%); transition: transform 120ms ease; z-index: 20; }
    .skip-link:focus { transform: translateY(0); }
    :where(a, button, input, select, textarea, summary):focus-visible { outline: 3px solid color-mix(in srgb, var(--doc-primary) 70%, white); outline-offset: 3px; }
    .doc-shell { display: grid; grid-template-columns: var(--doc-nav-width) minmax(0, 1fr); }
    .doc-sidebar { align-self: start; background: color-mix(in srgb, var(--doc-background) 94%, var(--doc-border)); border-right: 1px solid var(--doc-border); display: flex; flex-direction: column; gap: 18px; height: 100vh; min-height: 100vh; overflow-y: auto; padding: 22px; position: sticky; top: 0; }
    .doc-mobile-header { display: none; }
    .doc-brand { color: inherit; display: grid; gap: 4px; font-weight: 800; text-decoration: none; }
    .doc-brand span { color: var(--doc-muted-text); font-size: 13px; font-weight: 500; }
    .doc-search-link { align-items: center; border: 1px solid var(--doc-border); border-radius: var(--doc-radius); color: var(--doc-muted-text); display: flex; font-size: 14px; justify-content: space-between; padding: 10px 12px; text-decoration: none; }
    .doc-search-link:after { content: "Search"; color: var(--doc-muted-text); font-family: var(--doc-code-font-family); font-size: 12px; }
    .nav-group { display: grid; gap: 6px; }
    .nav-group > span, .version-switcher > span, .nav-subgroup-header span:first-child { color: var(--doc-muted-text); font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .nav-link, .version-switcher a { border-radius: calc(var(--doc-radius) - 2px); color: var(--doc-muted-text); display: block; font-size: 14px; line-height: 1.35; padding: 7px 9px; text-decoration: none; }
    .nav-link:hover, .version-switcher a:hover, .doc-search-link:hover { background: color-mix(in srgb, var(--doc-primary) 9%, transparent); color: var(--doc-text); }
    .nav-link.is-active { background: color-mix(in srgb, var(--doc-primary) 12%, transparent); color: var(--doc-primary); font-weight: 800; }
    .nav-subgroup { border-top: 1px solid color-mix(in srgb, var(--doc-border) 52%, transparent); display: grid; gap: 4px; margin-top: 6px; padding-top: 10px; }
    .nav-subgroup summary { cursor: pointer; list-style: none; }
    .nav-subgroup summary::-webkit-details-marker { display: none; }
    .nav-subgroup:not([open]) .nav-subgroup-header { margin-bottom: 0; }
    .nav-subgroup-header { align-items: baseline; display: flex; gap: 8px; justify-content: space-between; margin-bottom: 4px; }
    .nav-subgroup-count { color: var(--doc-muted-text); font-size: 11px; font-weight: 600; text-transform: none; white-space: nowrap; }
    .api-nav-filter { display: grid; gap: 8px; margin-bottom: 8px; }
    .api-nav-filter input { background: color-mix(in srgb, var(--doc-background) 92%, var(--doc-border)); border: 1px solid var(--doc-border); border-radius: var(--doc-radius); color: var(--doc-text); font: inherit; font-size: 13px; padding: 8px 10px; width: 100%; }
    .api-nav-empty { color: var(--doc-muted-text); display: none; font-size: 13px; margin: 0; }
    .api-nav-link { display: grid; gap: 3px; grid-template-columns: auto minmax(0, 1fr); }
    .api-nav-link .nav-method { font-family: var(--doc-code-font-family); font-size: 11px; font-weight: 900; }
    .api-nav-link .nav-path { overflow-wrap: anywhere; }
    .doc-main { min-width: 0; }
    .doc-topbar { align-items: center; border-bottom: 1px solid var(--doc-border); display: flex; justify-content: space-between; min-height: 58px; padding: 0 clamp(20px, 5vw, 56px); }
    .doc-topbar span { color: var(--doc-muted-text); font-size: 13px; }
    .doc-breadcrumbs { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
    .doc-breadcrumbs a, .doc-breadcrumbs span { color: var(--doc-muted-text); font-size: 13px; line-height: 1.4; text-decoration: none; }
    .doc-breadcrumbs a:hover { color: var(--doc-primary); }
    .doc-breadcrumbs .doc-breadcrumb-current, .doc-breadcrumbs span:last-child { color: var(--doc-text); font-weight: 700; overflow-wrap: anywhere; }
    .doc-breadcrumb-separator { color: var(--doc-muted-text); font-size: 12px; }
    .doc-content { max-width: 920px; padding: 42px clamp(20px, 5vw, 56px) 72px; }
    .doc-content.api-doc-content { max-width: 1260px; }
    .doc-content h1 { font-size: clamp(34px, 5vw, 54px); line-height: 1.03; margin: 0 0 18px; }
    .doc-content h2 { border-top: 1px solid var(--doc-border); font-size: 24px; margin: 34px 0 14px; padding-top: 26px; }
    .doc-content h3 { font-size: 18px; margin: 24px 0 10px; }
    .doc-content :where(h2, h3) { scroll-margin-top: 82px; }
    .doc-heading-anchor { color: var(--doc-muted-text); margin-right: 8px; opacity: 0; text-decoration: none; }
    .doc-content :where(h2, h3):hover .doc-heading-anchor, .doc-heading-anchor:focus-visible { opacity: 1; }
    .doc-on-this-page { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); display: none; margin: 0 0 24px; }
    .doc-on-this-page summary { cursor: pointer; font-weight: 800; padding: 12px 14px; }
    .doc-on-this-page nav { border-top: 1px solid var(--doc-border); display: grid; gap: 8px; padding: 12px 14px; }
    .doc-page-toc { border-left: 1px solid var(--doc-border); color: var(--doc-muted-text); display: grid; float: right; gap: 8px; margin: 42px clamp(20px, 5vw, 56px) 24px 24px; max-width: 220px; padding-left: 14px; position: sticky; top: 80px; width: 20vw; }
    .doc-page-toc.api-page-toc { display: none; }
    .doc-page-toc span { font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .doc-page-toc a, .doc-on-this-page a { color: var(--doc-muted-text); font-size: 13px; line-height: 1.35; text-decoration: none; }
    .doc-page-toc a:hover, .doc-on-this-page a:hover { color: var(--doc-primary); }
    .doc-page-toc .toc-level-3, .doc-on-this-page .toc-level-3 { padding-left: 12px; }
    .doc-content p, .doc-content li { line-height: 1.72; }
    .doc-content table { border-collapse: collapse; display: block; margin: 18px 0; overflow-x: auto; width: 100%; }
    .doc-content td, .doc-content th { border-bottom: 1px solid var(--doc-border); padding: 10px 12px; text-align: left; }
    code, pre { background: var(--doc-code-background); font-family: var(--doc-code-font-family); }
    pre { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); overflow: auto; padding: 14px; }
    .doc-code-copy { display: grid; gap: 8px; margin: 18px 0; }
    .doc-code-copy pre { margin: 0; }
    .doc-copy-button { align-self: end; background: color-mix(in srgb, var(--doc-background) 88%, var(--doc-border)); border: 1px solid var(--doc-border); border-radius: 6px; color: var(--doc-muted-text); cursor: pointer; font: inherit; font-size: 12px; font-weight: 800; justify-self: end; padding: 5px 8px; }
    .doc-copy-button:hover { color: var(--doc-text); }
    .doc-page-nav { border-top: 1px solid var(--doc-border); display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 42px; padding-top: 18px; }
    .doc-page-nav a { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); color: inherit; display: grid; gap: 4px; padding: 14px; text-decoration: none; }
    .doc-page-nav a:hover { border-color: color-mix(in srgb, var(--doc-primary) 45%, var(--doc-border)); }
    .doc-page-nav span { color: var(--doc-muted-text); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .method { border: 1px solid color-mix(in srgb, var(--doc-primary) 28%, var(--doc-border)); border-radius: 999px; color: var(--doc-primary); display: inline-flex; font-size: 13px; font-weight: 800; padding: 5px 9px; vertical-align: middle; }
    .method-get { --method-color: #2563eb; }
    .method-post { --method-color: #16a34a; }
    .method-put, .method-patch { --method-color: #d97706; }
    .method-delete { --method-color: #dc2626; }
    .method-options, .method-head, .method-trace { --method-color: #7c3aed; }
    .method-get .method, .method.method-get, .method-get .nav-method { color: var(--method-color); }
    .method-post .method, .method.method-post, .method-post .nav-method { color: var(--method-color); }
    .method-put .method, .method.method-put, .method-put .nav-method, .method-patch .method, .method.method-patch, .method-patch .nav-method { color: var(--method-color); }
    .method-delete .method, .method.method-delete, .method-delete .nav-method { color: var(--method-color); }
    .method-options .method, .method.method-options, .method-options .nav-method, .method-head .method, .method.method-head, .method-head .nav-method, .method-trace .method, .method.method-trace, .method-trace .nav-method { color: var(--method-color); }
    .path { color: var(--doc-muted-text); font-family: var(--doc-code-font-family); font-size: 0.88em; overflow-wrap: anywhere; }
    a { color: var(--doc-primary); }
    .doc-badge, .badge { border: 1px solid var(--doc-border); border-radius: 999px; display: inline-flex; font-size: 12px; font-weight: 700; line-height: 1; padding: 4px 8px; }
    .doc-badge-success { border-color: var(--doc-success); color: var(--doc-success-text); }
    .doc-badge-warning { border-color: var(--doc-warning); color: var(--doc-warning-text); }
    .doc-badge-danger { border-color: var(--doc-danger); color: var(--doc-danger-text); }
    .doc-icon { align-items: center; border: 1px solid var(--doc-border); border-radius: 6px; display: inline-flex; font-family: var(--doc-code-font-family); font-size: 12px; height: 24px; justify-content: center; min-width: 24px; padding: 0 4px; }
    .doc-card-group { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin: 20px 0; }
    .doc-card-group-1 { grid-template-columns: 1fr; }
    .doc-card-group-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .doc-card-group-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
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
    .doc-field-required { color: var(--doc-danger-text); }
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
    .api-portal-list { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-top: 24px; }
    .api-portal-card { background: linear-gradient(180deg, color-mix(in srgb, var(--doc-background) 98%, var(--doc-primary)), var(--doc-background)); border: 1px solid color-mix(in srgb, var(--doc-border) 72%, transparent); border-radius: var(--doc-radius); display: grid; gap: 16px; padding: 20px; }
    .api-portal-card-head { align-items: start; display: flex; gap: 14px; justify-content: space-between; }
    .api-portal-card-title { display: grid; gap: 6px; min-width: 0; }
    .api-portal-card h2 { font-size: 18px; margin: 0; }
    .api-portal-card p { color: var(--doc-muted-text); margin: 0; }
    .api-portal-card-action { align-items: center; border: 1px solid color-mix(in srgb, var(--doc-primary) 30%, var(--doc-border)); border-radius: 999px; color: var(--doc-primary); display: inline-flex; flex: 0 0 auto; font-size: 13px; font-weight: 800; line-height: 1; padding: 8px 10px; text-decoration: none; }
    .api-portal-card-meta { display: flex; flex-wrap: wrap; gap: 8px; }
    .api-portal-card-meta span { border: 1px solid var(--doc-border); border-radius: 999px; color: var(--doc-muted-text); font-size: 12px; padding: 4px 8px; }
    .api-portal-stats, .api-portal-tags, .api-chip-row, .api-meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .api-portal-stats span, .api-portal-tags span, .api-chip, .api-tag, .api-auth { border: 1px solid color-mix(in srgb, var(--doc-border) 72%, transparent); border-radius: 999px; color: var(--doc-muted-text); font-size: 12px; font-weight: 700; padding: 5px 9px; }
    .api-operation { display: grid; gap: 22px; }
    .api-hero { background: color-mix(in srgb, var(--doc-background) 94%, var(--method-color, var(--doc-primary))); border: 1px solid color-mix(in srgb, var(--method-color, var(--doc-primary)) 28%, var(--doc-border)); border-radius: var(--doc-radius); display: grid; gap: 13px; padding: clamp(18px, 3vw, 28px); }
    .api-hero h1 { margin-bottom: 0; }
    .api-hero p { margin: 0; }
    .api-hero .api-description { color: var(--doc-muted-text); }
    .api-endpoint-command { align-items: center; display: flex; flex-wrap: wrap; gap: 10px; }
    .api-endpoint-command .path { background: color-mix(in srgb, var(--doc-background) 88%, var(--doc-border)); border: 1px solid color-mix(in srgb, var(--doc-border) 56%, transparent); border-radius: calc(var(--doc-radius) - 2px); font-size: 14px; padding: 7px 9px; }
    .api-operation-frame { align-items: start; display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr) minmax(220px, 280px); }
    .api-operation-main { display: grid; gap: 16px; min-width: 0; }
    .api-operation-rail { display: grid; gap: 14px; position: sticky; top: 80px; }
    .api-overview-grid { display: grid; gap: 10px; grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .api-overview-item, .api-rail-card, .api-panel-card { background: color-mix(in srgb, var(--doc-background) 98%, var(--doc-border)); border: 1px solid color-mix(in srgb, var(--doc-border) 68%, transparent); border-radius: var(--doc-radius); }
    .api-overview-item { display: grid; gap: 4px; min-width: 0; padding: 12px; }
    .api-overview-label, .api-section-eyebrow, .api-rail-label { color: var(--doc-muted-text); font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .api-overview-value, .api-rail-value { font-family: var(--doc-code-font-family); font-size: 13px; font-weight: 800; overflow-wrap: anywhere; }
    .api-section { border: 1px solid color-mix(in srgb, var(--doc-border) 72%, transparent); border-radius: var(--doc-radius); margin: 0; padding: 18px; }
    .api-section-heading { align-items: end; border-bottom: 1px solid color-mix(in srgb, var(--doc-border) 58%, transparent); display: flex; gap: 12px; justify-content: space-between; margin: -2px 0 16px; padding-bottom: 12px; }
    .api-section h2 { border-top: 0; font-size: 19px; margin: 0; padding-top: 0; }
    .api-section-count { color: var(--doc-muted-text); font-size: 13px; font-weight: 700; white-space: nowrap; }
    .api-param-groups, .api-request-card, .api-response-list { display: grid; gap: 14px; }
    .api-param-group { display: grid; gap: 10px; }
    .api-param-group h3, .api-request-card h3 { color: var(--doc-muted-text); font-size: 13px; letter-spacing: 0; margin: 0; text-transform: uppercase; }
    .api-param-list, .api-field-list { display: grid; gap: 10px; }
    .api-param-card, .api-field-row, .api-response-card { border: 1px solid color-mix(in srgb, var(--doc-border) 68%, transparent); border-radius: var(--doc-radius); display: grid; gap: 8px; padding: 13px 14px; }
    .api-param-card header, .api-field-row header, .api-response-card header { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; }
    .api-param-card code, .api-field-row code { border-radius: 6px; padding: 2px 6px; overflow-wrap: anywhere; }
    .api-param-card p, .api-field-row p, .api-response-card p { color: var(--doc-muted-text); margin: 0; }
    .api-required { color: var(--doc-danger-text); }
    .api-response-card { border-left: 4px solid var(--status-color, var(--doc-border)); }
    .api-status-2xx { --status-color: var(--doc-success); }
    .api-status-3xx { --status-color: var(--doc-info); }
    .api-status-4xx { --status-color: var(--doc-warning); }
    .api-status-5xx { --status-color: var(--doc-danger); }
    .api-status-default { --status-color: var(--doc-muted-text); }
    .api-status-code { color: var(--status-color); font-family: var(--doc-code-font-family); font-weight: 900; }
    .api-schema-links { color: var(--doc-muted-text); font-size: 13px; margin: 0; }
    .api-rail-card { display: grid; gap: 10px; padding: 14px; }
    .api-rail-card h2 { border: 0; font-size: 14px; margin: 0; padding: 0; }
    .api-rail-list { display: grid; gap: 10px; margin: 0; }
    .api-rail-list dd { margin: 0; }
    .api-rail-row { display: grid; gap: 3px; }
    .api-playground-hint { color: var(--doc-muted-text); font-size: 13px; margin: 0; }
    .api-playground { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin-top: 0; padding: 18px; }
    .api-playground h2 { border: 0; font-size: 19px; margin: 0; padding: 0; }
    .api-playground form { display: grid; gap: 16px; }
    .api-playground fieldset { border: 1px solid var(--doc-border); border-radius: 8px; display: grid; gap: 10px; margin: 0; padding: 14px; }
    .api-playground label { display: grid; gap: 6px; font-weight: 700; }
    .api-playground input, .api-playground select, .api-playground textarea { background: color-mix(in srgb, var(--doc-background) 92%, var(--doc-border)); border: 1px solid var(--doc-border); border-radius: 6px; color: var(--doc-text); font: inherit; padding: 8px 10px; }
    .api-playground input::placeholder, .api-playground textarea::placeholder { color: var(--doc-muted-text); }
    .api-playground textarea { min-height: 120px; }
    .api-playground button { background: var(--doc-primary); border: 1px solid var(--doc-primary); border-radius: 6px; color: var(--doc-background); cursor: pointer; font: inherit; font-weight: 700; padding: 9px 12px; width: fit-content; }
    .api-playground button:hover { filter: brightness(1.08); }
    .api-playground button:disabled { cursor: not-allowed; opacity: 0.65; }
    .api-playground pre { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin: 0; min-height: 80px; overflow: auto; padding: 12px; white-space: pre-wrap; }
    .api-playground pre[data-state="loading"] { border-color: var(--doc-info); }
    .api-playground pre[data-state="success"] { border-color: var(--doc-success); }
    .api-playground pre[data-state="error"] { border-color: var(--doc-danger); }
    .api-playground-note { color: var(--doc-muted-text); font-size: 14px; }
    .search-panel { display: grid; gap: 18px; }
    .search-pagefind { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); min-height: 72px; padding: 16px; }
    .search-fallback-list { display: grid; gap: 10px; list-style: none; margin: 0; padding: 0; }
    .search-fallback-list a { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); color: inherit; display: grid; gap: 4px; padding: 14px; text-decoration: none; }
    .search-fallback-list span { color: var(--doc-muted-text); font-size: 13px; }
    .search-modal { background: var(--doc-background); border: 1px solid color-mix(in srgb, var(--doc-border) 70%, transparent); border-radius: var(--doc-radius); box-shadow: 0 24px 80px rgb(0 0 0 / 32%); color: var(--doc-text); max-width: min(720px, calc(100vw - 32px)); padding: 0; width: 720px; }
    .search-modal::backdrop { background: rgb(5 8 18 / 64%); backdrop-filter: blur(8px); }
    .search-modal-inner { display: grid; gap: 0; }
    .search-modal-head { align-items: center; border-bottom: 1px solid var(--doc-border); display: flex; gap: 12px; justify-content: space-between; padding: 16px; }
    .search-modal-title { display: grid; gap: 4px; min-width: 0; }
    .search-modal-title h2 { border: 0; font-size: 18px; margin: 0; padding: 0; }
    .search-modal-title p { color: var(--doc-muted-text); font-size: 13px; line-height: 1.45; margin: 0; }
    .search-close { background: transparent; border: 1px solid var(--doc-border); border-radius: 999px; color: var(--doc-muted-text); cursor: pointer; font: inherit; font-weight: 900; height: 34px; line-height: 1; width: 34px; }
    .search-modal-body { display: grid; gap: 14px; padding: 16px; }
    .search-modal-input { background: color-mix(in srgb, var(--doc-background) 92%, var(--doc-border)); border: 1px solid var(--doc-border); border-radius: var(--doc-radius); color: var(--doc-text); font: inherit; font-size: 16px; padding: 13px 14px; width: 100%; }
    .search-suggestion-header { align-items: center; display: flex; gap: 10px; justify-content: space-between; }
    .search-suggestion-header h3 { color: var(--doc-muted-text); font-size: 12px; margin: 0; text-transform: uppercase; }
    .search-suggestion-header a { font-size: 13px; font-weight: 800; text-decoration: none; }
    .search-suggestion-list { display: grid; gap: 8px; list-style: none; margin: 0; max-height: min(50vh, 420px); overflow: auto; padding: 0; }
    .search-suggestion-list a { border: 1px solid color-mix(in srgb, var(--doc-border) 64%, transparent); border-radius: var(--doc-radius); color: inherit; display: grid; gap: 5px; padding: 12px; text-decoration: none; }
    .search-suggestion-list a:hover { background: color-mix(in srgb, var(--doc-primary) 9%, transparent); }
    .search-suggestion-list strong { font-size: 14px; overflow-wrap: anywhere; }
    .search-suggestion-list span { color: var(--doc-muted-text); font-size: 12px; overflow-wrap: anywhere; }
    .search-empty { color: var(--doc-muted-text); display: none; font-size: 14px; margin: 0; }
    @media (min-width: 1500px) {
      .doc-page-toc.api-page-toc { display: grid; }
    }
    @media (max-width: 1100px) {
      .api-operation-frame { grid-template-columns: 1fr; }
      .api-operation-rail { position: static; }
      .api-overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .doc-page-toc { display: none; }
    }
    @media (max-width: 820px) {
      .doc-shell { display: block; }
      .doc-sidebar { display: none; }
      .doc-mobile-header { align-items: center; background: color-mix(in srgb, var(--doc-background) 94%, var(--doc-border)); border-bottom: 1px solid var(--doc-border); display: flex; gap: 12px; justify-content: space-between; min-height: 56px; padding: 10px 20px; position: sticky; top: 0; z-index: 12; }
      .doc-mobile-brand { color: inherit; font-weight: 800; text-decoration: none; }
      .doc-mobile-actions { align-items: center; display: flex; gap: 8px; }
      .doc-mobile-header .doc-search-link { font-size: 0; gap: 8px; padding: 8px 10px; }
      .doc-mobile-header .doc-search-link::before { content: "Search"; font-size: 14px; }
      .doc-mobile-header .doc-search-link::after { content: "/"; border: 1px solid var(--doc-border); border-radius: 4px; font-size: 12px; line-height: 1; padding: 2px 5px; }
      .doc-mobile-menu { position: relative; }
      .doc-mobile-menu summary { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); cursor: pointer; font-weight: 800; list-style: none; padding: 8px 10px; }
      .doc-mobile-menu summary::-webkit-details-marker { display: none; }
      .doc-mobile-menu[open] .doc-mobile-nav { display: grid; }
      .doc-mobile-nav { background: var(--doc-background); border: 1px solid var(--doc-border); border-radius: var(--doc-radius); box-shadow: 0 20px 60px rgb(0 0 0 / 24%); display: none; gap: 16px; max-height: min(70vh, 520px); min-width: min(340px, calc(100vw - 40px)); overflow: auto; padding: 16px; position: absolute; right: 0; top: calc(100% + 8px); }
      .doc-topbar { min-height: 48px; }
      .doc-content { padding-top: 28px; }
      .doc-on-this-page { display: block; }
      .doc-card-group-2, .doc-card-group-3 { grid-template-columns: 1fr; }
      .api-portal-card-head, .api-section-heading { align-items: start; flex-direction: column; }
      .api-overview-grid { grid-template-columns: 1fr; }
    }
    ${theme.customCss}
  </style>
</head>
<body class="doc-shell">
  <a class="skip-link" href="#main">Skip to content</a>
  ${mobileHeader}
  <aside class="doc-sidebar">
    <a class="doc-brand" href="/">${escapeHtml(manifest.config.site.name)}${manifest.config.site.description ? `<span>${escapeHtml(manifest.config.site.description)}</span>` : ""}</a>
    ${renderSearchLink(manifest)}
    ${versions}
    ${nav}
  </aside>
  <main id="main" class="doc-main">
    <header class="doc-topbar">${breadcrumbs}</header>
    ${pageToc}
    <div class="doc-content${contentClass}">
      ${body}
      ${pageNav}
    </div>
  </main>
  ${searchModal}
  ${script}
  ${copyScript}
  ${apiNavFilterScript}
  ${searchAssets.body}
  ${searchModalScript}
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
    "--doc-success": "#16a34a",
    "--doc-success-text": "#166534",
    "--doc-warning": "#d97706",
    "--doc-warning-text": "#92400e",
    "--doc-danger": "#dc2626",
    "--doc-danger-text": "#991b1b",
    "--doc-info": "#2563eb",
    "--doc-info-text": "#1d4ed8",
  };
  const variables = [
    `:root { color-scheme: ${cssValue(darkMode)}; font-family: var(--doc-font-family);`,
    ...Object.entries(values).map(([name, value]) => `      ${name}: ${cssValue(value)};`),
    "    }",
    ...(theme.darkMode ? [
      "    @media (prefers-color-scheme: dark) {",
      "      :root {",
      "        --doc-background: #0b1020;",
      "        --doc-text: #f8fafc;",
      "        --doc-muted-text: #a8b3c7;",
      "        --doc-border: #263244;",
      "        --doc-code-background: #111827;",
      "        --doc-success: #4ade80;",
      "        --doc-success-text: #86efac;",
      "        --doc-warning: #fbbf24;",
      "        --doc-warning-text: #fde68a;",
      "        --doc-danger: #f87171;",
      "        --doc-danger-text: #fecaca;",
      "        --doc-info: #60a5fa;",
      "        --doc-info-text: #bfdbfe;",
      "      }",
      "    }",
    ] : []),
  ].join("\n");

  return {
    variables,
    customCss: theme.customCss ? sanitizeStyleText(theme.customCss) : "",
  };
}

interface TocHeading {
  id: string;
  level: 2 | 3;
  text: string;
}

function enhanceContentHeadings(html: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const seen = new Map<string, number>();
  const enhanced = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, levelSource: string, innerHtml: string) => {
    const text = stripTags(innerHtml).trim();
    if (!text) return _match;
    const baseId = slugify(text);
    const count = (seen.get(baseId) ?? 0) + 1;
    seen.set(baseId, count);
    const id = count === 1 ? baseId : `${baseId}-${count}`;
    const level = Number(levelSource) as 2 | 3;
    headings.push({ id, level, text });
    const anchor = `<a class="doc-heading-anchor" href="#${escapeHtml(id)}" aria-label="Link to ${escapeHtml(text)}">#</a>`;
    return `<h${level} id="${escapeHtml(id)}">${anchor}${innerHtml}</h${level}>`;
  });

  return { html: enhanced, headings };
}

function enhanceCodeBlocks(html: string): string {
  if (html.includes("data-copy-code")) return html;
  return html.replace(/<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (_match, preAttrs: string, codeAttrs: string, code: string) => {
    return `<div class="doc-code-copy"><button type="button" class="doc-copy-button" data-copy-code>Copy</button><pre${preAttrs}><code${codeAttrs}>${code}</code></pre></div>`;
  });
}

function renderCopyScript(): string {
  return `<script data-documentee-copy>
  (() => {
    document.querySelectorAll("[data-copy-code]").forEach((button) => {
      button.addEventListener("click", async () => {
        const wrapper = button.closest(".doc-code-copy");
        const code = wrapper?.querySelector("code");
        if (!code) return;
        const original = button.textContent || "Copy";
        try {
          await navigator.clipboard.writeText(code.innerText);
          button.textContent = "Copied";
        } catch {
          button.textContent = "Copy failed";
        }
        window.setTimeout(() => {
          button.textContent = original;
        }, 1600);
      });
    });
  })();
</script>`;
}

function renderPageToc(headings: TocHeading[], className = ""): string {
  if (headings.length === 0) return "";
  const links = headings
    .map((heading) => `<a class="toc-level-${heading.level}" href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a>`)
    .join("\n    ");

  return `<details class="doc-on-this-page">
  <summary>On this page</summary>
  <nav aria-label="On this page">
    ${links}
  </nav>
</details>
<nav class="doc-page-toc${className}" aria-label="On this page">
  <span>On this page</span>
  ${links}
</nav>`;
}

interface NavigationEntry {
  route: SiteRoute;
  group?: string;
}

function navigationEntries(manifest: SiteManifest): NavigationEntry[] {
  const entries: NavigationEntry[] = [];
  const seen = new Set<string>();
  const addRoute = (route: SiteRoute | undefined, group?: string) => {
    if (!route || seen.has(route.route) || route.kind === "schema" || route.kind === "search") return;
    entries.push({ route, group });
    seen.add(route.route);
  };

  if (manifest.config.navigation.length === 0) {
    for (const route of manifest.routes) addRoute(route);
    return entries;
  }

  const routesByOperationRoute = new Map(manifest.routes.filter((route) => route.operation).map((route) => [route.operation!.route, route]));
  for (const group of manifest.config.navigation) {
    for (const pageRef of group.pages) {
      const route = routeFromPageRef(pageRef, manifest.config.content.directory);
      addRoute(manifest.routes.find((candidate) => candidate.route === route), group.group);
    }
    if (group.openapi) {
      for (const operation of manifest.operations.filter((item) => item.specId === group.openapi)) {
        addRoute(routesByOperationRoute.get(operation.route), group.group);
      }
    }
  }

  return entries;
}

function renderBreadcrumbs(manifest: SiteManifest, route: SiteRoute): string {
  const crumbs: Array<{ label: string; href?: string }> = [{ label: "Home", href: "/" }];
  const entry = navigationEntries(manifest).find((item) => item.route.route === route.route);
  if (route.route !== "/" && entry?.group) crumbs.push({ label: entry.group });

  if (route.kind === "api-operation" && route.operation) {
    const tag = route.operation.tags[0];
    if (tag && tag !== entry?.group) crumbs.push({ label: tag });
  }

  if (route.route !== "/") crumbs.push({ label: route.title || route.route });

  const content = crumbs
    .map((crumb, index) => {
      const separator = index === 0 ? "" : '<span class="doc-breadcrumb-separator">/</span>';
      const label = escapeHtml(crumb.label);
      const item = crumb.href && index !== crumbs.length - 1
        ? `<a href="${hrefForRoute(crumb.href)}">${label}</a>`
        : `<span>${label}</span>`;
      return `${separator}${item}`;
    })
    .join("");

  return `<nav class="doc-breadcrumbs" aria-label="Breadcrumbs">${content}</nav>`;
}

function renderPageNav(manifest: SiteManifest, route: SiteRoute): string {
  const entries = navigationEntries(manifest);
  const index = entries.findIndex((item) => item.route.route === route.route);
  if (index === -1) return "";
  const previous = entries[index - 1]?.route;
  const next = entries[index + 1]?.route;
  if (!previous && !next) return "";

  return `<nav class="doc-page-nav" aria-label="Page navigation">
  ${previous ? renderPageNavLink(previous, "Previous", "doc-page-nav-prev") : ""}
  ${next ? renderPageNavLink(next, "Next", "doc-page-nav-next") : ""}
</nav>`;
}

function renderPageNavLink(route: SiteRoute, label: string, className: string): string {
  return `<a class="${className}" href="${hrefForRoute(route.route)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(route.title)}</strong></a>`;
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function renderMobileHeader(manifest: SiteManifest, versions: string, nav: string): string {
  return `<header class="doc-mobile-header">
  <a class="doc-mobile-brand" href="/">${escapeHtml(manifest.config.site.name)}</a>
  <div class="doc-mobile-actions">
    ${renderSearchLink(manifest)}
    <details class="doc-mobile-menu" aria-label="Mobile navigation">
      <summary>Menu</summary>
      <nav class="doc-mobile-nav" aria-label="Mobile navigation">
        ${versions}
        ${nav}
      </nav>
    </details>
  </div>
</header>`;
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
        ? [renderOpenApiNavGroups(manifest, group.openapi, currentRoute)]
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

function renderOpenApiNavGroups(manifest: SiteManifest, specId: string, currentRoute: SiteRoute): string {
  const routesByOperationRoute = new Map(manifest.routes.filter((route) => route.operation).map((route) => [route.operation!.route, route]));
  const grouped = new Map<string, SiteRoute[]>();

  for (const operation of manifest.operations.filter((item) => item.specId === specId)) {
    const route = routesByOperationRoute.get(operation.route);
    if (!route) continue;
    const tag = operation.tags[0] || "API";
    grouped.set(tag, [...(grouped.get(tag) ?? []), route]);
  }

  const filter = `<div class="api-nav-filter">
    <input type="search" placeholder="Filter endpoints" aria-label="Filter API endpoints" data-api-nav-filter>
    <p class="api-nav-empty" data-api-nav-empty>No endpoints match.</p>
  </div>`;
  const groups = [...grouped.entries()]
    .map(([tag, routes]) => {
      const countLabel = `${routes.length} ${routes.length === 1 ? "endpoint" : "endpoints"}`;
      const open = routes.some((route) => route.route === currentRoute.route) ? " open" : "";
      return `<details class="nav-subgroup"${open}>
    <summary class="nav-subgroup-header"><span>${escapeHtml(tag)}</span><span class="nav-subgroup-count">${escapeHtml(countLabel)}</span></summary>
    ${routes.map((route) => renderApiNavLink(route, currentRoute)).join("\n    ")}
  </details>`;
    })
    .join("\n  ");

  return `${filter}\n  ${groups}`;
}

function renderApiNavLink(item: SiteRoute, currentRoute: SiteRoute): string {
  const operation = item.operation;
  if (!operation) return renderNavLink(item, currentRoute);
  const active = item.route === currentRoute.route ? " is-active" : "";
  const searchText = `${operation.method} ${operation.path} ${operation.summary ?? ""} ${operation.tags.join(" ")}`.toLowerCase();
  return `<a class="nav-link api-nav-link ${methodClass(operation.method)}${active}" href="${hrefForRoute(item.route)}" data-api-nav-text="${escapeHtml(searchText)}"><span class="nav-method">${escapeHtml(operation.method)}</span><span class="nav-path">${escapeHtml(operation.path)}</span></a>`;
}

function renderApiNavFilterScript(): string {
  return `<script data-documentee-api-nav-filter>
  (() => {
    document.querySelectorAll("[data-api-nav-filter]").forEach((input) => {
      const group = input.closest(".nav-group");
      if (!group) return;
      const empty = group.querySelector("[data-api-nav-empty]");
      const filter = () => {
        const query = input.value.trim().toLowerCase();
        let visible = 0;
        group.querySelectorAll(".nav-subgroup").forEach((subgroup) => {
          let subgroupVisible = 0;
          subgroup.querySelectorAll(".api-nav-link").forEach((link) => {
            const matches = !query || (link.getAttribute("data-api-nav-text") || "").includes(query);
            link.hidden = !matches;
            if (matches) subgroupVisible += 1;
          });
          subgroup.hidden = subgroupVisible === 0;
          if (query && subgroupVisible > 0) subgroup.setAttribute("open", "");
          visible += subgroupVisible;
        });
        if (empty) empty.style.display = visible === 0 ? "block" : "none";
      };
      input.addEventListener("input", filter);
      filter();
    });
  })();
</script>`;
}

function renderSearchLink(manifest: SiteManifest): string {
  if (manifest.config.search.provider !== "pagefind") return "";
  return `<a class="doc-search-link" href="/search/" data-search-open aria-haspopup="dialog" aria-controls="documentee-search-dialog">Search docs</a>`;
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
  const title = operation.summary || `${operation.method} ${operation.path}`;
  const description = operation.description ? `<p class="api-description">${escapeHtml(operation.description)}</p>` : "";
  const tags = operation.tags.map((tag) => `<span class="api-tag">${escapeHtml(tag)}</span>`);
  const authTags = operation.auth.map((auth) => `<span class="api-auth">Authentication: ${escapeHtml(auth)}</span>`);
  const badges = [operation.deprecated ? "Deprecated" : "", operation.beta ? "Beta" : ""].filter(Boolean).map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`);
  const meta = [...tags, ...authTags, ...badges].length > 0 ? `<div class="api-meta-row">${[...tags, ...authTags, ...badges].join("")}</div>` : "";
  const parameters = renderApiParameters(operation.parameters);
  const requestBody = renderApiRequestBody(operation);
  const responses = renderApiResponses(operation);
  const codeSamples = operation.codeSamples.length > 0
    ? `<section class="api-section">${renderApiSectionHeading("Code Samples", `${operation.codeSamples.length} ${operation.codeSamples.length === 1 ? "sample" : "samples"}`)}${operation.codeSamples.map((sample) => `<figure><figcaption>${escapeHtml(sample.lang)}</figcaption><pre><code>${escapeHtml(sample.source)}</code></pre></figure>`).join("")}</section>`
    : "";
  const playground = renderApiPlayground(route);

  return `<article class="api-operation">
  <header class="api-hero ${methodClass(operation.method)}">
    <div class="api-endpoint-command"><span class="method ${methodClass(operation.method)}">${escapeHtml(operation.method)}</span> <span class="path">${escapeHtml(operation.path)}</span></div>
    <h1>${escapeHtml(title)}</h1>
    ${description}
    ${meta}
  </header>
  <div class="api-operation-frame">
    <div class="api-operation-main">
      ${renderApiOverview(operation)}
      ${parameters}
      ${requestBody}
      ${responses}
      ${codeSamples}
      ${playground}
    </div>
    ${renderApiRail(operation)}
  </div>
</article>`;
}

function renderApiPortal(manifest: SiteManifest, route: SiteRoute): string {
  const portal = route.apiPortal;
  if (!portal) return "";

  return `<article>
  <h1>${escapeHtml(portal.title)}</h1>
  <div class="api-portal-list">
    ${portal.specs.map((spec) => {
      const operations = `${spec.operationCount} ${spec.operationCount === 1 ? "operation" : "operations"}`;
      const specOperations = manifest.operations.filter((operation) => operation.specId === spec.id);
      const tags = tagStats(specOperations);
      const tagCount = `${tags.length} ${tags.length === 1 ? "tag" : "tags"}`;
      const authCount = specOperations.filter((operation) => operation.auth.length > 0).length;
      const link = spec.firstOperationRoute
        ? `<a class="api-portal-card-action" href="${hrefForRoute(spec.firstOperationRoute)}">View</a>`
        : "";
      return `<section class="api-portal-card">
      <div class="api-portal-card-head">
        <div class="api-portal-card-title"><h2>${escapeHtml(spec.name)}</h2><p>${escapeHtml(operations)}</p></div>
        ${link}
      </div>
      <div class="api-portal-card-meta"><span>${escapeHtml(spec.id)}</span>${spec.version ? `<span>${escapeHtml(spec.version.label)}</span>` : ""}<span>${escapeHtml(operations)}</span></div>
      <div class="api-portal-stats"><span>${escapeHtml(tagCount)}</span><span>${escapeHtml(`${authCount} authenticated`)}</span></div>
      ${tags.length > 0 ? `<div class="api-portal-tags">${tags.slice(0, 8).map((tag) => `<span>${escapeHtml(tag.name)} · ${tag.count}</span>`).join("")}</div>` : ""}
    </section>`;
    }).join("\n    ")}
  </div>
</article>`;
}

function renderApiParameters(parameters: NonNullable<SiteRoute["operation"]>["parameters"]): string {
  if (parameters.length === 0) return "";
  const groups = new Map<string, typeof parameters>();
  for (const parameter of parameters) {
    groups.set(parameter.location, [...(groups.get(parameter.location) ?? []), parameter]);
  }

  return `<section class="api-section">
  ${renderApiSectionHeading("Parameters", `${parameters.length} ${parameters.length === 1 ? "parameter" : "parameters"}`)}
  <div class="api-param-groups">
    ${[...groups.entries()].map(([location, items]) => `<section class="api-param-group">
      <h3>${escapeHtml(location)} parameters</h3>
      <div class="api-param-list">${items.map((parameter) => `<article class="api-param-card">
        <header><code>${escapeHtml(parameter.name)}</code><span class="${parameter.required ? "api-required" : "api-optional"}">${parameter.required ? "required" : "optional"}</span></header>
        ${parameter.description ? `<p>${escapeHtml(parameter.description)}</p>` : ""}
        ${renderSchemaMetadata(parameter)}
      </article>`).join("")}</div>
    </section>`).join("\n    ")}
  </div>
</section>`;
}

function renderApiRequestBody(operation: NonNullable<SiteRoute["operation"]>): string {
  const requestBody = operation.requestBody;
  if (!requestBody) return "";
  const mediaTypes = requestBody.mediaTypes.length > 0 ? requestBody.mediaTypes : ["No media type declared"];
  const fields = requestBody.fields ?? [];
  const fieldTitle = mediaTypes.includes("multipart/form-data") ? "Form fields" : "Body fields";

  return `<section class="api-section">
  ${renderApiSectionHeading("Request Body", `${mediaTypes.length} ${mediaTypes.length === 1 ? "media type" : "media types"}`)}
  <div class="api-request-card api-panel-card">
    <div class="api-chip-row"><span class="${requestBody.required ? "api-required" : "api-optional"}">${requestBody.required ? "required" : "optional"}</span>${mediaTypes.map((mediaType) => `<span class="api-chip">${escapeHtml(mediaType)}</span>`).join("")}</div>
    ${renderSchemaRefs(operation.specId, requestBody.schemaRefs)}
    ${fields.length > 0 ? `<section class="api-param-group">
      <h3>${escapeHtml(fieldTitle)}</h3>
      <div class="api-field-list">${fields.map((field) => `<article class="api-field-row">
        <header><code>${escapeHtml(field.name)}</code><span class="${field.required ? "api-required" : "api-optional"}">${field.required ? "required" : "optional"}</span></header>
        ${field.description ? `<p>${escapeHtml(field.description)}</p>` : ""}
        ${renderSchemaMetadata(field)}
      </article>`).join("")}</div>
    </section>` : ""}
  </div>
</section>`;
}

function renderApiResponses(operation: NonNullable<SiteRoute["operation"]>): string {
  if (operation.responses.length === 0) return "";
  return `<section class="api-section">
  ${renderApiSectionHeading("Responses", `${operation.responses.length} ${operation.responses.length === 1 ? "response" : "responses"}`)}
  <div class="api-response-list">
    ${operation.responses.map((response) => `<article class="api-response-card ${statusClass(response.status)}">
      <header><span class="api-status-code">${escapeHtml(response.status)}</span>${response.mediaTypes.length > 0 ? `<div class="api-chip-row">${response.mediaTypes.map((mediaType) => `<span class="api-chip">${escapeHtml(mediaType)}</span>`).join("")}</div>` : ""}</header>
      ${response.description ? `<p>${escapeHtml(response.description)}</p>` : ""}
      ${renderSchemaRefs(operation.specId, response.schemaRefs)}
    </article>`).join("\n    ")}
  </div>
</section>`;
}

function renderApiOverview(operation: NonNullable<SiteRoute["operation"]>): string {
  const requestLabel = operation.requestBody
    ? operation.requestBody.mediaTypes[0] ?? "body"
    : operation.parameters.length > 0
      ? `${operation.parameters.length} ${operation.parameters.length === 1 ? "parameter" : "parameters"}`
      : "none";
  const authLabel = operation.auth.length > 0 ? operation.auth.join(", ") : "none";
  const responseLabel = operation.responses.length > 0 ? operation.responses.map((response) => response.status).join(", ") : "none";

  return `<section class="api-overview-grid" aria-label="Endpoint summary">
  <div class="api-overview-item"><span class="api-overview-label">Method</span><span class="api-overview-value">${escapeHtml(operation.method)}</span></div>
  <div class="api-overview-item"><span class="api-overview-label">Path</span><span class="api-overview-value">${escapeHtml(operation.path)}</span></div>
  <div class="api-overview-item"><span class="api-overview-label">Auth</span><span class="api-overview-value">${escapeHtml(authLabel)}</span></div>
  <div class="api-overview-item"><span class="api-overview-label">Request</span><span class="api-overview-value">${escapeHtml(requestLabel)}</span></div>
  <div class="api-overview-item"><span class="api-overview-label">Responses</span><span class="api-overview-value">${escapeHtml(responseLabel)}</span></div>
</section>`;
}

function renderApiRail(operation: NonNullable<SiteRoute["operation"]>): string {
  const authLabel = operation.auth.length > 0 ? operation.auth.join(", ") : "None";
  const tagLabel = operation.tags.length > 0 ? operation.tags.join(", ") : "API";
  const requestLabel = operation.requestBody
    ? (operation.requestBody.mediaTypes.length > 0 ? operation.requestBody.mediaTypes.join(", ") : "Body declared")
    : "No body";
  const responseLabel = operation.responses.length > 0 ? operation.responses.map((response) => response.status).join(", ") : "No responses";

  return `<aside class="api-operation-rail" aria-label="Operation summary">
  <section class="api-rail-card">
    <h2 data-no-toc>Operation</h2>
    <dl class="api-rail-list">
      <div class="api-rail-row"><dt class="api-rail-label">Method</dt><dd class="api-rail-value">${escapeHtml(operation.method)}</dd></div>
      <div class="api-rail-row"><dt class="api-rail-label">Path</dt><dd class="api-rail-value">${escapeHtml(operation.path)}</dd></div>
      <div class="api-rail-row"><dt class="api-rail-label">Tag</dt><dd class="api-rail-value">${escapeHtml(tagLabel)}</dd></div>
    </dl>
  </section>
  <section class="api-rail-card">
    <h2 data-no-toc>Details</h2>
    <dl class="api-rail-list">
      <div class="api-rail-row"><dt class="api-rail-label">Auth</dt><dd class="api-rail-value">${escapeHtml(authLabel)}</dd></div>
      <div class="api-rail-row"><dt class="api-rail-label">Request</dt><dd class="api-rail-value">${escapeHtml(requestLabel)}</dd></div>
      <div class="api-rail-row"><dt class="api-rail-label">Responses</dt><dd class="api-rail-value">${escapeHtml(responseLabel)}</dd></div>
    </dl>
  </section>
</aside>`;
}

function renderApiSectionHeading(title: string, count: string): string {
  return `<div class="api-section-heading"><div><span class="api-section-eyebrow">Reference</span><h2>${escapeHtml(title)}</h2></div><span class="api-section-count">${escapeHtml(count)}</span></div>`;
}

function renderSchemaMetadata(value: {
  schemaRef?: string;
  schemaType?: string;
  schemaFormat?: string;
  enumValues?: string[];
}): string {
  const displayType = schemaDisplayType(value);
  const chips = [
    value.schemaRef ? `<span class="api-chip">${escapeHtml(value.schemaRef)}</span>` : "",
    displayType ? `<span class="api-chip">${escapeHtml(displayType)}</span>` : "",
    ...(value.enumValues ?? []).map((item) => `<span class="api-chip">${escapeHtml(item)}</span>`),
  ].filter(Boolean);
  return chips.length > 0 ? `<div class="api-chip-row">${chips.join("")}</div>` : "";
}

function schemaDisplayType(value: {
  schemaType?: string;
  schemaFormat?: string;
}): string | undefined {
  if (value.schemaType === "array" && value.schemaFormat === "binary") return "file[]";
  if (value.schemaFormat === "binary") return "file";
  if (value.schemaType && value.schemaFormat) return `${value.schemaType}<${value.schemaFormat}>`;
  return value.schemaType ?? value.schemaFormat;
}

function tagStats(operations: SiteManifest["operations"]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const operation of operations) {
    const tag = operation.tags[0] || "API";
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
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

function renderSearchModal(manifest: SiteManifest): string {
  if (manifest.config.search.provider !== "pagefind") return "";
  const suggestions = searchSuggestionItems(manifest);
  if (suggestions.length === 0) return "";

  return `<dialog id="documentee-search-dialog" class="search-modal" aria-labelledby="documentee-search-title">
  <div class="search-modal-inner">
    <header class="search-modal-head">
      <div class="search-modal-title">
        <h2 id="documentee-search-title">Search docs</h2>
        <p>Jump to guides and API reference pages.</p>
      </div>
      <button class="search-close" type="button" data-search-close aria-label="Close search">&times;</button>
    </header>
    <div class="search-modal-body">
      <input class="search-modal-input" type="search" placeholder="Search pages and endpoints" aria-label="Search pages and endpoints" data-search-input>
      <div class="search-suggestion-header">
        <h3>Suggested pages</h3>
        <a href="/search/">Full search</a>
      </div>
      <ul class="search-suggestion-list">
        ${suggestions.map((item) => `<li data-search-item data-search-text="${escapeHtml(`${item.title} ${item.meta}`.toLowerCase())}"><a href="${hrefForRoute(item.route)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)}</span></a></li>`).join("\n        ")}
      </ul>
      <p class="search-empty" data-search-empty>No matching suggestions. Open full search for Pagefind results.</p>
    </div>
  </div>
</dialog>`;
}

function searchSuggestionItems(manifest: SiteManifest): Array<{ title: string; meta: string; route: string }> {
  return manifest.routes
    .map((route, index) => {
      if (route.route === "/search" || route.kind === "search" || route.kind === "schema" || route.title.trim().length === 0) {
        return undefined;
      }
      const operation = route.operation;
      const title = operation?.summary || route.title;
      const meta = operation ? `${operation.method} ${operation.path}` : route.description || route.route;
      const searchText = `${title} ${meta} ${route.route}`.toLowerCase();
      const priority = searchText.includes("search") ? 0 : route.kind === "api-operation" ? 1 : 2;
      return { title, meta, route: route.route, priority, index };
    })
    .filter((item): item is { title: string; meta: string; route: string; priority: number; index: number } => Boolean(item))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .slice(0, 50)
    .map(({ title, meta, route }) => ({ title, meta, route }));
}

function renderSearchModalScript(manifest: SiteManifest): string {
  if (manifest.config.search.provider !== "pagefind") return "";
  return `<script data-documentee-search-modal>
  (() => {
    const dialog = document.getElementById("documentee-search-dialog");
    if (!dialog) return;
    const input = dialog.querySelector("[data-search-input]");
    const items = Array.from(dialog.querySelectorAll("[data-search-item]"));
    const empty = dialog.querySelector("[data-search-empty]");
    const filter = () => {
      const query = (input?.value || "").trim().toLowerCase();
      let visible = 0;
      for (const item of items) {
        const matches = !query || (item.getAttribute("data-search-text") || "").includes(query);
        item.hidden = !matches;
        if (matches) visible += 1;
      }
      if (empty) empty.style.display = visible === 0 ? "block" : "none";
    };
    document.querySelectorAll("[data-search-open]").forEach((trigger) => {
      trigger.addEventListener("click", (event) => {
        if (typeof dialog.showModal !== "function") return;
        event.preventDefault();
        dialog.showModal();
        filter();
        setTimeout(() => input?.focus(), 0);
      });
    });
    dialog.querySelectorAll("[data-search-close]").forEach((trigger) => {
      trigger.addEventListener("click", () => dialog.close());
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    input?.addEventListener("input", filter);
  })();
</script>`;
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
  const body = operation.requestBody ? renderPlaygroundBody(operation.requestBody) : "";

  return `<section class="api-playground">
  <h2>Try It</h2>
  <form data-documentee-playground data-method="${escapeHtml(operation.method)}" data-path="${escapeHtml(operation.path)}" data-auth="${escapeHtml(playground.auth)}" data-api-key-name="${escapeHtml(playground.apiKeyName ?? "")}" data-api-key-location="${escapeHtml(playground.apiKeyLocation)}">
    <label>Base URL
      <input name="baseUrl" type="url" value="${escapeHtml(playground.baseUrl ?? "")}" required>
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

function renderPlaygroundBody(requestBody: NonNullable<NonNullable<SiteRoute["operation"]>["requestBody"]>): string {
  const options = (requestBody.mediaTypes.length > 0 ? requestBody.mediaTypes : ["application/json"])
    .map((mediaType) => `<option value="${escapeHtml(mediaType)}">${escapeHtml(mediaType)}</option>`)
    .join("");
  const fieldHint = requestBody.fields && requestBody.fields.length > 0
    ? `<p class="api-playground-hint">${requestBody.mediaTypes.includes("multipart/form-data") ? "Multipart form fields" : "Body fields"}: ${requestBody.fields.map((field) => `${field.name}${field.required ? " *" : ""}`).map(escapeHtml).join(", ")}</p>`
    : "";
  return `<fieldset>
  <legend>Request Body</legend>
  <label>Media Type
    <select name="mediaType">${options}</select>
  </label>
  ${fieldHint}
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
  return `<p class="api-schema-links">Schemas: ${schemaRefs.map((schema) => `<a href="${hrefForRoute(joinSchemaRoute(specId, schema))}">${escapeHtml(schema)}</a>`).join(", ")}</p>`;
}

function methodClass(method: string): string {
  return `method-${method.toLowerCase()}`;
}

function statusClass(status: string): string {
  if (/^2/.test(status)) return "api-status-2xx";
  if (/^3/.test(status)) return "api-status-3xx";
  if (/^4/.test(status)) return "api-status-4xx";
  if (/^5/.test(status)) return "api-status-5xx";
  return "api-status-default";
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
