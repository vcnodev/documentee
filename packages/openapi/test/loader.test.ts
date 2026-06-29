import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadOpenApiSpec } from "../src/loader.js";

describe("loadOpenApiSpec", () => {
  it("loads YAML OpenAPI files", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-openapi-"));
    const specPath = join(root, "openapi.yaml");
    await writeFile(specPath, "openapi: 3.1.0\ninfo:\n  title: Acme API\n  version: 1.0.0\npaths: {}\n");

    const spec = await loadOpenApiSpec(specPath);

    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("Acme API");
  });

  it("rejects files without an openapi version", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-openapi-"));
    const specPath = join(root, "bad.yaml");
    await writeFile(specPath, "info:\n  title: Missing\npaths: {}\n");

    await expect(loadOpenApiSpec(specPath)).rejects.toThrow("OpenAPI spec is missing the openapi version");
  });
});
