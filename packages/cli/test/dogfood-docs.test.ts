import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildManifest, loadConfig, validateManifest } from "@documentee/core";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("dogfood docs", () => {
  it("builds the root Documentee docs manifest with primary docs routes", async () => {
    const config = await loadConfig(root);
    const manifest = await buildManifest(root, config);
    const routes = new Set(manifest.routes.map((route) => route.route));

    expect(routes).toContain("/");
    expect(routes).toContain("/get-started/quickstart");
    expect(routes).toContain("/get-started/use-documentee");
    expect(routes).toContain("/configuration");
    expect(routes).toContain("/api-reference/config");
    expect(routes).toContain("/api-reference/cli");
    expect(routes).toContain("/api-reference/openapi");
    expect(routes).toContain("/components");
    expect(routes).toContain("/ai-agents");
    expect(routes).toContain("/ai-agents/doc-builder-guide");
    expect(routes).toContain("/comparisons/mintlify");
    expect(routes).toContain("/showcase/static-api-docs");
    expect([...routes].filter((route) => route.includes("/superpowers/"))).toEqual([]);
    expect(validateManifest(manifest)).toEqual([]);
  });

  it("documents the current Documentee config surface", async () => {
    const configReference = await readFile(join(root, "docs", "api-reference", "config.mdx"), "utf8");
    const configurationGuide = await readFile(join(root, "docs", "configuration.mdx"), "utf8");
    const readme = await readFile(join(root, "README.md"), "utf8");
    const designSystemNames = [
      "minimal-technical",
      "modern-glass",
      "api-ide",
      "enterprise-knowledge",
      "premium-editorial",
      "sci-fi-console",
      "api-observatory",
      "knowledge-graph",
    ];

    expect(configReference).toContain("theme.designSystem");
    expect(configReference).toContain("theme.overrides");
    expect(configReference).toContain("site.basePath");
    expect(configReference).toContain("contentWidth");
    expect(configReference).toContain("methodGetColor");
    expect(configurationGuide).toContain("site.basePath");
    expect(configurationGuide).toContain("contentWidth");
    expect(configurationGuide).toContain("methodGetColor");
    expect(readme).toContain("site.basePath");
    expect(readme).toContain("contentWidth");
    expect(readme).toContain("methodGetColor");
    expect(configReference).toContain("openapi.specs");
    expect(configReference).toContain("versions");
    expect(configReference).toContain("search.provider");
    expect(configReference).toContain("seo");
    expect(configReference).toContain("redirects");
    expect(configReference).toContain("playground");
    for (const designSystem of designSystemNames) {
      expect(configReference).toContain(designSystem);
      expect(configurationGuide).toContain(designSystem);
      expect(readme).toContain(designSystem);
    }
  });

  it("provides AI-agent-ready documentation guidance", async () => {
    const agentIndex = await readFile(join(root, "docs", "ai-agents", "index.mdx"), "utf8");
    const builderGuide = await readFile(join(root, "docs", "ai-agents", "doc-builder-guide.mdx"), "utf8");
    const useDocumenteeGuide = await readFile(join(root, "docs", "get-started", "use-documentee.mdx"), "utf8");
    const combined = `${agentIndex}\n${builderGuide}\n${useDocumenteeGuide}`;

    expect(combined).toContain("AGENTS.md");
    expect(combined).toContain("/configuration");
    expect(combined).toContain("/api-reference/config");
    expect(combined).toContain("/api-reference/cli");
    expect(combined).toContain("/contributing/architecture");
    expect(combined).toContain("/contributing/testing");
    expect(combined).toContain("/contributing/small-html-no-client-js");
    expect(combined).toContain("pnpm validate");
    expect(combined).toContain("pnpm docs:validate");
    expect(combined).toContain("pnpm docs:build");
    expect(combined).toContain("pnpm docs:preview");
    expect(combined).toContain("llms.txt");
    expect(combined).toContain("llms-full.txt");
    expect(combined).toContain("llms.json");
    expect(combined).toContain("skill.md");
    expect(combined).toContain("GitHub Pages");
  });

  it("documents and automates GitHub Pages publishing for the dogfood docs", async () => {
    const workflow = await readFile(join(root, ".github", "workflows", "pages.yml"), "utf8");
    const useDocumenteeGuide = await readFile(join(root, "docs", "get-started", "use-documentee.mdx"), "utf8");
    const readme = await readFile(join(root, "README.md"), "utf8");

    expect(workflow).toContain("actions/configure-pages@v5");
    expect(workflow).toContain("actions/upload-pages-artifact@v4");
    expect(workflow).toContain("actions/deploy-pages@v4");
    expect(workflow).toContain("node-version: 22");
    expect(workflow.indexOf("run: pnpm build")).toBeGreaterThan(-1);
    expect(workflow.indexOf("run: pnpm build")).toBeLessThan(workflow.indexOf("run: pnpm docs:validate"));
    expect(workflow).toContain("pages: write");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("pnpm docs:validate");
    expect(workflow).toContain("pnpm docs:build");
    expect(workflow).toContain("path: dist-docs");
    expect(useDocumenteeGuide).toContain(".github/workflows/pages.yml");
    expect(useDocumenteeGuide).toContain("Settings");
    expect(useDocumenteeGuide).toContain("GitHub Actions");
    expect(readme).toContain("/get-started/use-documentee");
  });

  it("exposes a root docs build script for dogfooding", async () => {
    const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["docs:build"]).toBe("pnpm --filter @documentee/cli documentee build . --out dist-docs");
    expect(packageJson.scripts?.["docs:validate"]).toBe("pnpm --filter @documentee/cli documentee validate .");
    expect(packageJson.scripts?.["docs:preview"]).toBe("pnpm --filter @documentee/cli documentee preview . --out dist-docs --port 3000");
  });
});
