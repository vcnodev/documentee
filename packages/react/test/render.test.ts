import { describe, expect, it } from "vitest";
import type { SiteManifest } from "@documentee/core";
import { renderDocumenteePageHtml } from "../src/render.js";

describe("renderDocumenteePageHtml", () => {
  it("renders small server HTML without Documentee client JavaScript", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
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
      },
      pages: [],
      operations: [],
      routes: [{ kind: "page", route: "/", title: "Home", description: "", html: "<h1>Home</h1>", markdown: "# Home" }],
    };

    const html = renderDocumenteePageHtml(manifest, manifest.routes[0], { htmlBudgetBytes: 20_000 });

    expect(html).toContain("<h1>Home</h1>");
    expect(html).not.toContain("use client");
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/\son[A-Z][A-Za-z]*=/);
    expect(Buffer.byteLength(html, "utf8")).toBeLessThan(20_000);
  });
});
