import { describe, expect, it } from "vitest";
import type { SiteManifest } from "@documentee/core";
import { createAgentChunkIndex } from "../src/chunks.js";
import { renderLlmsFullTxt, renderLlmsJson, renderLlmsTxt } from "../src/render.js";
import { renderSkillMd } from "../src/skill.js";

describe("LLM text renderers", () => {
  it("renders index and full text outputs", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme Docs", description: "Docs for Acme" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: {
          specs: [
            {
              id: "core",
              source: "./api/openapi.yaml",
              routeBase: "/api-reference",
              playground: { enabled: false, auth: "none", apiKeyLocation: "header" },
            },
          ],
        },
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
      operations: [
        {
          specId: "core",
          method: "GET",
          path: "/messages",
          slug: "list-messages",
          route: "/api-reference/list-messages",
          summary: "List messages",
          tags: ["Messages"],
          deprecated: false,
          beta: false,
          auth: [],
          parameters: [],
          responses: [],
          codeSamples: [],
        },
      ],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "Welcome",
          html: "<h1>Home</h1>",
          markdown: "# Home",
          sourceProjectPath: "docs/index.mdx",
        },
      ],
    };

    expect(renderLlmsTxt(manifest)).toContain("# Acme Docs");
    expect(renderLlmsTxt(manifest)).toContain("- [Home](/)");
    expect(renderLlmsTxt(manifest)).toContain("- OpenAPI spec `core`: `./api/openapi.yaml`");
    expect(renderLlmsFullTxt(manifest)).toContain("## GET /messages");
    expect(renderLlmsFullTxt(manifest)).toContain("List messages");
    expect(renderSkillMd(manifest)).toContain("# Acme Docs Agent Skill");
    expect(renderSkillMd(manifest)).toContain("## Reading Order");
    expect(renderSkillMd(manifest)).toContain("- Home: `/`");
    expect(renderSkillMd(manifest)).toContain("- GET /messages: `/api-reference/list-messages`");
    expect(renderSkillMd(manifest)).toContain("pnpm docs:validate");
    expect(renderSkillMd(manifest)).toContain("Update the public docs and README when user-facing behavior changes.");

    const llmsJson = JSON.parse(renderLlmsJson(manifest));
    expect(llmsJson).toMatchObject({
      site: {
        name: "Acme Docs",
        description: "Docs for Acme",
      },
      routes: [
        {
          route: "/",
          title: "Home",
          description: "Welcome",
          contentType: "guide",
          source: "docs/index.mdx",
          chunks: [],
        },
        {
          route: "/api-reference/list-messages",
          title: "GET /messages",
          description: "List messages",
          contentType: "api-operation",
          api: {
            specId: "core",
            method: "GET",
            path: "/messages",
            tags: ["Messages"],
            deprecated: false,
            beta: false,
          },
          chunks: [
            {
              route: "/api-reference/list-messages",
              headingPath: ["GET /messages"],
              text: "List messages",
            },
          ],
        },
      ],
    });
  });

  it("renders LLM text only from filtered manifest routes", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme Docs", description: "Docs for Acme" },
        content: { directory: "docs", exclude: ["superpowers/**"] },
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
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "Welcome",
          html: "<h1>Home</h1>",
          markdown: "# Home",
        },
      ],
    };

    expect(renderLlmsTxt(manifest)).toContain("- [Home](/)");
    expect(renderLlmsTxt(manifest)).not.toContain("superpowers");
    expect(renderLlmsFullTxt(manifest)).toContain("# Home");
    expect(renderLlmsFullTxt(manifest)).not.toContain("Private");
    expect(renderLlmsFullTxt(manifest)).not.toContain("Do not publish.");
    expect(renderLlmsJson(manifest)).not.toContain("superpowers");
    expect(renderLlmsJson(manifest)).not.toContain("Do not publish.");
  });
});

describe("agent chunk index", () => {
  it("splits pages into semantic chunks with heading path, source, text, and links", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme Docs", description: "Docs for Acme" },
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
        {
          kind: "page",
          route: "/get-started/quickstart",
          title: "Quickstart",
          description: "Start fast.",
          html: "",
          markdown: "## Install\n\n### Build\n\nRun `pnpm docs:build` and read [CLI](/api-reference/cli).",
          sourceProjectPath: "docs/get-started/quickstart.mdx",
        },
      ],
    };

    const index = createAgentChunkIndex(manifest);

    expect(index.chunks[0]).toMatchObject({
      route: "/get-started/quickstart",
      headingPath: ["Install", "Build"],
      source: "docs/get-started/quickstart.mdx",
      text: "Run `pnpm docs:build` and read [CLI](/api-reference/cli).",
      links: ["/api-reference/cli"],
    });
    expect(JSON.parse(renderLlmsJson(manifest)).routes[0].chunks[0]).toMatchObject({
      headingPath: ["Install", "Build"],
      source: "docs/get-started/quickstart.mdx",
    });
  });

  it("adds API operation chunks with compact operation metadata", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme Docs", description: "Docs for Acme" },
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
      operations: [
        {
          specId: "core",
          method: "GET",
          path: "/messages",
          slug: "list-messages",
          route: "/api-reference/list-messages",
          summary: "List messages",
          description: "Returns recent messages.",
          tags: ["Messages"],
          deprecated: false,
          beta: false,
          auth: ["bearerAuth"],
          parameters: [{ name: "limit", location: "query", required: false, schemaType: "integer" }],
          responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: ["Message"] }],
          codeSamples: [],
        },
      ],
      routes: [],
    };

    const index = createAgentChunkIndex(manifest);

    expect(index.chunks[0]).toMatchObject({
      route: "/api-reference/list-messages",
      headingPath: ["GET /messages"],
      text: "List messages\n\nReturns recent messages.",
      api: {
        specId: "core",
        method: "GET",
        path: "/messages",
        auth: ["bearerAuth"],
        parameters: [{ name: "limit", location: "query", required: false, schemaType: "integer" }],
        responses: [{ status: "200", mediaTypes: ["application/json"], schemaRefs: ["Message"] }],
      },
    });
  });
});
