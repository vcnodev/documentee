import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { escapeHtml } from "./html.js";
import { routeToOutputPath } from "./paths.js";
import { renderPlaygroundScript } from "./playground.js";
import { applyHtmlPlugins } from "./plugins.js";
import { getRedirects, getSeoConfig, renderRedirectHtml, renderRedirectsFile, renderRobotsTxt, renderSeoHead, renderSitemapXml, renderVercelRedirectsJson } from "./seo.js";
import type { SiteManifest, SiteRoute, VersionReference } from "./manifest.js";
import type { DocumenteeConfig } from "./config.js";

export interface StaticRenderOptions {
  outDir: string;
  htmlBudgetBytes?: number;
}

export async function renderStaticSite(manifest: SiteManifest, options: StaticRenderOptions): Promise<void> {
  await mkdir(options.outDir, { recursive: true });
  for (const route of manifest.routes) {
    const html = await renderRouteWithPlugins(manifest, route);
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

export async function renderRouteWithPlugins(manifest: SiteManifest, route: SiteRoute): Promise<string> {
  return applyHtmlPlugins(renderRoute(manifest, route), route, manifest);
}

export function renderRoute(manifest: SiteManifest, route: SiteRoute): string {
  const layout = manifest.config.layout;
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
  const localeSwitcher = renderLocaleSwitcher(manifest, route);
  const mobileHeader = renderMobileHeader(manifest, versions, localeSwitcher, nav);
  const script = route.operation?.playground?.enabled ? renderPlaygroundScript() : "";
  const copyScript = body.includes("data-copy-code") ? renderCopyScript() : "";
  const apiNavFilterScript = nav.includes("data-api-nav-filter") ? renderApiNavFilterScript() : "";
  const searchAssets = renderSearchAssets(manifest, route);
  const searchModal = renderSearchModal(manifest);
  const searchModalScript = renderSearchModalScript(manifest);
  const assistant = renderAssistant(manifest, route);
  const assistantScript = assistant ? renderAssistantScript() : "";
  const feedback = renderFeedback(manifest, route);
  const feedbackScript = feedback ? renderFeedbackScript() : "";
  const analyticsScript = renderAnalyticsScript(manifest);
  const theme = renderThemeCss(manifest);
  const language = route.locale?.code ?? manifest.locales?.find((locale) => locale.default)?.code ?? "en";
  const direction = route.locale?.dir ?? manifest.locales?.find((locale) => locale.default)?.dir ?? "ltr";
  const contentClass = route.kind === "api-operation" || route.kind === "api-portal" ? " api-doc-content" : "";
  const pageToc = renderPageToc(headings, route.kind === "api-operation" ? " api-page-toc" : "", layout.toc);
  const breadcrumbs = layout.breadcrumbs ? renderBreadcrumbs(manifest, route) : "";
  const pageNav = renderPageNav(manifest, route);
  const footer = layout.footer ? renderFooter(manifest, route, pageNav) : "";
  const announcement = renderAnnouncement(manifest.config.layout.announcement);

  return `<!doctype html>
<html lang="${escapeHtml(language)}"${direction === "rtl" ? ' dir="rtl"' : ""}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${renderSeoHead(manifest, route)}
  ${searchAssets.head}
  ${analyticsScript}
  <style>
    ${theme.variables}
    * { box-sizing: border-box; }
    body { background: color-mix(in srgb, var(--doc-background) 94%, var(--doc-border)); color: var(--doc-text); font-family: var(--doc-font-family); margin: 0; min-height: 100vh; }
    .skip-link { background: var(--doc-text); border-radius: var(--doc-radius); color: var(--doc-background); font-weight: 800; left: 16px; padding: 9px 12px; position: fixed; text-decoration: none; top: 16px; transform: translateY(-140%); transition: transform 120ms ease; z-index: 20; }
    .skip-link:focus { transform: translateY(0); }
    :where(a, button, input, select, textarea, summary):focus-visible { outline: 3px solid color-mix(in srgb, var(--doc-primary) 70%, white); outline-offset: 3px; }
    .doc-shell { display: grid; grid-template-columns: var(--doc-nav-width) minmax(0, 1fr); }
    .doc-sidebar { align-self: start; background: color-mix(in srgb, var(--doc-background) 94%, var(--doc-border)); border-right: 1px solid var(--doc-border); display: flex; flex-direction: column; gap: 18px; height: 100vh; min-height: 100vh; overflow-y: auto; padding: 22px; position: sticky; top: 0; }
    [dir="rtl"] .doc-sidebar { border-left: 1px solid var(--doc-border); border-right: 0; }
    .doc-mobile-header { display: none; }
    .doc-brand { color: inherit; display: grid; gap: 4px; font-weight: 800; text-decoration: none; }
    .doc-brand span { color: var(--doc-muted-text); font-size: 13px; font-weight: 500; }
    .doc-search-link { align-items: center; border: 1px solid var(--doc-border); border-radius: var(--doc-radius); color: var(--doc-muted-text); display: flex; font-size: 14px; gap: 12px; justify-content: space-between; padding: 10px 12px; text-decoration: none; }
    .doc-search-shortcut { align-items: center; display: inline-flex; flex: 0 0 auto; gap: 3px; }
    .doc-search-shortcut kbd, .search-shortcut-hint kbd { background: color-mix(in srgb, var(--doc-background) 88%, var(--doc-border)); border: 1px solid var(--doc-border); border-radius: 4px; color: var(--doc-muted-text); font: 700 11px/1 var(--doc-code-font-family); padding: 3px 5px; }
    .locale-switcher { display: grid; gap: 6px; }
    .locale-switcher span { color: var(--doc-muted-text); font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .locale-switcher-links { display: flex; flex-wrap: wrap; gap: 6px; }
    .locale-switcher a { border: 1px solid var(--doc-border); border-radius: 999px; color: var(--doc-muted-text); font-size: 12px; font-weight: 800; padding: 5px 8px; text-decoration: none; }
    .locale-switcher a:hover, .locale-switcher a.is-active { background: color-mix(in srgb, var(--doc-primary) 10%, transparent); color: var(--doc-primary); }
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
    .doc-main { background: color-mix(in srgb, var(--doc-background) 98%, white); min-width: 0; }
    .doc-announcement { background: color-mix(in srgb, var(--doc-primary) 12%, var(--doc-background)); border-bottom: 1px solid color-mix(in srgb, var(--doc-primary) 24%, var(--doc-border)); color: var(--doc-text); font-size: 14px; font-weight: 700; padding: 11px clamp(20px, 5vw, 56px); }
    .doc-topbar { align-items: center; border-bottom: 1px solid var(--doc-border); display: flex; justify-content: space-between; min-height: 58px; padding: 0 clamp(20px, 5vw, 56px); }
    .doc-topbar span { color: var(--doc-muted-text); font-size: 13px; }
    .doc-breadcrumbs { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
    .doc-breadcrumbs a, .doc-breadcrumbs span { color: var(--doc-muted-text); font-size: 13px; line-height: 1.4; text-decoration: none; }
    .doc-breadcrumbs a:hover { color: var(--doc-primary); }
    .doc-breadcrumbs .doc-breadcrumb-current, .doc-breadcrumbs span:last-child { color: var(--doc-text); font-weight: 700; overflow-wrap: anywhere; }
    .doc-breadcrumb-separator { color: var(--doc-muted-text); font-size: 12px; }
    .doc-content-frame { max-width: 920px; padding: 42px clamp(20px, 5vw, 56px) 72px; }
    .doc-content-frame.api-doc-content { max-width: 1260px; }
    .doc-content { background: var(--doc-background); border: 1px solid color-mix(in srgb, var(--doc-border) 70%, transparent); border-radius: min(var(--doc-radius), 8px); box-shadow: 0 18px 48px rgb(15 23 42 / 6%); padding: clamp(24px, 4vw, 44px); }
    .doc-content h1 { font-size: clamp(36px, 4.8vw, 58px); letter-spacing: 0; line-height: 1.02; margin: 0 0 18px; }
    .doc-content h2 { border-top: 1px solid var(--doc-border); font-size: clamp(24px, 2.4vw, 31px); letter-spacing: 0; line-height: 1.18; margin: 40px 0 14px; padding-top: 30px; }
    .doc-content h3 { font-size: 20px; letter-spacing: 0; line-height: 1.28; margin: 28px 0 10px; }
    .doc-content :where(h2, h3) { scroll-margin-top: 82px; }
    .doc-heading-anchor { color: var(--doc-muted-text); margin-right: 8px; opacity: 0; text-decoration: none; }
    .doc-content :where(h2, h3):hover .doc-heading-anchor, .doc-heading-anchor:focus-visible { opacity: 1; }
    .doc-on-this-page { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); display: none; margin: 0 0 24px; }
    .doc-on-this-page-inline { display: block; }
    .doc-on-this-page summary { cursor: pointer; font-weight: 800; padding: 12px 14px; }
    .doc-on-this-page nav { border-top: 1px solid var(--doc-border); display: grid; gap: 8px; padding: 12px 14px; }
    .doc-page-toc { border-left: 1px solid var(--doc-border); color: var(--doc-muted-text); display: grid; float: right; gap: 8px; margin: 42px clamp(20px, 5vw, 56px) 24px 24px; max-width: 220px; padding-left: 14px; position: sticky; top: 80px; width: 20vw; }
    .doc-page-toc.api-page-toc { display: none; }
    .doc-page-toc span { font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .doc-page-toc a, .doc-on-this-page a { color: var(--doc-muted-text); font-size: 13px; line-height: 1.35; text-decoration: none; }
    .doc-page-toc a:hover, .doc-on-this-page a:hover { color: var(--doc-primary); }
    .doc-page-toc .toc-level-3, .doc-on-this-page .toc-level-3 { padding-left: 12px; }
    .doc-content > h1 + p { color: var(--doc-muted-text); font-size: 1.16rem; line-height: 1.72; margin-bottom: 28px; }
    .doc-content p, .doc-content li { line-height: 1.72; }
    .doc-content table { border-collapse: collapse; display: block; margin: 18px 0; overflow-x: auto; width: 100%; }
    .doc-content td, .doc-content th { border-bottom: 1px solid var(--doc-border); padding: 10px 12px; text-align: left; }
    code, pre { background: var(--doc-code-background); font-family: var(--doc-code-font-family); }
    pre { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); overflow: auto; padding: 14px; }
    .doc-code-copy { display: grid; gap: 0; margin: 18px 0; position: relative; }
    .doc-code-copy pre { margin: 0; }
    .doc-code-copy figcaption, .doc-code-block figcaption, .doc-pre figcaption, .doc-snippet figcaption { align-items: center; display: flex; justify-content: space-between; }
    .doc-copy-button { align-self: start; background: color-mix(in srgb, var(--doc-background) 88%, var(--doc-border)); border: 1px solid var(--doc-border); border-radius: 6px; color: var(--doc-muted-text); cursor: pointer; font: inherit; font-size: 12px; font-weight: 800; justify-self: end; margin: 8px 8px -32px 0; padding: 5px 8px; position: relative; z-index: 1; }
    .doc-copy-button:hover { color: var(--doc-text); }
    .doc-footer { border-top: 1px solid var(--doc-border); color: var(--doc-muted-text); display: grid; gap: 18px; margin-top: 34px; padding-top: 18px; }
    .doc-footer-meta { align-items: center; display: flex; flex-wrap: wrap; gap: 10px 16px; font-size: 13px; }
    .doc-footer-meta a { font-weight: 800; text-decoration: none; }
    ${assistant ? renderAssistantCss() : ""}
    ${feedback ? renderFeedbackCss() : ""}
    .doc-page-nav { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
    .doc-card, .doc-card-list-item { background: color-mix(in srgb, var(--doc-background) 96%, var(--doc-border)); border: 1px solid color-mix(in srgb, var(--doc-border) 78%, transparent); border-radius: min(var(--doc-radius), 8px); color: inherit; display: flex; gap: 12px; padding: 16px; text-decoration: none; transition: background 140ms ease, border-color 140ms ease, transform 140ms ease; }
    .doc-card:hover, .doc-card-list-item:hover { background: color-mix(in srgb, var(--doc-primary) 7%, var(--doc-background)); border-color: color-mix(in srgb, var(--doc-primary) 34%, var(--doc-border)); transform: translateY(-1px); }
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
    .doc-package-install, .doc-cli-command, .doc-mermaid { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); margin: 20px 0; overflow: hidden; }
    .doc-package-install figcaption, .doc-cli-command figcaption, .doc-mermaid figcaption { background: color-mix(in srgb, var(--doc-border) 30%, transparent); color: var(--doc-muted-text); font-size: 13px; font-weight: 900; padding: 9px 12px; }
    .doc-package-install ul { display: grid; gap: 0; list-style: none; margin: 0; padding: 0; }
    .doc-package-install li { align-items: center; border-top: 1px solid color-mix(in srgb, var(--doc-border) 64%, transparent); display: grid; gap: 12px; grid-template-columns: 76px minmax(0, 1fr); margin: 0; padding: 10px 12px; }
    .doc-package-install li:first-child { border-top: 0; }
    .doc-package-install span { color: var(--doc-muted-text); font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .doc-package-install code { overflow-wrap: anywhere; }
    .doc-cli-command pre, .doc-mermaid pre { border: 0; border-radius: 0; margin: 0; }
    .doc-mermaid pre { background: color-mix(in srgb, var(--doc-primary) 4%, var(--doc-code-background)); }
    .doc-changelog { border-left: 2px solid color-mix(in srgb, var(--doc-primary) 42%, var(--doc-border)); display: grid; gap: 14px; margin: 22px 0; padding-left: 16px; }
    .doc-update { border: 1px solid color-mix(in srgb, var(--doc-border) 72%, transparent); border-radius: var(--doc-radius); display: grid; gap: 8px; padding: 14px; }
    .doc-update header { align-items: center; display: flex; flex-wrap: wrap; gap: 8px 10px; }
    .doc-update h3 { font-size: 16px; margin: 0; }
    .doc-update time { color: var(--doc-muted-text); font-size: 12px; font-weight: 800; }
    .doc-update p { color: var(--doc-muted-text); margin: 0; }
    .doc-update-label { border: 1px solid color-mix(in srgb, var(--doc-primary) 28%, var(--doc-border)); border-radius: 999px; color: var(--doc-primary); font-size: 11px; font-weight: 900; padding: 3px 7px; text-transform: uppercase; }
    .doc-columns, .doc-feature-grid { display: grid; gap: 14px; margin: 20px 0; }
    .doc-columns-2, .doc-feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .doc-columns-3, .doc-feature-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .doc-column, .doc-feature, .doc-endpoint-card, .doc-openapi-operation { border: 1px solid color-mix(in srgb, var(--doc-border) 72%, transparent); border-radius: var(--doc-radius); color: inherit; display: grid; gap: 8px; padding: 15px; text-decoration: none; }
    .doc-column h3, .doc-feature h3 { font-size: 16px; margin: 0; }
    .doc-column p, .doc-feature p, .doc-endpoint-card p, .doc-openapi-operation p { color: var(--doc-muted-text); margin: 0; }
    .doc-feature { grid-template-columns: auto minmax(0, 1fr); }
    .doc-feature-icon { align-items: center; background: color-mix(in srgb, var(--doc-primary) 10%, transparent); border: 1px solid color-mix(in srgb, var(--doc-primary) 22%, var(--doc-border)); border-radius: 8px; color: var(--doc-primary); display: inline-flex; font-family: var(--doc-code-font-family); font-size: 12px; font-weight: 900; height: 28px; justify-content: center; min-width: 28px; padding: 0 6px; }
    .doc-endpoint-card-link { align-items: center; color: inherit; display: grid; gap: 8px; grid-template-columns: auto minmax(0, 1fr); text-decoration: none; }
    .doc-endpoint-card:hover, .doc-openapi-operation:hover { border-color: color-mix(in srgb, var(--method-color, var(--doc-primary)) 42%, var(--doc-border)); }
    .doc-endpoint-card code, .doc-openapi-operation code { overflow-wrap: anywhere; }
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
    .version-switcher a { align-items: center; display: flex; gap: 8px; justify-content: space-between; min-width: 0; }
    .version-link-label { min-width: 0; overflow-wrap: anywhere; }
    .version-badges { display: inline-flex; flex: 0 0 auto; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
    .version-badge { border: 1px solid color-mix(in srgb, var(--doc-border) 72%, transparent); border-radius: 999px; font-size: 10px; font-weight: 900; line-height: 1; padding: 4px 6px; text-transform: uppercase; }
    .version-badge-latest { background: color-mix(in srgb, var(--doc-success) 12%, transparent); border-color: color-mix(in srgb, var(--doc-success) 32%, var(--doc-border)); color: var(--doc-success-text); }
    .version-badge-deprecated { background: color-mix(in srgb, var(--doc-warning) 12%, transparent); border-color: color-mix(in srgb, var(--doc-warning) 32%, var(--doc-border)); color: var(--doc-warning-text); }
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
    .api-schema-tree, .api-schema-children, .api-schema-composition, .api-examples { display: grid; gap: 10px; }
    .api-schema-tree { margin-top: 10px; }
    .api-schema-field { border: 1px solid color-mix(in srgb, var(--doc-border) 68%, transparent); border-radius: var(--doc-radius); overflow: hidden; }
    .api-schema-field summary { align-items: center; cursor: pointer; display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; list-style: none; padding: 12px 14px; }
    .api-schema-field summary::-webkit-details-marker { display: none; }
    .api-schema-title { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
    .api-schema-title code { border-radius: 6px; padding: 2px 6px; overflow-wrap: anywhere; }
    .api-schema-body { border-top: 1px solid color-mix(in srgb, var(--doc-border) 58%, transparent); display: grid; gap: 10px; padding: 12px 14px; }
    .api-schema-description, .api-example-description { color: var(--doc-muted-text); margin: 0; }
    .api-schema-composition { border-left: 2px solid color-mix(in srgb, var(--doc-primary) 36%, var(--doc-border)); padding-left: 12px; }
    .api-schema-composition h4, .api-examples h3 { color: var(--doc-muted-text); font-size: 12px; letter-spacing: 0; margin: 0; text-transform: uppercase; }
    .api-example { border: 1px solid color-mix(in srgb, var(--doc-border) 68%, transparent); border-radius: var(--doc-radius); margin: 0; overflow: hidden; }
    .api-example figcaption { background: color-mix(in srgb, var(--doc-border) 26%, transparent); color: var(--doc-muted-text); font-size: 13px; font-weight: 800; padding: 9px 12px; }
    .api-example pre { border: 0; border-radius: 0; margin: 0; }
    .api-code-sample { border: 1px solid color-mix(in srgb, var(--doc-border) 68%, transparent); border-radius: var(--doc-radius); overflow: hidden; }
    .api-code-sample summary { background: color-mix(in srgb, var(--doc-border) 24%, transparent); cursor: pointer; font-size: 13px; font-weight: 900; list-style: none; padding: 10px 12px; }
    .api-code-sample summary::-webkit-details-marker { display: none; }
    .api-code-sample pre { border: 0; border-radius: 0; margin: 0; }
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
    .api-playground-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr) minmax(260px, 0.8fr); }
    .api-playground-preview, .api-playground-output { display: grid; gap: 10px; min-width: 0; }
    .api-playground-preview h3, .api-playground-output h3 { color: var(--doc-muted-text); font-size: 12px; letter-spacing: 0; margin: 0; text-transform: uppercase; }
    .api-playground-preview pre, .api-playground-output pre { min-height: 72px; white-space: pre-wrap; }
    .api-playground-response-grid { display: grid; gap: 10px; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr); }
    .search-panel { display: grid; gap: 22px; }
    .search-hero { background: color-mix(in srgb, var(--doc-primary) 7%, var(--doc-background)); border: 1px solid color-mix(in srgb, var(--doc-primary) 22%, var(--doc-border)); border-radius: min(var(--doc-radius), 8px); display: grid; gap: 16px; padding: clamp(18px, 3vw, 28px); }
    .search-hero h1 { margin-bottom: 0; }
    .search-hero p { color: var(--doc-muted-text); font-size: 1.04rem; line-height: 1.65; margin: 0; }
    .search-stat-grid { display: grid; gap: 10px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .search-stat { background: color-mix(in srgb, var(--doc-background) 92%, var(--doc-border)); border: 1px solid color-mix(in srgb, var(--doc-border) 70%, transparent); border-radius: min(var(--doc-radius), 8px); display: grid; gap: 3px; padding: 12px; }
    .search-stat strong { font-size: 20px; line-height: 1; }
    .search-stat span { color: var(--doc-muted-text); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .search-pagefind { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); min-height: 72px; padding: 16px; }
    .search-section-grid { display: grid; gap: 16px; }
    .search-section { border: 1px solid color-mix(in srgb, var(--doc-border) 70%, transparent); border-radius: min(var(--doc-radius), 8px); padding: 16px; }
    .search-section h2 { border-top: 0; font-size: 18px; margin: 0 0 12px; padding-top: 0; }
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
    .search-shortcut-hint { align-items: center; color: var(--doc-muted-text); display: flex; flex-wrap: wrap; font-size: 12px; gap: 6px; justify-content: space-between; }
    .search-suggestion-groups { display: grid; gap: 14px; max-height: min(50vh, 420px); overflow: auto; }
    .search-suggestion-group { display: grid; gap: 8px; }
    .search-suggestion-group h3 { color: var(--doc-muted-text); font-size: 11px; letter-spacing: 0; margin: 0; text-transform: uppercase; }
    .search-suggestion-list { display: grid; gap: 8px; list-style: none; margin: 0; max-height: min(50vh, 420px); overflow: auto; padding: 0; }
    .search-suggestion-groups .search-suggestion-list { max-height: none; overflow: visible; }
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
      .api-playground-grid, .api-playground-response-grid { grid-template-columns: 1fr; }
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
      .doc-mobile-header .doc-search-label { display: none; }
      .doc-mobile-header .doc-search-shortcut { font-size: 12px; }
      .search-stat-grid { grid-template-columns: 1fr; }
      .doc-mobile-menu { position: relative; }
      .doc-mobile-menu summary { border: 1px solid var(--doc-border); border-radius: var(--doc-radius); cursor: pointer; font-weight: 800; list-style: none; padding: 8px 10px; }
      .doc-mobile-menu summary::-webkit-details-marker { display: none; }
      .doc-mobile-menu[open] .doc-mobile-nav { display: grid; }
      .doc-mobile-nav { background: var(--doc-background); border: 1px solid var(--doc-border); border-radius: var(--doc-radius); box-shadow: 0 20px 60px rgb(0 0 0 / 24%); display: none; gap: 16px; max-height: min(70vh, 520px); min-width: min(340px, calc(100vw - 40px)); overflow: auto; padding: 16px; position: absolute; right: 0; top: calc(100% + 8px); }
      .doc-topbar { min-height: 48px; }
      .doc-content-frame { padding-top: 28px; }
      .doc-content { border-left: 0; border-radius: 0; border-right: 0; margin-left: calc(clamp(20px, 5vw, 56px) * -1); margin-right: calc(clamp(20px, 5vw, 56px) * -1); padding-left: clamp(20px, 5vw, 56px); padding-right: clamp(20px, 5vw, 56px); }
      .doc-on-this-page { display: block; }
      .doc-page-nav { grid-template-columns: 1fr; }
      .doc-card-group-2, .doc-card-group-3, .doc-columns-2, .doc-columns-3, .doc-feature-grid, .doc-feature-grid-3 { grid-template-columns: 1fr; }
      .api-portal-card-head, .api-section-heading { align-items: start; flex-direction: column; }
      .api-overview-grid { grid-template-columns: 1fr; }
    }
    ${theme.customCss}
  </style>
</head>
<body class="doc-shell doc-app-shell">
  <a class="skip-link" href="#main">Skip to content</a>
  ${mobileHeader}
  <aside class="doc-sidebar">
    <a class="doc-brand" href="/">${escapeHtml(manifest.config.site.name)}${manifest.config.site.description ? `<span>${escapeHtml(manifest.config.site.description)}</span>` : ""}</a>
    ${renderSearchLink(manifest)}
    ${versions}
    ${localeSwitcher}
    ${nav}
  </aside>
  <main id="main" class="doc-main">
    ${announcement}
    <header class="doc-topbar">${breadcrumbs}</header>
    ${pageToc}
    <div class="doc-content-frame${contentClass}">
      <article class="doc-content">
        ${body}
        ${assistant}
        ${feedback}
        ${footer}
      </article>
    </div>
  </main>
  ${searchModal}
  ${script}
  ${copyScript}
  ${apiNavFilterScript}
  ${searchAssets.body}
  ${searchModalScript}
  ${assistantScript}
  ${feedbackScript}
</body>
</html>
`;
}

function renderThemeCss(manifest: SiteManifest): { variables: string; customCss: string } {
  const theme = manifest.config.theme;
  const preset = theme.preset ? themePresets[theme.preset] : {};
  const darkMode = theme.darkMode ? "light dark" : "light";
  const values = themeValues(theme, preset, "light");
  const darkValues = themeValues(theme, preset, "dark");
  const variables = [
    `:root { color-scheme: ${cssValue(darkMode)}; font-family: var(--doc-font-family);`,
    ...Object.entries(values).map(([name, value]) => `      ${name}: ${cssValue(value)};`),
    "    }",
    ...(theme.darkMode ? [
      "    @media (prefers-color-scheme: dark) {",
      "      :root {",
      ...Object.entries(darkValues).map(([name, value]) => `        ${name}: ${cssValue(value)};`),
      "      }",
      "    }",
    ] : []),
  ].join("\n");

  return {
    variables,
    customCss: theme.customCss ? sanitizeStyleText(theme.customCss) : "",
  };
}

function renderAssistant(manifest: SiteManifest, route: SiteRoute): string {
  const assistant = manifest.config.assistant;
  if (!assistant?.enabled || !assistant.endpoint || route.kind === "search") return "";

  return `<section class="doc-assistant" data-documentee-assistant data-assistant-endpoint="${escapeHtml(assistant.endpoint)}" data-assistant-route="${escapeHtml(route.route)}">
  <h2>Ask Docs</h2>
  <p>Send this page context to your configured docs assistant.</p>
  <form data-assistant-form>
    <textarea name="query" required placeholder="Ask about ${escapeHtml(route.title)}" aria-label="Ask docs question"></textarea>
    <button type="submit">Ask</button>
  </form>
  <pre class="doc-assistant-output" data-assistant-output aria-live="polite"></pre>
</section>`;
}

function renderAssistantCss(): string {
  return `.doc-assistant { background: color-mix(in srgb, var(--doc-primary) 6%, var(--doc-background)); border: 1px solid color-mix(in srgb, var(--doc-primary) 22%, var(--doc-border)); border-radius: var(--doc-radius); display: grid; gap: 12px; margin-top: 32px; padding: 16px; }
    .doc-assistant h2 { border: 0; font-size: 18px; margin: 0; padding: 0; }
    .doc-assistant p { color: var(--doc-muted-text); margin: 0; }
    .doc-assistant form { display: grid; gap: 10px; }
    .doc-assistant textarea { background: color-mix(in srgb, var(--doc-background) 94%, var(--doc-border)); border: 1px solid var(--doc-border); border-radius: calc(var(--doc-radius) - 2px); color: var(--doc-text); font: inherit; min-height: 82px; padding: 10px 12px; resize: vertical; width: 100%; }
    .doc-assistant button { align-self: start; background: var(--doc-primary); border: 1px solid var(--doc-primary); border-radius: calc(var(--doc-radius) - 2px); color: var(--doc-background); cursor: pointer; font: inherit; font-weight: 800; padding: 9px 12px; }
    .doc-assistant button:disabled { cursor: not-allowed; opacity: 0.68; }
    .doc-assistant-output { background: color-mix(in srgb, var(--doc-background) 92%, var(--doc-border)); border: 1px solid var(--doc-border); border-radius: calc(var(--doc-radius) - 2px); color: var(--doc-muted-text); display: none; margin: 0; min-height: 44px; padding: 10px 12px; white-space: pre-wrap; }
    .doc-assistant-output[data-state] { display: block; }`;
}

function renderAssistantScript(): string {
  return `<script data-documentee-assistant>
  document.querySelectorAll("[data-documentee-assistant]").forEach((root) => {
    const form = root.querySelector("[data-assistant-form]");
    const output = root.querySelector("[data-assistant-output]");
    const button = form?.querySelector("button");
    const endpoint = root.getAttribute("data-assistant-endpoint");
    if (!form || !output || !endpoint) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const query = String(new FormData(form).get("query") || "").trim();
      if (!query) return;

      output.dataset.state = "loading";
      output.textContent = "Asking docs...";
      if (button) button.disabled = true;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            query,
            route: root.getAttribute("data-assistant-route"),
            title: document.title,
            url: window.location.href,
          }),
        });
        const text = await response.text();
        output.dataset.state = response.ok ? "success" : "error";
        output.textContent = text || (response.ok ? "No answer returned." : "Assistant request failed.");
      } catch {
        output.dataset.state = "error";
        output.textContent = "Assistant request failed. Check the configured endpoint and network policy.";
      } finally {
        if (button) button.disabled = false;
      }
    });
  });
</script>`;
}

function renderFeedback(manifest: SiteManifest, route: SiteRoute): string {
  const feedback = manifest.config.feedback;
  if (!feedback?.enabled || !feedback.endpoint || route.kind === "search") return "";

  return `<section class="doc-feedback" data-documentee-feedback data-feedback-endpoint="${escapeHtml(feedback.endpoint)}" data-feedback-route="${escapeHtml(route.route)}" data-feedback-title="${escapeHtml(route.title)}">
  <h2>Was this page helpful?</h2>
  <form data-feedback-form>
    <div class="doc-feedback-actions">
      <button type="submit" name="vote" value="helpful">Helpful</button>
      <button type="submit" name="vote" value="not_helpful">Not helpful</button>
    </div>
    <label>
      <span>Optional comment</span>
      <textarea name="comment" placeholder="What should we improve?" aria-label="Optional feedback comment"></textarea>
    </label>
  </form>
  <p class="doc-feedback-status" data-feedback-status aria-live="polite"></p>
</section>`;
}

function renderFeedbackCss(): string {
  return `.doc-feedback { border-top: 1px solid var(--doc-border); display: grid; gap: 12px; margin-top: 32px; padding-top: 20px; }
    .doc-feedback h2 { border: 0; font-size: 18px; margin: 0; padding: 0; }
    .doc-feedback form { display: grid; gap: 12px; }
    .doc-feedback-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .doc-feedback button { background: color-mix(in srgb, var(--doc-background) 92%, var(--doc-border)); border: 1px solid var(--doc-border); border-radius: calc(var(--doc-radius) - 2px); color: var(--doc-text); cursor: pointer; font: inherit; font-weight: 800; padding: 8px 11px; }
    .doc-feedback button:hover { border-color: color-mix(in srgb, var(--doc-primary) 40%, var(--doc-border)); color: var(--doc-primary); }
    .doc-feedback button:disabled { cursor: not-allowed; opacity: 0.68; }
    .doc-feedback label { color: var(--doc-muted-text); display: grid; font-size: 13px; gap: 6px; }
    .doc-feedback textarea { background: color-mix(in srgb, var(--doc-background) 94%, var(--doc-border)); border: 1px solid var(--doc-border); border-radius: calc(var(--doc-radius) - 2px); color: var(--doc-text); font: inherit; min-height: 72px; padding: 10px 12px; resize: vertical; width: 100%; }
    .doc-feedback-status { color: var(--doc-muted-text); font-size: 13px; margin: 0; min-height: 20px; }`;
}

function renderFeedbackScript(): string {
  return `<script data-documentee-feedback>
  document.querySelectorAll("[data-documentee-feedback]").forEach((root) => {
    const form = root.querySelector("[data-feedback-form]");
    const status = root.querySelector("[data-feedback-status]");
    const endpoint = root.getAttribute("data-feedback-endpoint");
    if (!form || !status || !endpoint) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitter = event.submitter;
      const vote = submitter instanceof HTMLButtonElement ? submitter.value : "";
      if (!vote) return;
      const buttons = form.querySelectorAll("button");
      const comment = String(new FormData(form).get("comment") || "").trim();

      status.textContent = "Sending feedback...";
      buttons.forEach((button) => button.disabled = true);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            route: root.getAttribute("data-feedback-route"),
            title: root.getAttribute("data-feedback-title"),
            vote,
            comment,
          }),
        });
        status.textContent = response.ok ? "Thanks for the feedback." : "Feedback request failed.";
      } catch {
        status.textContent = "Feedback request failed. Check the configured endpoint and network policy.";
      } finally {
        buttons.forEach((button) => button.disabled = false);
      }
    });
  });
</script>`;
}

function renderAnalyticsScript(manifest: SiteManifest): string {
  const analytics = manifest.config.analytics;
  if (analytics?.provider !== "custom" || !analytics.scriptSrc) return "";
  return `<script data-documentee-analytics src="${escapeHtml(analytics.scriptSrc)}" defer></script>`;
}

interface TocHeading {
  id: string;
  level: 2 | 3;
  text: string;
}

const headingEnhancementExcludedClasses = new Set([
  "api-portal-card",
  "doc-card",
  "doc-card-list",
  "doc-card-list-item",
  "doc-page-nav",
  "search-fallback-list",
]);

const htmlVoidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function enhanceContentHeadings(html: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const seen = new Map<string, number>();
  const enhanced = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, levelSource: string, innerHtml: string, offset: number) => {
    if (isHeadingEnhancementExcluded(html, offset)) return _match;
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

interface HeadingEnhancementFrame {
  tagName: string;
  excluded: boolean;
}

function isHeadingEnhancementExcluded(html: string, headingOffset: number): boolean {
  const stack: HeadingEnhancementFrame[] = [];
  const tagPattern = /<\/?([a-zA-Z][\w:-]*)([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) && match.index < headingOffset) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    if (fullTag.startsWith("</")) {
      for (let frameIndex = stack.length - 1; frameIndex >= 0; frameIndex -= 1) {
        if (stack[frameIndex].tagName === tagName) {
          stack.splice(frameIndex);
          break;
        }
      }
      continue;
    }

    if (fullTag.endsWith("/>") || htmlVoidElements.has(tagName)) continue;

    const isExcluded = stack.some((frame) => frame.excluded) || hasHeadingEnhancementExcludedClass(match[2] ?? "");
    stack.push({ tagName, excluded: isExcluded });
  }

  return stack.some((frame) => frame.excluded);
}

function hasHeadingEnhancementExcludedClass(attrs: string): boolean {
  const classMatch = attrs.match(/\sclass=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/);
  if (!classMatch) return false;

  const classNames = (classMatch[1] ?? classMatch[2] ?? classMatch[3] ?? "").split(/\s+/);
  return classNames.some((className) => headingEnhancementExcludedClasses.has(className));
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

function renderPageToc(headings: TocHeading[], className = "", toc: DocumenteeConfig["layout"]["toc"] = "right"): string {
  if (toc === "hidden") return "";
  if (headings.length === 0) return "";
  const links = headings
    .map((heading) => `<a class="toc-level-${heading.level}" href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a>`)
    .join("\n    ");

  const inlineClass = toc === "inline" ? " doc-on-this-page-inline" : "";
  const inlineToc = `<details class="doc-on-this-page${inlineClass}">
  <summary>On this page</summary>
  <nav aria-label="On this page">
    ${links}
  </nav>
</details>`;

  if (toc === "inline") return inlineToc;

  return `${inlineToc}
<nav class="doc-page-toc${className}" aria-label="On this page">
  <span>On this page</span>
  ${links}
</nav>`;
}

interface NavigationEntry {
  route: SiteRoute;
  group?: string;
}

function navigationEntries(manifest: SiteManifest, currentRoute?: SiteRoute): NavigationEntry[] {
  const entries: NavigationEntry[] = [];
  const seen = new Set<string>();
  const currentLocale = currentRoute?.locale;
  const addRoute = (route: SiteRoute | undefined, group?: string) => {
    if (!route || seen.has(route.route) || route.kind === "schema" || route.kind === "search") return;
    if (currentLocale && route.locale && route.locale.code !== currentLocale.code) return;
    if (currentLocale && !route.locale && route.kind === "page") return;
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
      addRoute(localizedRouteFor(manifest, manifest.routes.find((candidate) => candidate.route === route), currentLocale), group.group);
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
  const homeHref = route.locale?.default === false ? route.locale.routePrefix : "/";
  const crumbs: Array<{ label: string; href?: string }> = [{ label: "Home", href: homeHref }];
  const entry = navigationEntries(manifest, route).find((item) => item.route.route === route.route);
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
  const entries = navigationEntries(manifest, route);
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

function renderFooter(manifest: SiteManifest, route: SiteRoute, pageNav: string): string {
  const editUrl = manifest.config.layout.editUrl;
  const editHref = editUrl && route.sourceProjectPath ? appendEditPath(editUrl, route.sourceProjectPath) : "";
  const editLink = editHref
    ? `<a class="doc-edit-link" href="${escapeHtml(editHref)}">Edit this page</a>`
    : "";
  const lastUpdated = route.lastUpdated ? `<span>Last updated: ${escapeHtml(formatLastUpdated(route.lastUpdated))}</span>` : "";
  const meta = [editLink, lastUpdated].filter(Boolean).join("\n    ");
  const metaBlock = meta ? `<div class="doc-footer-meta">
    ${meta}
  </div>` : "";

  return `<footer class="doc-footer">
  ${pageNav}
  ${metaBlock}
</footer>`;
}

function appendEditPath(editUrl: string, sourceRelativePath: string): string {
  const base = editUrl.replace(/\/+$/g, "");
  const encodedPath = sourceRelativePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return encodedPath ? `${base}/${encodedPath}` : base;
}

function formatLastUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function renderAnnouncement(announcement: string | undefined): string {
  if (!announcement) return "";
  return `<div class="doc-announcement">${escapeHtml(announcement)}</div>`;
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

function renderMobileHeader(manifest: SiteManifest, versions: string, localeSwitcher: string, nav: string): string {
  return `<header class="doc-mobile-header">
  <a class="doc-mobile-brand" href="/">${escapeHtml(manifest.config.site.name)}</a>
  <div class="doc-mobile-actions">
    ${renderSearchLink(manifest)}
    <details class="doc-mobile-menu" aria-label="Mobile navigation">
      <summary>Menu</summary>
      <nav class="doc-mobile-nav" aria-label="Mobile navigation">
        ${versions}
        ${localeSwitcher}
        ${nav}
      </nav>
    </details>
  </div>
</header>`;
}

type ThemeConfig = DocumenteeConfig["theme"];
type ThemePresetTokens = Partial<Omit<ThemeConfig, "preset" | "customCss" | "darkMode">>;
type ThemePreset = ThemePresetTokens & {
  dark?: ThemePresetTokens;
};

const themePresets: Record<NonNullable<ThemeConfig["preset"]>, ThemePreset> = {
  neutral: {
    primaryColor: "#18181b",
    accentColor: "#52525b",
    backgroundColor: "#ffffff",
    textColor: "#18181b",
    mutedTextColor: "#71717a",
    borderColor: "#d4d4d8",
    codeBackgroundColor: "#f4f4f5",
    dark: {
      backgroundColor: "#111113",
      textColor: "#f4f4f5",
      mutedTextColor: "#a1a1aa",
      borderColor: "#3f3f46",
      codeBackgroundColor: "#18181b",
    },
  },
  mint: {
    primaryColor: "#0f766e",
    accentColor: "#14b8a6",
    backgroundColor: "#f8fffc",
    textColor: "#10201c",
    mutedTextColor: "#4b635d",
    borderColor: "#b7d8ce",
    codeBackgroundColor: "#ecfdf5",
    dark: {
      primaryColor: "#5eead4",
      accentColor: "#2dd4bf",
      backgroundColor: "#061f1a",
      textColor: "#eafff8",
      mutedTextColor: "#9fd6ca",
      borderColor: "#1f4d43",
      codeBackgroundColor: "#082f29",
    },
  },
  slate: {
    primaryColor: "#334155",
    accentColor: "#2563eb",
    backgroundColor: "#f8fafc",
    textColor: "#0f172a",
    mutedTextColor: "#64748b",
    borderColor: "#cbd5e1",
    codeBackgroundColor: "#f1f5f9",
    dark: {
      primaryColor: "#93c5fd",
      accentColor: "#38bdf8",
      backgroundColor: "#0f172a",
      textColor: "#f8fafc",
      mutedTextColor: "#cbd5e1",
      borderColor: "#334155",
      codeBackgroundColor: "#111827",
    },
  },
  highContrast: {
    primaryColor: "#000000",
    accentColor: "#1d4ed8",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    mutedTextColor: "#1f2937",
    borderColor: "#000000",
    codeBackgroundColor: "#f3f4f6",
    dark: {
      primaryColor: "#ffffff",
      accentColor: "#facc15",
      backgroundColor: "#000000",
      textColor: "#ffffff",
      mutedTextColor: "#f5f5f5",
      borderColor: "#ffffff",
      codeBackgroundColor: "#111111",
    },
  },
  classic: {
    primaryColor: "#7f1d1d",
    accentColor: "#1f4f46",
    backgroundColor: "#fffdfa",
    textColor: "#251714",
    mutedTextColor: "#6b5b55",
    borderColor: "#d8c7b8",
    codeBackgroundColor: "#f6f0e8",
    fontFamily: "Georgia, ui-serif, serif",
    dark: {
      primaryColor: "#fca5a5",
      accentColor: "#7dd3c7",
      backgroundColor: "#211916",
      textColor: "#fff7ed",
      mutedTextColor: "#d8c7b8",
      borderColor: "#6b5046",
      codeBackgroundColor: "#2b211d",
    },
  },
  terminal: {
    primaryColor: "#047857",
    accentColor: "#ca8a04",
    backgroundColor: "#fbfdf8",
    textColor: "#101510",
    mutedTextColor: "#4b604f",
    borderColor: "#b9d8bf",
    codeBackgroundColor: "#eef8ee",
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    dark: {
      primaryColor: "#34d399",
      accentColor: "#fbbf24",
      backgroundColor: "#050806",
      textColor: "#d1fae5",
      mutedTextColor: "#86efac",
      borderColor: "#14532d",
      codeBackgroundColor: "#07120b",
    },
  },
  startup: {
    primaryColor: "#e11d48",
    accentColor: "#2563eb",
    backgroundColor: "#fff8f7",
    textColor: "#27121a",
    mutedTextColor: "#75505e",
    borderColor: "#f5c4ce",
    codeBackgroundColor: "#fff1f2",
    dark: {
      primaryColor: "#fb7185",
      accentColor: "#93c5fd",
      backgroundColor: "#1f1020",
      textColor: "#fff1f5",
      mutedTextColor: "#f0a9bd",
      borderColor: "#5b2744",
      codeBackgroundColor: "#2a1429",
    },
  },
  enterprise: {
    primaryColor: "#1d4ed8",
    accentColor: "#0f766e",
    backgroundColor: "#f7fbff",
    textColor: "#0c1a2e",
    mutedTextColor: "#4b647f",
    borderColor: "#bfd3ea",
    codeBackgroundColor: "#edf4ff",
    dark: {
      primaryColor: "#60a5fa",
      accentColor: "#5eead4",
      backgroundColor: "#081424",
      textColor: "#eff6ff",
      mutedTextColor: "#b7cbe2",
      borderColor: "#29415f",
      codeBackgroundColor: "#0c1b2e",
    },
  },
  api: {
    primaryColor: "#0e7490",
    accentColor: "#7c3aed",
    backgroundColor: "#f7fdff",
    textColor: "#0b1b22",
    mutedTextColor: "#4b626b",
    borderColor: "#b8dbe5",
    codeBackgroundColor: "#ecfeff",
    dark: {
      primaryColor: "#67e8f9",
      accentColor: "#c4b5fd",
      backgroundColor: "#061923",
      textColor: "#ecfeff",
      mutedTextColor: "#a5d8e6",
      borderColor: "#164e63",
      codeBackgroundColor: "#082532",
    },
  },
  minimal: {
    primaryColor: "#111827",
    accentColor: "#6b7280",
    backgroundColor: "#ffffff",
    textColor: "#111827",
    mutedTextColor: "#6b7280",
    borderColor: "#e5e7eb",
    codeBackgroundColor: "#f9fafb",
    radius: "4px",
    dark: {
      primaryColor: "#fafafa",
      accentColor: "#a3a3a3",
      backgroundColor: "#0a0a0a",
      textColor: "#fafafa",
      mutedTextColor: "#a3a3a3",
      borderColor: "#2a2a2a",
      codeBackgroundColor: "#141414",
    },
  },
};

function themeValues(theme: ThemeConfig, preset: ThemePreset, mode: "light" | "dark"): Record<string, string> {
  const modePreset: ThemePresetTokens = mode === "dark" ? { ...preset, ...preset.dark } : preset;
  const primary = theme.primaryColor ?? modePreset.primaryColor ?? "#18181b";
  const accent = theme.accentColor ?? modePreset.accentColor ?? primary;

  return {
    "--doc-primary": primary,
    "--doc-accent": accent,
    "--doc-background": theme.backgroundColor ?? modePreset.backgroundColor ?? (mode === "dark" ? "#0b1020" : "Canvas"),
    "--doc-text": theme.textColor ?? modePreset.textColor ?? (mode === "dark" ? "#f8fafc" : "CanvasText"),
    "--doc-muted-text": theme.mutedTextColor ?? modePreset.mutedTextColor ?? (mode === "dark" ? "#a8b3c7" : "#52525b"),
    "--doc-border": theme.borderColor ?? modePreset.borderColor ?? (mode === "dark" ? "#263244" : "#d4d4d8"),
    "--doc-code-background": theme.codeBackgroundColor ?? modePreset.codeBackgroundColor ?? (mode === "dark" ? "#111827" : "transparent"),
    "--doc-font-family": theme.fontFamily ?? modePreset.fontFamily ?? "Inter, ui-sans-serif, system-ui, sans-serif",
    "--doc-code-font-family": theme.codeFontFamily ?? modePreset.codeFontFamily ?? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    "--doc-radius": theme.radius ?? modePreset.radius ?? "8px",
    "--doc-nav-width": theme.navWidth ?? modePreset.navWidth ?? "280px",
    "--doc-success": mode === "dark" ? "#4ade80" : "#16a34a",
    "--doc-success-text": mode === "dark" ? "#86efac" : "#166534",
    "--doc-warning": mode === "dark" ? "#fbbf24" : "#d97706",
    "--doc-warning-text": mode === "dark" ? "#fde68a" : "#92400e",
    "--doc-danger": mode === "dark" ? "#f87171" : "#dc2626",
    "--doc-danger-text": mode === "dark" ? "#fecaca" : "#991b1b",
    "--doc-info": mode === "dark" ? "#60a5fa" : "#2563eb",
    "--doc-info-text": mode === "dark" ? "#bfdbfe" : "#1d4ed8",
  };
}

function renderNavigation(manifest: SiteManifest, currentRoute: SiteRoute): string {
  if (manifest.config.navigation.length === 0) {
    return navigationEntries(manifest, currentRoute)
      .map((item) => renderNavLink(item.route, currentRoute))
      .join("\n");
  }

  return manifest.config.navigation
    .map((group) => {
      const pageLinks = group.pages
        .map((pageRef) => routeFromPageRef(pageRef, manifest.config.content.directory))
        .map((route) => localizedRouteFor(manifest, manifest.routes.find((candidate) => candidate.route === route), currentRoute.locale))
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
  return `<a class="doc-search-link" href="/search/" data-search-open aria-haspopup="dialog" aria-controls="documentee-search-dialog"><span class="doc-search-label">Search docs</span><span class="doc-search-shortcut" data-search-shortcut-hint><kbd>Ctrl</kbd><kbd>K</kbd></span></a>`;
}

function renderVersionSwitcher(manifest: SiteManifest): string {
  const versions = manifest.versions ?? [];
  if (versions.length === 0) return "";

  return `<section class="version-switcher">
  <span>Versions</span>
  ${versions.map((version) => `<a href="${hrefForRoute(version.routePrefix)}"><span class="version-link-label">${escapeHtml(version.label)}</span>${renderVersionBadges(version)}</a>`).join("\n  ")}
</section>`;
}

function renderVersionBadges(version: VersionReference): string {
  const badges = [
    version.latest ? `<span class="version-badge version-badge-latest">Latest</span>` : "",
    version.deprecated ? `<span class="version-badge version-badge-deprecated">Deprecated</span>` : "",
  ].filter(Boolean);

  return badges.length > 0 ? `<span class="version-badges">${badges.join("")}</span>` : "";
}

function renderLocaleSwitcher(manifest: SiteManifest, currentRoute: SiteRoute): string {
  const locales = manifest.locales ?? [];
  if (locales.length === 0) return "";

  return `<section class="locale-switcher" aria-label="Language">
  <span>Language</span>
  <div class="locale-switcher-links">
    ${locales.map((locale) => {
      const route = localizedRouteFor(manifest, currentRoute, locale) ?? currentRoute;
      const active = currentRoute.locale?.code === locale.code ? ' class="is-active"' : "";
      return `<a${active} href="${hrefForRoute(route.route)}">${escapeHtml(locale.label)}</a>`;
    }).join("\n    ")}
  </div>
</section>`;
}

function localizedRouteFor(
  manifest: SiteManifest,
  route: SiteRoute | undefined,
  locale: SiteRoute["locale"] | undefined,
): SiteRoute | undefined {
  if (!route || !locale) return route;

  if (route.kind === "page" && route.sourceRelativePath) {
    return manifest.routes.find((candidate) =>
      candidate.kind === "page" &&
      candidate.locale?.code === locale.code &&
      candidate.sourceRelativePath === route.sourceRelativePath
    ) ?? route;
  }

  return route;
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
  const codeSamples = renderApiCodeSamples(operation);
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

function renderApiCodeSamples(operation: NonNullable<SiteRoute["operation"]>): string {
  const samples = [
    ...generatedCodeSamples(operation),
    ...operation.codeSamples.map((sample) => ({ lang: sample.lang, source: sample.source })),
  ];
  if (samples.length === 0) return "";

  return `<section class="api-section">
  ${renderApiSectionHeading("Code Samples", `${samples.length} ${samples.length === 1 ? "sample" : "samples"}`)}
  ${samples.map((sample) => `<details class="api-code-sample" open><summary>${escapeHtml(sample.lang)}</summary><pre><code>${escapeHtml(sample.source)}</code></pre></details>`).join("")}
</section>`;
}

function generatedCodeSamples(operation: NonNullable<SiteRoute["operation"]>): Array<{ lang: string; source: string }> {
  const url = operationUrl(operation);
  const body = requestBodyExample(operation.requestBody);
  const hasBody = Boolean(body);
  const contentType = operation.requestBody?.mediaTypes[0] ?? "application/json";
  const authHeader = operation.auth.length > 0 ? "Authorization: Bearer YOUR_TOKEN" : undefined;
  const method = operation.method.toUpperCase();
  const headerLines = [
    authHeader ? `  -H "${authHeader}" \\` : "",
    hasBody ? `  -H "Content-Type: ${contentType}" \\` : "",
  ].filter(Boolean);

  const curl = [
    `curl -X ${method} "${url}"${headerLines.length > 0 || body ? " \\" : ""}`,
    ...headerLines,
    body ? `  -d '${body}'` : "",
  ].filter(Boolean).join("\n");

  const jsHeaders = [
    authHeader ? `    "Authorization": "Bearer YOUR_TOKEN"` : "",
    hasBody ? `    "Content-Type": "${contentType}"` : "",
  ].filter(Boolean);
  const jsOptions = [
    `  method: "${method}"`,
    jsHeaders.length > 0 ? `  headers: {\n${jsHeaders.join(",\n")}\n  }` : "",
    body ? `  body: JSON.stringify(${body})` : "",
  ].filter(Boolean).join(",\n");
  const javascript = `await fetch("${url}", {\n${jsOptions}\n});`;

  const pythonMethod = method.toLowerCase();
  const pythonHeaders = [
    authHeader ? `    "Authorization": "Bearer YOUR_TOKEN"` : "",
    hasBody ? `    "Content-Type": "${contentType}"` : "",
  ].filter(Boolean);
  const python = [
    "import requests",
    pythonHeaders.length > 0 ? `headers = {\n${pythonHeaders.join(",\n")}\n}` : "",
    body ? `payload = ${body}` : "",
    `response = requests.${pythonMethod}("${url}"${pythonHeaders.length > 0 ? ", headers=headers" : ""}${body ? ", json=payload" : ""})`,
  ].filter(Boolean).join("\n");

  const goBody = body ? `body := bytes.NewBufferString(\`${body}\`)\nreq, err := http.NewRequest("${method}", "${url}", body)` : `req, err := http.NewRequest("${method}", "${url}", nil)`;
  const goHeaders = [
    authHeader ? `req.Header.Set("Authorization", "Bearer YOUR_TOKEN")` : "",
    hasBody ? `req.Header.Set("Content-Type", "${contentType}")` : "",
  ].filter(Boolean);
  const go = [
    body ? "import (\n  \"bytes\"\n  \"net/http\"\n)" : "import \"net/http\"",
    goBody,
    "if err != nil {\n  panic(err)\n}",
    ...goHeaders,
    "response, err := http.DefaultClient.Do(req)",
  ].join("\n");

  return [
    { lang: "cURL", source: curl },
    { lang: "JavaScript", source: javascript },
    { lang: "Python", source: python },
    { lang: "Go", source: go },
  ];
}

function operationUrl(operation: NonNullable<SiteRoute["operation"]>): string {
  const baseUrl = (operation.serverUrl ?? operation.playground?.baseUrl ?? "https://api.example.com").replace(/\/+$/, "");
  const path = operation.path.startsWith("/") ? operation.path : `/${operation.path}`;
  const query = operation.parameters
    .filter((parameter) => parameter.location === "query")
    .map((parameter) => `${encodeURIComponent(parameter.name)}={${parameter.name}}`)
    .join("&");
  return `${baseUrl}${path}${query ? `?${query}` : ""}`;
}

function requestBodyExample(requestBody: NonNullable<SiteRoute["operation"]>["requestBody"]): string | undefined {
  if (!requestBody) return undefined;
  if (requestBody.examples?.[0]?.value) return requestBody.examples[0].value;
  const fields = requestBody.fields ?? [];
  if (fields.length === 0) return "{}";
  const value = Object.fromEntries(fields.slice(0, 8).map((field) => [field.name, sampleValueForField(field)]));
  return JSON.stringify(value, null, 2);
}

function sampleValueForField(field: RenderableSchema): unknown {
  if (field.exampleValue !== undefined) return field.exampleValue;
  if (field.defaultValue !== undefined) return parseSampleScalar(field.defaultValue, field.schemaType);
  if (field.enumValues?.[0] !== undefined) return parseSampleScalar(field.enumValues[0], field.schemaType);
  if (field.schemaType === "boolean") return true;
  if (field.schemaType === "integer" || field.schemaType === "number") return 0;
  if (field.schemaType === "array") return [];
  if (field.schemaType === "object" || field.fields) {
    return Object.fromEntries((field.fields ?? []).slice(0, 6).map((child) => [child.name ?? "field", sampleValueForField(child)]));
  }
  return "string";
}

function parseSampleScalar(value: string, schemaType: string | undefined): string | number | boolean {
  if (schemaType === "boolean") return value === "true";
  if (schemaType === "integer" || schemaType === "number") return Number(value);
  return value;
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
  const examples = renderApiExamples(requestBody.examples);

  return `<section class="api-section">
  ${renderApiSectionHeading("Request Body", `${mediaTypes.length} ${mediaTypes.length === 1 ? "media type" : "media types"}`)}
  <div class="api-request-card api-panel-card">
    <div class="api-chip-row"><span class="${requestBody.required ? "api-required" : "api-optional"}">${requestBody.required ? "required" : "optional"}</span>${mediaTypes.map((mediaType) => `<span class="api-chip">${escapeHtml(mediaType)}</span>`).join("")}</div>
    ${renderSchemaRefs(operation.specId, requestBody.schemaRefs)}
    ${fields.length > 0 ? `<section class="api-param-group">
      <h3>${escapeHtml(fieldTitle)}</h3>
      ${renderSchemaFields(operation.specId, fields)}
    </section>` : ""}
    ${examples}
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
      ${response.fields && response.fields.length > 0 ? renderSchemaFields(operation.specId, response.fields) : ""}
      ${renderApiExamples(response.examples)}
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
  nullable?: boolean;
  deprecated?: boolean;
  defaultValue?: string;
  exampleValue?: string;
}, specId?: string): string {
  const displayType = schemaDisplayType(value);
  const chips = [
    value.schemaRef
      ? specId
        ? `<a class="api-chip" href="${hrefForRoute(joinSchemaRoute(specId, value.schemaRef))}">${escapeHtml(value.schemaRef)}</a>`
        : `<span class="api-chip">${escapeHtml(value.schemaRef)}</span>`
      : "",
    displayType ? `<span class="api-chip">${escapeHtml(displayType)}</span>` : "",
    ...(value.enumValues ?? []).map((item) => `<span class="api-chip">${escapeHtml(item)}</span>`),
    value.defaultValue ? `<span class="api-chip">default: ${escapeHtml(value.defaultValue)}</span>` : "",
    value.exampleValue ? `<span class="api-chip">example: ${escapeHtml(value.exampleValue)}</span>` : "",
    value.nullable ? `<span class="api-chip">nullable</span>` : "",
    value.deprecated ? `<span class="api-chip">deprecated</span>` : "",
  ].filter(Boolean);
  return chips.length > 0 ? `<div class="api-chip-row">${chips.join("")}</div>` : "";
}

type RenderableSchema = {
  name?: string;
  required?: boolean;
  description?: string;
  schemaRef?: string;
  schemaType?: string;
  schemaFormat?: string;
  enumValues?: string[];
  nullable?: boolean;
  deprecated?: boolean;
  defaultValue?: string;
  exampleValue?: string;
  fields?: RenderableSchema[];
  items?: RenderableSchema;
  oneOf?: RenderableSchema[];
  anyOf?: RenderableSchema[];
  allOf?: RenderableSchema[];
};

function renderSchemaFields(specId: string, fields: RenderableSchema[]): string {
  if (fields.length === 0) return "";
  return `<div class="api-schema-tree">${fields.map((field) => renderSchemaField(specId, field)).join("")}</div>`;
}

function renderSchemaField(specId: string, field: RenderableSchema): string {
  const title = field.name ? `<code>${escapeHtml(field.name)}</code>` : `<span>${escapeHtml(field.schemaRef ?? field.schemaType ?? "schema")}</span>`;
  const required = typeof field.required === "boolean"
    ? `<span class="${field.required ? "api-required" : "api-optional"}">${field.required ? "required" : "optional"}</span>`
    : "";
  const body = [
    field.description ? `<p class="api-schema-description">${escapeHtml(field.description)}</p>` : "",
    renderSchemaMetadata(field, specId),
    field.fields && field.fields.length > 0 ? renderSchemaFields(specId, field.fields) : "",
    field.items ? renderSchemaGroup(specId, "Array items", [field.items]) : "",
    renderSchemaGroup(specId, "One of", field.oneOf),
    renderSchemaGroup(specId, "Any of", field.anyOf),
    renderSchemaGroup(specId, "All of", field.allOf),
  ].filter(Boolean).join("");

  return `<details class="api-schema-field" open>
  <summary><span class="api-schema-title">${title}${required}</span></summary>
  ${body ? `<div class="api-schema-body">${body}</div>` : ""}
</details>`;
}

function renderSchemaGroup(specId: string, label: string, items: RenderableSchema[] | undefined): string {
  if (!items || items.length === 0) return "";
  return `<section class="api-schema-composition">
  <h4>${escapeHtml(label)}</h4>
  ${items.map((item, index) => renderSchemaField(specId, { ...item, name: item.name ?? item.schemaRef ?? `${label} ${index + 1}` })).join("")}
</section>`;
}

function renderApiExamples(examples: NonNullable<NonNullable<SiteRoute["operation"]>["requestBody"]>["examples"]): string {
  if (!examples || examples.length === 0) return "";
  return `<section class="api-examples">
  <h3>Examples</h3>
  ${examples.map((example) => {
    const label = example.summary ?? example.name ?? "Example";
    const description = example.description ? `<p class="api-example-description">${escapeHtml(example.description)}</p>` : "";
    return `<figure class="api-example"><figcaption>${escapeHtml(label)}</figcaption>${description}<pre><code>${escapeHtml(example.value)}</code></pre></figure>`;
  }).join("")}
</section>`;
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
  const items = searchIndexItems(manifest);
  const groups = searchGroups(items);
  const apiCount = items.filter((item) => item.category === "API endpoints").length;
  const guideCount = items.filter((item) => item.category === "Guides").length;

  return `<article id="search" class="search-panel">
  <header class="search-hero">
    <h1>Search</h1>
    <p>Find guides, API endpoints, and reference pages across ${escapeHtml(manifest.config.site.name)}.</p>
    <div class="search-stat-grid" aria-label="Search index summary">
      ${renderSearchStat(items.length, "searchable page")}
      ${renderSearchStat(apiCount, "API endpoint")}
      ${renderSearchStat(guideCount, "guide")}
    </div>
  </header>
  ${manifest.config.search.provider === "pagefind" ? `<section class="search-section"><h2>Full-text search</h2><div id="pagefind-search" class="search-pagefind" data-pagefind-ui></div></section>` : ""}
  <noscript><p>JavaScript is disabled. Use the static index below to browse available pages.</p></noscript>
  <div class="search-section-grid">
    ${groups.map((group) => renderSearchSection(group.label, group.items)).join("\n    ")}
  </div>
</article>`;
}

function renderSearchModal(manifest: SiteManifest): string {
  if (manifest.config.search.provider !== "pagefind") return "";
  const groups = searchGroups(searchSuggestionItems(manifest));
  if (groups.length === 0) return "";

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
      <div class="search-shortcut-hint"><span>Click search or press</span><span><kbd>Ctrl</kbd><kbd>K</kbd></span></div>
      <div class="search-suggestion-groups">
        ${groups.map((group) => `<section class="search-suggestion-group" data-search-group>
          <h3>${escapeHtml(group.label)}</h3>
          <ul class="search-suggestion-list">
            ${group.items.map((item) => renderSearchSuggestionItem(item)).join("\n            ")}
          </ul>
        </section>`).join("\n        ")}
      </div>
      <p class="search-empty" data-search-empty>No matching suggestions. Open full search for Pagefind results.</p>
    </div>
  </div>
</dialog>`;
}

type SearchCategory = "Guides" | "API endpoints" | "Pages";

interface SearchItem {
  title: string;
  meta: string;
  route: string;
  category: SearchCategory;
  priority: number;
  index: number;
}

function searchIndexItems(manifest: SiteManifest): SearchItem[] {
  return manifest.routes
    .map((route, index) => {
      if (route.route === "/search" || route.kind === "search" || route.kind === "schema" || route.title.trim().length === 0) {
        return undefined;
      }
      const operation = route.operation;
      const title = operation?.summary || route.title;
      const meta = operation ? `${operation.method} ${operation.path}` : route.description || route.route;
      const category = searchCategory(route);
      const searchText = `${title} ${meta} ${route.route}`.toLowerCase();
      const priority = searchText.includes("search") ? 0 : category === "Guides" ? 1 : category === "API endpoints" ? 2 : 3;
      return { title, meta, route: route.route, category, priority, index };
    })
    .filter((item): item is SearchItem => Boolean(item));
}

function searchSuggestionItems(manifest: SiteManifest): SearchItem[] {
  return searchIndexItems(manifest)
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .slice(0, 50);
}

function searchCategory(route: SiteRoute): SearchCategory {
  if (route.kind === "api-operation" || route.operation) return "API endpoints";
  const routeText = `${route.route} ${route.title}`.toLowerCase();
  if (routeText.includes("guide") || routeText.includes("quickstart") || routeText.includes("get-started")) return "Guides";
  return "Pages";
}

function searchGroups(items: SearchItem[]): Array<{ label: SearchCategory; items: SearchItem[] }> {
  const order: SearchCategory[] = ["Guides", "API endpoints", "Pages"];
  return order
    .map((label) => ({ label, items: items.filter((item) => item.category === label) }))
    .filter((group) => group.items.length > 0);
}

function renderSearchStat(count: number, label: string): string {
  const text = `${count} ${label}${count === 1 ? "" : "s"}`;
  return `<div class="search-stat" aria-label="${escapeHtml(text)}"><strong>${count}</strong><span>${escapeHtml(`${label}${count === 1 ? "" : "s"}`)}</span></div>`;
}

function renderSearchSection(label: SearchCategory, items: SearchItem[]): string {
  return `<section class="search-section">
    <h2>${escapeHtml(label)}</h2>
    <ul class="search-fallback-list">
      ${items.map((item) => `<li>${renderSearchResultLink(item)}</li>`).join("\n      ")}
    </ul>
  </section>`;
}

function renderSearchResultLink(item: SearchItem): string {
  return `<a href="${hrefForRoute(item.route)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)}</span></a>`;
}

function renderSearchSuggestionItem(item: SearchItem): string {
  return `<li data-search-item data-search-text="${escapeHtml(`${item.title} ${item.meta} ${item.category}`.toLowerCase())}">${renderSearchResultLink(item)}</li>`;
}

function renderSearchModalScript(manifest: SiteManifest): string {
  if (manifest.config.search.provider !== "pagefind") return "";
  return `<script data-documentee-search-modal>
  (() => {
    const dialog = document.getElementById("documentee-search-dialog");
    if (!dialog) return;
    const input = dialog.querySelector("[data-search-input]");
    const items = Array.from(dialog.querySelectorAll("[data-search-item]"));
    const groups = Array.from(dialog.querySelectorAll("[data-search-group]"));
    const empty = dialog.querySelector("[data-search-empty]");
    const filter = () => {
      const query = (input?.value || "").trim().toLowerCase();
      let visible = 0;
      for (const item of items) {
        const matches = !query || (item.getAttribute("data-search-text") || "").includes(query);
        item.hidden = !matches;
        if (matches) visible += 1;
      }
      for (const group of groups) {
        const groupItems = Array.from(group.querySelectorAll("[data-search-item]"));
        group.hidden = groupItems.length > 0 && groupItems.every((item) => item.hidden);
      }
      if (empty) empty.style.display = visible === 0 ? "block" : "none";
    };
    const openSearch = (event) => {
        if (typeof dialog.showModal !== "function") return;
        event?.preventDefault();
        dialog.showModal();
        filter();
        setTimeout(() => input?.focus(), 0);
    };
    document.querySelectorAll("[data-search-open]").forEach((trigger) => {
      trigger.addEventListener("click", openSearch);
    });
    document.addEventListener("keydown", (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      openSearch(event);
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
  const environments = renderPlaygroundEnvironments(operation);

  return `<section class="api-playground">
  <h2>Try It</h2>
  <form data-documentee-playground data-method="${escapeHtml(operation.method)}" data-path="${escapeHtml(operation.path)}" data-auth="${escapeHtml(playground.auth)}" data-api-key-name="${escapeHtml(playground.apiKeyName ?? "")}" data-api-key-location="${escapeHtml(playground.apiKeyLocation)}">
    ${environments}
    <label>Base URL
      <input name="baseUrl" type="url" value="${escapeHtml(playground.baseUrl ?? "")}" required>
    </label>
    <p><span class="method">${escapeHtml(operation.method)}</span> <span class="path">${escapeHtml(operation.path)}</span></p>
    <div class="api-playground-grid">
      <div>
        ${pathParams}
        ${queryParams}
        ${headerParams}
        ${auth}
        ${body}
      </div>
      <section class="api-playground-preview">
        <h3>Request Preview</h3>
        <pre data-playground-preview aria-live="polite">Request preview updates as you edit.</pre>
      </section>
    </div>
    <p class="api-playground-note">Browser requests depend on this API's CORS policy. Secrets are only kept in this form and are not stored by Documentee.</p>
    <button type="submit" data-playground-submit>Send Request</button>
    <section class="api-playground-output">
      <h3>Response Status</h3>
      <pre data-playground-result aria-live="polite">Response status will appear here.</pre>
      <div class="api-playground-response-grid">
        <section>
          <h3>Response Headers</h3>
          <pre data-playground-response-headers>Response headers will appear here.</pre>
        </section>
        <section>
          <h3>Response Body</h3>
          <pre data-playground-response-body>Response body will appear here.</pre>
        </section>
      </div>
    </section>
  </form>
</section>`;
}

function renderPlaygroundEnvironments(operation: NonNullable<SiteRoute["operation"]>): string {
  const playground = operation.playground;
  if (!playground) return "";
  const options = [
    ...(playground.environments ?? []).map((environment) => ({
      label: environment.name,
      baseUrl: environment.baseUrl,
    })),
    ...(operation.serverUrls ?? []).map((server) => ({
      label: server.description ?? server.url,
      baseUrl: server.url,
    })),
  ];
  const unique = new Map<string, { label: string; baseUrl: string }>();
  for (const option of options) {
    if (!unique.has(option.baseUrl)) unique.set(option.baseUrl, option);
  }
  if (unique.size === 0) return "";

  return `<label>Environment
    <select name="environment" data-playground-environment>
      ${[...unique.values()].map((option) => `<option value="${escapeHtml(option.baseUrl)}" data-base-url="${escapeHtml(option.baseUrl)}"${option.baseUrl === playground.baseUrl ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
    </select>
  </label>`;
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
  const schemaSummary = renderSchemaMetadata(route.schema, route.schema.specId);
  const schemaFields = route.schema.fields && route.schema.fields.length > 0
    ? `<section class="api-section">${renderApiSectionHeading("Schema Fields", `${route.schema.fields.length} ${route.schema.fields.length === 1 ? "field" : "fields"}`)}${renderSchemaFields(route.schema.specId, route.schema.fields)}</section>`
    : "";
  const schemaComposition = [
    renderSchemaGroup(route.schema.specId, "One of", route.schema.oneOf),
    renderSchemaGroup(route.schema.specId, "Any of", route.schema.anyOf),
    renderSchemaGroup(route.schema.specId, "All of", route.schema.allOf),
  ].filter(Boolean).join("");
  return `<article>
  <h1>${escapeHtml(route.title)}</h1>
  <p>${escapeHtml(route.description)}</p>
  <p>Spec: ${escapeHtml(route.schema.specId)}</p>
  ${schemaSummary}
  ${schemaFields}
  ${schemaComposition}
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
