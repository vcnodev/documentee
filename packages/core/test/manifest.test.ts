import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DocumenteeConfig } from "../src/config.js";
import { buildManifest } from "../src/manifest.js";

describe("buildManifest", () => {
  it("combines content pages and compact OpenAPI operation routes", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-manifest-"));
    await mkdir(join(root, "docs"), { recursive: true });
    await mkdir(join(root, "api"), { recursive: true });
    await writeFile(join(root, "docs", "index.mdx"), "---\ntitle: Home\n---\n# Home\n");
    await writeFile(
      join(root, "api", "openapi.yaml"),
      `openapi: 3.1.0
info:
  title: Acme
  version: 1.0.0
paths:
  /messages:
    get:
      operationId: listMessages
      summary: List messages
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Huge"
components:
  schemas:
    Huge:
      type: object
      properties:
        nested:
          type: string
`,
    );

    const config: DocumenteeConfig = {
      site: { name: "Acme", description: "" },
      content: { directory: "docs" },
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
      search: { provider: "none" },
      theme: { darkMode: true },
    };

    const manifest = await buildManifest(root, config);

    expect(manifest.routes.map((route) => route.route)).toEqual(["/", "/api-reference/list-messages", "/schemas/Huge"]);
    expect(JSON.stringify(manifest.routes)).not.toContain("properties");
  });
});
