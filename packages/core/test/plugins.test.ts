import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { DocumenteeConfig } from "../src/config.js";
import { buildManifest } from "../src/manifest.js";
import { renderRouteWithPlugins, renderStaticSite } from "../src/static-renderer.js";
import { validateManifestWithPlugins } from "../src/validation.js";

const baseConfig = {
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
} satisfies DocumenteeConfig;

describe("Documentee plugins", () => {
  it("applies transformManifest after the normal content pipeline", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-plugins-"));
    await mkdir(join(root, "docs"), { recursive: true });
    await writeFile(join(root, "docs", "index.mdx"), "---\ntitle: Home\n---\n# Home\n");

    const manifest = await buildManifest(root, {
      ...baseConfig,
      plugins: [
        {
          name: "route-marker",
          transformManifest(input) {
            return {
              ...input,
              routes: input.routes.map((route) =>
                route.route === "/" ? { ...route, description: "Changed by plugin" } : route
              ),
            };
          },
        },
      ],
    });

    expect(manifest.routes.find((route) => route.route === "/")?.description).toBe("Changed by plugin");
    expect(manifest.routes.map((route) => route.route)).toEqual(["/"]);
  });

  it("applies async transformHtml hooks in plugin order", async () => {
    const manifest = {
      ...baseManifest(),
      config: {
        ...baseConfig,
        plugins: [
          { name: "first", transformHtml: async (html: string) => html.replace("</body>", "<span>First</span></body>") },
          { name: "second", transformHtml: async (html: string) => html.replace("</body>", "<span>Second</span></body>") },
        ],
      },
    };

    const html = await renderRouteWithPlugins(manifest, manifest.routes[0]);

    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Second"));
  });

  it("applies transformHtml hooks when writing a static site", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "documentee-plugins-out-"));
    const manifest = {
      ...baseManifest(),
      config: {
        ...baseConfig,
        plugins: [
          { name: "static-marker", transformHtml: async (html: string) => html.replace("</body>", "<p>Plugin output</p></body>") },
        ],
      },
    };

    await renderStaticSite(manifest, { outDir });

    expect(await readFile(join(outDir, "index.html"), "utf8")).toContain("Plugin output");
  });

  it("includes plugin validation diagnostics after core validation", async () => {
    const diagnostics = await validateManifestWithPlugins({
      ...baseManifest(),
      config: {
        ...baseConfig,
        plugins: [
          { name: "validator", validate: async () => ["Plugin validator found a problem"] },
        ],
      },
    });

    expect(diagnostics).toContain("Plugin validator found a problem");
  });
});

function baseManifest() {
  return {
    config: baseConfig,
    pages: [],
    operations: [],
    routes: [
      {
        kind: "page" as const,
        route: "/",
        title: "Home",
        description: "",
        html: "<h1>Home</h1>",
        markdown: "# Home",
      },
    ],
  };
}
