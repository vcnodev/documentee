import { describe, expect, it } from "vitest";
import type { SiteManifest } from "@documentee/core";
import { createNextAppRouterEntries, createNextPagesRouterEntries } from "../src/adapters.js";

describe("Next renderer adapters", () => {
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

  it("creates App Router entries without client-component markers", () => {
    const entries = createNextAppRouterEntries(manifest);

    expect(entries[0]).toEqual({ route: "/", segments: [], dynamic: "force-static" });
    expect(entries[1]).toEqual({ route: "/guide", segments: ["guide"], dynamic: "force-static" });
    expect(JSON.stringify(entries)).not.toContain("use client");
  });

  it("creates Pages Router entries from the same manifest", () => {
    const entries = createNextPagesRouterEntries(manifest);

    expect(entries[0]).toEqual({ route: "/", page: "/index" });
    expect(entries[1]).toEqual({ route: "/guide", page: "/guide" });
  });
});
