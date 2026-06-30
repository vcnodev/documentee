import type { SiteManifest } from "./manifest.js";

export function validateManifest(manifest: SiteManifest): string[] {
  return [
    ...validateDuplicateRoutes(manifest),
    ...validateNavigationTargets(manifest),
    ...validateInternalLinks(manifest),
    ...validateRedirects(manifest),
  ];
}

function validateDuplicateRoutes(manifest: SiteManifest): string[] {
  const counts = new Map<string, number>();
  for (const route of manifest.routes) {
    counts.set(route.route, (counts.get(route.route) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([route]) => `Duplicate route: ${route}`);
}

function validateNavigationTargets(manifest: SiteManifest): string[] {
  const routeSet = new Set(manifest.routes.map((route) => route.route));
  const diagnostics: string[] = [];

  for (const group of manifest.config.navigation) {
    for (const pageRef of group.pages) {
      const route = routeFromPageRef(pageRef, manifest.config.content.directory);
      if (!routeSet.has(route)) {
        diagnostics.push(`Navigation page target does not exist: ${pageRef}`);
      }
    }
  }

  return diagnostics;
}

function validateInternalLinks(manifest: SiteManifest): string[] {
  const routeSet = new Set(manifest.routes.map((route) => route.route));
  const diagnostics: string[] = [];

  for (const route of manifest.routes) {
    for (const link of internalLinks(route.markdown)) {
      const normalized = normalizeInternalLink(link);
      if (!routeSet.has(normalized)) {
        diagnostics.push(`Broken internal link on ${route.route}: ${link}`);
      }
    }
  }

  return diagnostics;
}

function validateRedirects(manifest: SiteManifest): string[] {
  const routeSet = new Set(manifest.routes.map((route) => route.route));
  return (manifest.config.redirects ?? [])
    .map((redirect) => normalizeInternalLink(redirect.from))
    .filter((from) => routeSet.has(from))
    .map((from) => `Redirect source conflicts with generated route: ${from}`);
}

function internalLinks(markdown: string): string[] {
  const links: string[] = [];
  const pattern = /\[[^\]]+\]\((\/[^)#?]+)(?:[#?][^)]+)?\)/g;
  for (const match of markdown.matchAll(pattern)) {
    if (match[1]) links.push(match[1]);
  }
  return links;
}

function normalizeInternalLink(link: string): string {
  const stripped = link.replace(/\/+$/g, "");
  return stripped.length === 0 ? "/" : stripped;
}

function routeFromPageRef(pageRef: string, contentDirectory: string): string {
  let value = pageRef.replace(/\.(mdx|md)$/i, "");
  const contentPrefix = `${contentDirectory.replace(/^\/+|\/+$/g, "")}/`;
  if (value.startsWith(contentPrefix)) value = value.slice(contentPrefix.length);
  if (value === "index") return "/";
  if (value.endsWith("/index")) value = value.slice(0, -"index".length).replace(/\/$/g, "");
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}
