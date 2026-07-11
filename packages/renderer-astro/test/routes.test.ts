import { describe, expect, it } from "vitest";
import type { SiteManifest } from "@documentee/core";
import { createAstroRouteModules } from "../src/routes.js";

describe("createAstroRouteModules", () => {
  it("creates Astro route metadata from the shared manifest", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: {
          sitemap: true,
          robots: { enabled: true, rules: [{ userAgent: "*", allow: "/" }] },
          twitterCard: "summary_large_image",
        },
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        { kind: "page", route: "/", title: "Home", description: "", html: "<h1>Home</h1>", markdown: "# Home" },
        { kind: "page", route: "/guide", title: "Guide", description: "", html: "<h1>Guide</h1>", markdown: "# Guide" },
      ],
    };

    const modules = createAstroRouteModules(manifest);

    expect(modules).toEqual([
      { route: "/", params: {}, props: { route: manifest.routes[0] } },
      { route: "/guide", params: { slug: "guide" }, props: { route: manifest.routes[1] } },
    ]);
  });
});
