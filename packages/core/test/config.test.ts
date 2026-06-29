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
    expect(config.search.provider).toBe("none");
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
