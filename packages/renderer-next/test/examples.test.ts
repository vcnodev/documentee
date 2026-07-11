import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SiteManifest } from "@documentee/core";
import { writeNextExamples } from "../src/examples.js";

describe("writeNextExamples", () => {
  it("writes App Router and Pages Router examples without client markers", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "documentee-next-"));
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
      routes: [{ kind: "page", route: "/", title: "Home", description: "", html: "<h1>Home</h1>", markdown: "# Home" }],
    };

    await writeNextExamples(manifest, outDir);

    const appPage = await readFile(join(outDir, "app", "[...slug]", "page.tsx"), "utf8");
    const pagesPage = await readFile(join(outDir, "pages", "[...slug].tsx"), "utf8");

    expect(await exists(join(outDir, "documentee-manifest.json"))).toBe(true);
    expect(appPage).not.toContain("use client");
    expect(pagesPage).not.toContain("use client");
    expect(appPage).not.toContain("<script");
    expect(appPage).toContain("renderDocumenteePageHtml");
  });
});

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
