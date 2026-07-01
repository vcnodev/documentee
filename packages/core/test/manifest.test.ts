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
      seo: {
        sitemap: true,
        robots: { enabled: true, rules: [{ userAgent: "*", allow: "/" }] },
        twitterCard: "summary_large_image",
      },
      redirects: [],
      search: { provider: "none" },
      theme: { darkMode: true },
    };

    const manifest = await buildManifest(root, config);

    expect(manifest.routes.map((route) => route.route)).toEqual(["/", "/api-reference", "/api-reference/list-messages", "/schemas/core/Huge"]);
    expect(JSON.stringify(manifest.routes)).not.toContain("properties");
  });

  it("builds versioned content, versioned specs, API portal, and spec-scoped schema routes", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-manifest-"));
    await mkdir(join(root, "docs", "v1"), { recursive: true });
    await mkdir(join(root, "docs", "v2"), { recursive: true });
    await mkdir(join(root, "api"), { recursive: true });
    await writeFile(join(root, "docs", "index.mdx"), "---\ntitle: Home\n---\n# Home\n");
    await writeFile(join(root, "docs", "v1", "index.mdx"), "---\ntitle: V1 Home\n---\n# V1\n");
    await writeFile(join(root, "docs", "v2", "index.mdx"), "---\ntitle: V2 Home\n---\n# V2\n");
    await writeFile(
      join(root, "api", "core-v1.yaml"),
      `openapi: 3.1.0
info:
  title: Core
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
                $ref: "#/components/schemas/Message"
components:
  schemas:
    Message:
      type: object
`,
    );
    await writeFile(
      join(root, "api", "admin-v2.yaml"),
      `openapi: 3.1.0
info:
  title: Admin
  version: 2.0.0
paths:
  /users:
    get:
      operationId: listUsers
      summary: List users
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Message"
components:
  schemas:
    Message:
      type: object
`,
    );

    const config: DocumenteeConfig = {
      site: { name: "Acme", description: "" },
      content: { directory: "docs" },
      versions: [
        { id: "v1", label: "Version 1", routePrefix: "/v1", content: { directory: "docs/v1" }, default: false },
        { id: "v2", label: "Version 2", routePrefix: "/v2", content: { directory: "docs/v2" }, default: true },
      ],
      navigation: [],
      openapi: {
        specs: [
          {
            id: "core-v1",
            name: "Core API v1",
            source: "./api/core-v1.yaml",
            routeBase: "/api-reference/core",
            version: "v1",
            playground: { enabled: false, auth: "none", apiKeyLocation: "header" },
          },
          {
            id: "admin-v2",
            name: "Admin API v2",
            source: "./api/admin-v2.yaml",
            routeBase: "/api-reference/admin",
            version: "v2",
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
    };

    const manifest = await buildManifest(root, config);
    const portal = manifest.routes.find((route) => route.route === "/api-reference");

    expect(manifest.routes.map((route) => route.route)).toEqual([
      "/",
      "/api-reference",
      "/schemas/admin-v2/Message",
      "/schemas/core-v1/Message",
      "/v1",
      "/v1/api-reference/core/list-messages",
      "/v2",
      "/v2/api-reference/admin/list-users",
    ]);
    expect(manifest.routes.find((route) => route.route === "/v1")?.version?.id).toBe("v1");
    expect(manifest.routes.find((route) => route.route === "/v2/api-reference/admin/list-users")?.version?.id).toBe("v2");
    expect(portal?.kind).toBe("api-portal");
    expect(portal?.apiPortal?.specs).toEqual([
      {
        id: "core-v1",
        name: "Core API v1",
        version: { id: "v1", label: "Version 1", routePrefix: "/v1", default: false },
        operationCount: 1,
        firstOperationRoute: "/v1/api-reference/core/list-messages",
      },
      {
        id: "admin-v2",
        name: "Admin API v2",
        version: { id: "v2", label: "Version 2", routePrefix: "/v2", default: true },
        operationCount: 1,
        firstOperationRoute: "/v2/api-reference/admin/list-users",
      },
    ]);
  });
});
