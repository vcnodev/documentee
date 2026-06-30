import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("loads docs.json and normalizes defaults", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        navigation: [{ group: "Get Started", pages: ["docs/get-started/quickstart"] }],
        openapi: { specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference" }] },
      }),
    );

    const config = await loadConfig(root);

    expect(config.site.name).toBe("Acme Docs");
    expect(config.content.directory).toBe("docs");
    expect(config.openapi.specs[0].id).toBe("core");
    expect(config.openapi.specs[0].playground).toEqual({
      enabled: false,
      auth: "none",
      apiKeyLocation: "header",
    });
    expect(config.search.provider).toBe("none");
  });

  it("loads OpenAPI playground settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        openapi: {
          specs: [
            {
              id: "core",
              source: "./api/openapi.yaml",
              routeBase: "/api-reference",
              playground: {
                enabled: true,
                baseUrl: "https://api.acme.test",
                auth: "apiKey",
                apiKeyName: "x-api-key",
                apiKeyLocation: "header",
              },
            },
          ],
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.openapi.specs[0].playground).toEqual({
      enabled: true,
      baseUrl: "https://api.acme.test",
      auth: "apiKey",
      apiKeyName: "x-api-key",
      apiKeyLocation: "header",
    });
  });

  it("rejects duplicate OpenAPI spec ids", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        openapi: {
          specs: [
            { id: "core", source: "./api/a.yaml", routeBase: "/a" },
            { id: "core", source: "./api/b.yaml", routeBase: "/b" }
          ]
        }
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow("Duplicate OpenAPI spec id: core");
  });
});
