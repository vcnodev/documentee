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
    };

    const manifest = await buildManifest(root, config);
    const schemaRoute = manifest.routes.find((route) => route.route === "/schemas/core/Huge");

    expect(manifest.routes.map((route) => route.route)).toEqual(["/", "/api-reference", "/api-reference/list-messages", "/schemas/core/Huge"]);
    expect(schemaRoute?.schema).toMatchObject({
      name: "Huge",
      specId: "core",
      schemaType: "object",
      fields: [{ name: "nested", required: false, schemaType: "string" }],
    });
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
      content: { directory: "docs", exclude: [] },
      versions: [
        { id: "v1", label: "Version 1", routePrefix: "/v1", content: { directory: "docs/v1", exclude: [] }, default: false, latest: false, deprecated: true },
        { id: "v2", label: "Version 2", routePrefix: "/v2", content: { directory: "docs/v2", exclude: [] }, default: true, latest: true, deprecated: false },
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
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
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
    expect(manifest.routes.find((route) => route.route === "/v2")?.canonicalRoute).toBe("/");
    expect(manifest.routes.find((route) => route.route === "/v2/api-reference/admin/list-users")?.version?.id).toBe("v2");
    expect(manifest.routes.find((route) => route.route === "/v2/api-reference/admin/list-users")?.canonicalRoute).toBe("/api-reference/admin/list-users");
    expect(portal?.kind).toBe("api-portal");
    expect(portal?.apiPortal?.specs).toEqual([
      {
        id: "core-v1",
        name: "Core API v1",
        version: { id: "v1", label: "Version 1", routePrefix: "/v1", default: false, latest: false, deprecated: true },
        operationCount: 1,
        firstOperationRoute: "/v1/api-reference/core/list-messages",
      },
      {
        id: "admin-v2",
        name: "Admin API v2",
        version: { id: "v2", label: "Version 2", routePrefix: "/v2", default: true, latest: true, deprecated: false },
        operationCount: 1,
        firstOperationRoute: "/v2/api-reference/admin/list-users",
      },
    ]);
  });

  it("adds a generated search route when Pagefind search is enabled", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-manifest-search-"));
    await mkdir(join(root, "docs"), { recursive: true });
    await writeFile(join(root, "docs", "index.mdx"), "---\ntitle: Home\n---\n# Home\n");

    const config: DocumenteeConfig = {
      site: { name: "Acme", description: "" },
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
      search: { provider: "pagefind" },
      theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
    };

    const manifest = await buildManifest(root, config);
    const searchRoute = manifest.routes.find((route) => route.route === "/search");

    expect(searchRoute?.title).toBe("Search");
    expect(searchRoute?.description).toBe("Search Acme documentation.");
  });

  it("builds locale-prefixed non-default locale routes with locale metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-manifest-i18n-"));
    await mkdir(join(root, "docs", "fr"), { recursive: true });
    await mkdir(join(root, "docs", "ar"), { recursive: true });
    await writeFile(join(root, "docs", "index.mdx"), "---\ntitle: Home\n---\n# Home\n");
    await writeFile(join(root, "docs", "guide.mdx"), "---\ntitle: Guide\n---\n# Guide\n");
    await writeFile(join(root, "docs", "fr", "index.mdx"), "---\ntitle: Accueil\n---\n# Accueil\n");
    await writeFile(join(root, "docs", "fr", "guide.mdx"), "---\ntitle: Guide FR\n---\n# Guide FR\n");
    await writeFile(join(root, "docs", "ar", "index.mdx"), "---\ntitle: الرئيسية\n---\n# الرئيسية\n");

    const config: DocumenteeConfig = {
      site: { name: "Acme", description: "" },
      content: { directory: "docs", exclude: [] },
      i18n: {
        defaultLocale: "en",
        prefixDefaultLocale: false,
        locales: [
          { code: "en", label: "English", dir: "ltr" },
          { code: "fr", label: "Français", dir: "ltr" },
          { code: "ar", label: "العربية", dir: "rtl" },
        ],
      },
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
    };

    const manifest = await buildManifest(root, config);

    expect(manifest.locales).toEqual([
      { code: "en", label: "English", dir: "ltr", default: true, routePrefix: "/" },
      { code: "fr", label: "Français", dir: "ltr", default: false, routePrefix: "/fr" },
      { code: "ar", label: "العربية", dir: "rtl", default: false, routePrefix: "/ar" },
    ]);
    expect(manifest.routes.map((route) => route.route)).toEqual(["/", "/ar", "/fr", "/fr/guide", "/guide"]);
    expect(manifest.routes.find((route) => route.route === "/")?.locale?.code).toBe("en");
    expect(manifest.routes.find((route) => route.route === "/ar")?.locale).toMatchObject({ code: "ar", dir: "rtl" });
    expect(manifest.routes.find((route) => route.route === "/fr/guide")?.sourceRelativePath).toBe("guide.mdx");
  });

  it("omits excluded content from manifest routes while keeping generated search", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-manifest-exclude-"));
    await mkdir(join(root, "docs", "public"), { recursive: true });
    await mkdir(join(root, "docs", "superpowers"), { recursive: true });
    await writeFile(join(root, "docs", "index.mdx"), "---\ntitle: Home\n---\n# Home\n");
    await writeFile(join(root, "docs", "public", "page.mdx"), "---\ntitle: Public\n---\n# Public\n");
    await writeFile(join(root, "docs", "superpowers", "private.mdx"), "---\ntitle: Private\n---\n# Private\n");

    const config: DocumenteeConfig = {
      site: { name: "Acme", description: "" },
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
      search: { provider: "pagefind" },
      theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
    };

    const manifest = await buildManifest(root, config);

    expect(manifest.routes.map((route) => route.route)).toEqual(["/", "/public/page", "/search"]);
    expect(JSON.stringify(manifest.routes)).not.toContain("Private");
  });

  it("omits excluded version content from versioned routes", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-manifest-version-exclude-"));
    await mkdir(join(root, "docs", "v1", "public"), { recursive: true });
    await mkdir(join(root, "docs", "v1", "internal"), { recursive: true });
    await writeFile(join(root, "docs", "index.mdx"), "---\ntitle: Home\n---\n# Home\n");
    await writeFile(join(root, "docs", "v1", "public", "page.mdx"), "---\ntitle: Public V1\n---\n# Public V1\n");
    await writeFile(join(root, "docs", "v1", "internal", "private.mdx"), "---\ntitle: Private V1\n---\n# Private V1\n");

    const config: DocumenteeConfig = {
      site: { name: "Acme", description: "" },
      content: { directory: "docs", exclude: [] },
      versions: [
        { id: "v1", label: "Version 1", routePrefix: "/v1", content: { directory: "docs/v1", exclude: ["internal/**"] }, default: false, latest: false, deprecated: false },
      ],
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
    };

    const manifest = await buildManifest(root, config);

    expect(manifest.routes.map((route) => route.route)).toEqual(["/", "/v1/public/page"]);
    expect(JSON.stringify(manifest.routes)).not.toContain("Private V1");
  });
});
