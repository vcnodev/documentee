import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SiteManifest } from "@documentee/core";
import { writeAstroProject } from "../src/project.js";

describe("writeAstroProject", () => {
  it("writes a runnable Astro project shell from a manifest", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "documentee-astro-"));
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "Docs" },
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

    await writeAstroProject(manifest, outDir);

    expect(await exists(join(outDir, "astro.config.mjs"))).toBe(true);
    expect(await exists(join(outDir, "src", "pages", "[...slug].astro"))).toBe(true);
    expect(await exists(join(outDir, "src", "documentee-manifest.json"))).toBe(true);
    expect(await exists(join(outDir, "src", "styles", "documentee.css"))).toBe(true);
    expect(await readFile(join(outDir, "package.json"), "utf8")).toContain("astro");
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
