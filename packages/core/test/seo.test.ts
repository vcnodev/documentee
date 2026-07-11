import { describe, expect, it } from "vitest";
import type { SiteManifest, SiteRoute } from "../src/manifest.js";
import {
  renderRedirectHtml,
  renderRedirectsFile,
  renderRobotsTxt,
  renderSeoHead,
  renderSitemapXml,
  renderVercelRedirectsJson,
} from "../src/seo.js";

describe("SEO helpers", () => {
  const route: SiteRoute = {
    kind: "page",
    route: "/get-started/quickstart",
    title: "Quickstart",
    description: "Make your first request.",
    html: "<h1>Quickstart</h1>",
    markdown: "# Quickstart",
    seo: {
      canonical: "https://docs.acme.test/start",
      robots: "noindex,nofollow",
      image: "/quickstart-og.png",
      socialTitle: "Start with Acme",
      socialDescription: "Send your first request.",
    },
  };

  const manifest: SiteManifest = {
    config: {
      site: { name: "Acme Docs", url: "https://docs.acme.test", description: "Docs for Acme" },
      content: { directory: "docs", exclude: [] },
      versions: [],
      navigation: [],
      openapi: { specs: [] },
      seo: {
        titleTemplate: "%s | Acme",
        image: "/og.png",
        twitterCard: "summary_large_image",
        sitemap: true,
        robots: {
          enabled: true,
          rules: [{ userAgent: "*", allow: "/" }],
        },
      },
      redirects: [{ from: "/old", to: "/get-started/quickstart", status: 301 }],
      search: { provider: "none" },
      theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
    },
    pages: [],
    operations: [],
    routes: [route],
  };

  it("renders canonical, robots, Open Graph, and Twitter metadata", () => {
    const head = renderSeoHead(manifest, route);

    expect(head).toContain("<title>Quickstart | Acme</title>");
    expect(head).toContain('<meta name="description" content="Make your first request.">');
    expect(head).toContain('<link rel="canonical" href="https://docs.acme.test/start">');
    expect(head).toContain('<meta name="robots" content="noindex,nofollow">');
    expect(head).toContain('<meta property="og:title" content="Start with Acme">');
    expect(head).toContain('<meta property="og:url" content="https://docs.acme.test/start">');
    expect(head).toContain('<meta property="og:image" content="https://docs.acme.test/quickstart-og.png">');
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it("renders sitemap XML from manifest routes", () => {
    expect(renderSitemapXml(manifest)).toContain("<loc>https://docs.acme.test/get-started/quickstart/</loc>");
  });

  it("uses the canonical route for latest-version pages", () => {
    const latestRoute: SiteRoute = {
      ...route,
      route: "/v2/get-started/quickstart",
      canonicalRoute: "/get-started/quickstart",
      seo: undefined,
      version: { id: "v2", label: "Version 2", routePrefix: "/v2", default: true, latest: true, deprecated: false },
    };

    const head = renderSeoHead({ ...manifest, routes: [latestRoute] }, latestRoute);

    expect(head).toContain('<link rel="canonical" href="https://docs.acme.test/get-started/quickstart/">');
    expect(head).toContain('<meta property="og:url" content="https://docs.acme.test/get-started/quickstart/">');
  });

  it("renders sitemap XML only from filtered manifest routes", () => {
    const sitemap = renderSitemapXml({
      ...manifest,
      pages: [
        {
          sourcePath: "/repo/docs/superpowers/private.mdx",
          sourceRelativePath: "superpowers/private.mdx",
          sourceProjectPath: "docs/superpowers/private.mdx",
          route: "/superpowers/private",
          title: "Private",
          description: "Internal planning page.",
          seo: {},
          lastUpdated: "2026-07-05T10:20:30.000Z",
          markdown: "# Private\n\nDo not publish.",
          html: "<h1>Private</h1>",
        },
      ],
      routes: [
        route,
        {
          kind: "search",
          route: "/search",
          title: "Search",
          description: "Search Acme documentation.",
          html: "",
          markdown: "",
        },
      ],
    });

    expect(sitemap).toContain("<loc>https://docs.acme.test/get-started/quickstart/</loc>");
    expect(sitemap).toContain("<loc>https://docs.acme.test/search/</loc>");
    expect(sitemap).not.toContain("superpowers");
    expect(sitemap).not.toContain("private");
  });

  it("renders robots text with sitemap URL", () => {
    expect(renderRobotsTxt(manifest)).toBe([
      "User-agent: *",
      "Allow: /",
      "",
      "Sitemap: https://docs.acme.test/sitemap.xml",
      "",
    ].join("\n"));
  });

  it("renders host redirect artifacts", () => {
    expect(renderRedirectsFile(manifest.config.redirects)).toBe("/old /get-started/quickstart 301\n");
    expect(renderVercelRedirectsJson(manifest.config.redirects)).toContain('"source": "/old"');
    expect(renderVercelRedirectsJson(manifest.config.redirects)).toContain('"permanent": true');
  });

  it("renders static redirect fallback HTML", () => {
    const html = renderRedirectHtml(manifest, manifest.config.redirects[0]);

    expect(html).toContain('<meta http-equiv="refresh" content="0; url=/get-started/quickstart">');
    expect(html).toContain('<link rel="canonical" href="https://docs.acme.test/get-started/quickstart/">');
    expect(html).toContain("Redirecting");
  });
});
