import { escapeHtml } from "./html.js";
import type { DocumenteeConfig } from "./config.js";
import type { SiteManifest, SiteRoute } from "./manifest.js";

const DEFAULT_SEO: DocumenteeConfig["seo"] = {
  sitemap: true,
  robots: {
    enabled: true,
    rules: [{ userAgent: "*", allow: "/" }],
  },
  twitterCard: "summary_large_image",
};

export function getSeoConfig(config: DocumenteeConfig): DocumenteeConfig["seo"] {
  return config.seo ?? DEFAULT_SEO;
}

export function getRedirects(config: DocumenteeConfig): DocumenteeConfig["redirects"] {
  return config.redirects ?? [];
}

export function renderSeoHead(manifest: SiteManifest, route: SiteRoute): string {
  const seoConfig = getSeoConfig(manifest.config);
  const title = renderTitle(manifest, route.title);
  const description = route.description || manifest.config.site.description;
  const canonical = route.seo?.canonical ?? absoluteUrl(manifest.config.site.url, route.route);
  const socialTitle = route.seo?.socialTitle ?? route.title;
  const socialDescription = route.seo?.socialDescription ?? description;
  const image = route.seo?.image ?? seoConfig.image;
  const absoluteImage = image ? absoluteUrl(manifest.config.site.url, image) : undefined;

  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : "",
    route.seo?.robots ? `<meta name="robots" content="${escapeHtml(route.seo.robots)}">` : "",
    `<meta property="og:title" content="${escapeHtml(socialTitle)}">`,
    `<meta property="og:description" content="${escapeHtml(socialDescription)}">`,
    `<meta property="og:type" content="website">`,
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">` : "",
    `<meta property="og:site_name" content="${escapeHtml(manifest.config.site.name)}">`,
    absoluteImage ? `<meta property="og:image" content="${escapeHtml(absoluteImage)}">` : "",
    `<meta name="twitter:card" content="${escapeHtml(seoConfig.twitterCard)}">`,
    `<meta name="twitter:title" content="${escapeHtml(socialTitle)}">`,
    `<meta name="twitter:description" content="${escapeHtml(socialDescription)}">`,
    absoluteImage ? `<meta name="twitter:image" content="${escapeHtml(absoluteImage)}">` : "",
  ].filter(Boolean).join("\n  ");
}

export function renderSitemapXml(manifest: SiteManifest): string {
  const urls = manifest.routes
    .map((route) => absoluteUrl(manifest.config.site.url, route.route))
    .filter((url): url is string => Boolean(url))
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function renderRobotsTxt(manifest: SiteManifest): string {
  const lines = getSeoConfig(manifest.config).robots.rules.flatMap((rule) => [
    `User-agent: ${rule.userAgent}`,
    rule.allow ? `Allow: ${rule.allow}` : "",
    rule.disallow ? `Disallow: ${rule.disallow}` : "",
    "",
  ]).filter((line, index, list) => line !== "" || list[index - 1] !== "");

  const sitemap = absoluteUrl(manifest.config.site.url, "/sitemap.xml");
  if (sitemap) {
    lines.push(`Sitemap: ${sitemap}`, "");
  }

  return lines.join("\n");
}

export function renderRedirectsFile(redirects: DocumenteeConfig["redirects"]): string {
  return redirects.map((redirect) => `${redirect.from} ${redirect.to} ${redirect.status}`).join("\n") + (redirects.length > 0 ? "\n" : "");
}

export function renderVercelRedirectsJson(redirects: DocumenteeConfig["redirects"]): string {
  return `${JSON.stringify({
    redirects: redirects.map((redirect) => ({
      source: redirect.from,
      destination: redirect.to,
      permanent: redirect.status === 301 || redirect.status === 308,
    })),
  }, null, 2)}\n`;
}

export function renderRedirectHtml(manifest: SiteManifest, redirect: DocumenteeConfig["redirects"][number]): string {
  const canonical = absoluteUrl(manifest.config.site.url, redirect.to) ?? redirect.to;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(redirect.to)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <title>Redirecting | ${escapeHtml(manifest.config.site.name)}</title>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(redirect.to)}">${escapeHtml(redirect.to)}</a>.</p>
</body>
</html>
`;
}

function renderTitle(manifest: SiteManifest, title: string): string {
  const template = getSeoConfig(manifest.config).titleTemplate;
  if (template) return template.replace("%s", title);
  return `${title} | ${manifest.config.site.name}`;
}

export function absoluteUrl(siteUrl: string | undefined, routeOrUrl: string): string | undefined {
  if (/^https?:\/\//i.test(routeOrUrl)) return routeOrUrl;
  if (!siteUrl) return undefined;
  const base = siteUrl.replace(/\/+$/g, "");
  const route = normalizeRoute(routeOrUrl);
  return `${base}${route}`;
}

function normalizeRoute(route: string): string {
  if (route === "/") return "/";
  const normalized = `/${route.replace(/^\/+|\/+$/g, "")}`;
  if (/\.[a-z0-9]+$/i.test(normalized)) return normalized;
  return `${normalized}/`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
