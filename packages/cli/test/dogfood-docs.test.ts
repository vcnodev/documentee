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

    expect(configReference).toContain("theme.preset");
    expect(configReference).toContain("openapi.specs");
    expect(configReference).toContain("versions");
    expect(configReference).toContain("search.provider");
    expect(configReference).toContain("seo");
    expect(configReference).toContain("redirects");
    expect(configReference).toContain("playground");
  });

  it("provides AI-agent-ready documentation guidance", async () => {
    const agentIndex = await readFile(join(root, "docs", "ai-agents", "index.mdx"), "utf8");
    const builderGuide = await readFile(join(root, "docs", "ai-agents", "doc-builder-guide.mdx"), "utf8");
    const combined = `${agentIndex}\n${builderGuide}`;

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
  });

  it("exposes a root docs build script for dogfooding", async () => {
    const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["docs:build"]).toBe("pnpm --filter @documentee/cli documentee build . --out dist-docs");
    expect(packageJson.scripts?.["docs:validate"]).toBe("pnpm --filter @documentee/cli documentee validate .");
  });
});
