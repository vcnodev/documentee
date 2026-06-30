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
      content: { directory: "docs" },
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
