import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SiteManifest } from "../src/manifest.js";
import { assertHtmlBudget, renderRoute, renderStaticSite } from "../src/static-renderer.js";

describe("static renderer", () => {
  it("writes index.html files for routes", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "documentee-render-"));
    await mkdir(outDir, { recursive: true });
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
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

    await renderStaticSite(manifest, { outDir });

    const html = await readFile(join(outDir, "index.html"), "utf8");
    expect(html).toContain("<h1>Home</h1>");
    expect(html).toContain("Acme");
  });

  it("fails when HTML exceeds the route budget", () => {
    expect(() => assertHtmlBudget("<p>too large</p>", 3, "/large")).toThrow(
      "/large HTML payload",
    );
  });

  it("renders compact API operation details without schema internals", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "api-operation",
          route: "/api-reference/update-message",
          title: "PATCH /messages/{id}",
          description: "Update a message",
          html: "",
          markdown: "Update a message",
          operation: {
            specId: "core",
            method: "PATCH",
            path: "/messages/{id}",
            slug: "update-message",
            route: "/api-reference/update-message",
            summary: "Update a message",
            tags: ["Messages"],
            deprecated: false,
            beta: true,
            auth: ["bearerAuth"],
            parameters: [{ name: "id", location: "path", required: true }],
            requestBody: { required: false, mediaTypes: ["application/json"], schemaRefs: ["UpdateMessageRequest"] },
            responses: [{ status: "200", description: "Updated", mediaTypes: ["application/json"], schemaRefs: ["Message"] }],
            codeSamples: [{ lang: "curl", source: "curl https://api.acme.test/messages/id" }],
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("Authentication");
    expect(html).toContain("bearerAuth");
    expect(html).toContain("Parameters");
    expect(html).toContain("Request Body");
    expect(html).toContain("Responses");
    expect(html).toContain("UpdateMessageRequest");
    expect(html).toContain("Beta");
    expect(html).toContain("Code Samples");
    expect(html).toContain("curl https://api.acme.test/messages/id");
    expect(html).not.toContain("properties");
  });

  it("renders schema detail routes separately", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "schema",
          route: "/schemas/Message",
          title: "Schema: Message",
          description: "Shared schema reference.",
          html: "",
          markdown: "",
          schema: { name: "Message", specId: "core" },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("Schema: Message");
    expect(html).toContain("Shared schema reference");
  });
});
