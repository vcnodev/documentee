import { describe, expect, it } from "vitest";
import type { SiteManifest } from "@documentee/core";
import { renderLlmsFullTxt, renderLlmsTxt } from "../src/render.js";

describe("LLM text renderers", () => {
  it("renders index and full text outputs", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme Docs", description: "Docs for Acme" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference" }] },
        search: { provider: "none" },
        theme: { darkMode: true },
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
        },
      ],
    };

    expect(renderLlmsTxt(manifest)).toContain("# Acme Docs");
    expect(renderLlmsTxt(manifest)).toContain("- [Home](/)");
    expect(renderLlmsTxt(manifest)).toContain("- OpenAPI spec `core`: `./api/openapi.yaml`");
    expect(renderLlmsFullTxt(manifest)).toContain("## GET /messages");
    expect(renderLlmsFullTxt(manifest)).toContain("List messages");
  });
});
