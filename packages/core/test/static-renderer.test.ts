import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SiteManifest } from "../src/manifest.js";
import { assertHtmlBudget, renderRoute, renderStaticSite } from "../src/static-renderer.js";

const defaultSeo = {
  sitemap: true,
  robots: { enabled: true, rules: [{ userAgent: "*", allow: "/" }] },
  twitterCard: "summary_large_image" as const,
};

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
        seo: defaultSeo,
        redirects: [],
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

  it("renders SEO metadata in HTML pages", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", url: "https://docs.acme.test", description: "Docs" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: {
          titleTemplate: "%s | Acme",
          image: "/og.png",
          twitterCard: "summary_large_image",
          sitemap: true,
          robots: { enabled: true, rules: [{ userAgent: "*", allow: "/" }] },
        },
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/quickstart",
          title: "Quickstart",
          description: "Start quickly.",
          seo: { robots: "noindex", image: "/quickstart.png" },
          html: "<h1>Quickstart</h1>",
          markdown: "# Quickstart",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("<title>Quickstart | Acme</title>");
    expect(html).toContain('<link rel="canonical" href="https://docs.acme.test/quickstart/">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<meta property="og:image" content="https://docs.acme.test/quickstart.png">');
  });

  it("renders configured theme tokens as CSS variables and custom CSS", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: {
          primaryColor: "#2563eb",
          accentColor: "#0f766e",
          backgroundColor: "#ffffff",
          textColor: "#18181b",
          mutedTextColor: "#52525b",
          borderColor: "#d4d4d8",
          codeBackgroundColor: "#f4f4f5",
          fontFamily: "Inter",
          codeFontFamily: "ui-monospace",
          radius: "10px",
          navWidth: "300px",
          customCss: ".custom { color: red; }",
          darkMode: false,
        },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("--doc-primary: #2563eb;");
    expect(html).toContain("--doc-accent: #0f766e;");
    expect(html).toContain("--doc-nav-width: 300px;");
    expect(html).toContain("font-family: var(--doc-font-family)");
    expect(html).toContain(".custom { color: red; }");
  });

  it("renders named theme preset tokens as CSS variables", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: {
          preset: "mint",
          darkMode: true,
        },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("--doc-primary: #0f766e;");
    expect(html).toContain("--doc-accent: #14b8a6;");
    expect(html).toContain("--doc-background: #f8fffc;");
    expect(html).toContain("--doc-code-background: #ecfdf5;");
  });

  it("lets custom theme tokens override preset tokens", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: {
          preset: "slate",
          primaryColor: "#db2777",
          navWidth: "320px",
          darkMode: false,
        },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("--doc-primary: #db2777;");
    expect(html).toContain("--doc-accent: #2563eb;");
    expect(html).toContain("--doc-nav-width: 320px;");
    expect(html).toContain(":root { color-scheme: light;");
  });

  it("renders a polished static shell with route-aware navigation and search entry", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [
          { group: "Guides", pages: ["docs/index", "docs/get-started/quickstart"] },
        ],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "pagefind" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
        {
          kind: "page",
          route: "/get-started/quickstart",
          title: "Quickstart",
          description: "",
          html: "<h1>Quickstart</h1>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[1]);

    expect(html).toContain('class="doc-shell"');
    expect(html).toContain('class="doc-sidebar"');
    expect(html).toContain('class="doc-mobile-header"');
    expect(html).toContain('class="doc-mobile-menu"');
    expect(html).toContain('aria-label="Mobile navigation"');
    expect(html).toContain('class="doc-topbar"');
    expect(html).toContain('class="doc-search-link" href="/search/"');
    expect(html).toContain('class="nav-link is-active" href="/get-started/quickstart/"');
    expect(html).toContain(".doc-content h1");
    expect(html).toContain("@media (max-width: 820px)");
    expect(html).toContain(".doc-mobile-header {");
    expect(html).not.toContain("pagefind-ui.js");
  });

  it("adds heading anchors and on-this-page navigation for long page content", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/configuration",
          title: "Configuration",
          description: "",
          html: "<h1>Configuration</h1><h2>Theme</h2><p>Theme docs.</p><h2>OpenAPI Specs</h2><h3>Playground</h3>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain('<h2 id="theme">');
    expect(html).toContain('href="#theme"');
    expect(html).toContain('aria-label="Link to Theme"');
    expect(html).toContain('<h2 id="openapi-specs">');
    expect(html).toContain('<h3 id="playground">');
    expect(html).toContain('class="doc-on-this-page"');
    expect(html).toContain('aria-label="On this page"');
    expect(html).toContain('class="doc-page-toc"');
    expect(html).toContain('href="#openapi-specs"');
    expect(html).toContain(".doc-content :where(h2, h3) {");
  });

  it("adds copy actions for rendered code blocks only when code exists", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/quickstart",
          title: "Quickstart",
          description: "",
          html: '<h1>Quickstart</h1><pre><code class="language-sh">pnpm add documentee</code></pre>',
          markdown: "",
        },
        {
          kind: "page",
          route: "/plain",
          title: "Plain",
          description: "",
          html: "<h1>Plain</h1><p>No code here.</p>",
          markdown: "",
        },
      ],
    };

    const codeHtml = renderRoute(manifest, manifest.routes[0]);
    const plainHtml = renderRoute(manifest, manifest.routes[1]);

    expect(codeHtml).toContain('class="doc-code-copy"');
    expect(codeHtml).toContain('button type="button" class="doc-copy-button" data-copy-code');
    expect(codeHtml).toContain('data-documentee-copy');
    expect(codeHtml).toContain('navigator.clipboard.writeText');
    expect(plainHtml).not.toContain('data-documentee-copy');
  });

  it("renders breadcrumbs and previous-next navigation from configured navigation", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [
          { group: "Start", pages: ["docs/index", "docs/get-started/quickstart", "docs/configuration"] },
          { group: "Reference", pages: ["docs/api-reference/config"] },
        ],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        { kind: "page", route: "/", title: "Home", description: "", html: "<h1>Home</h1>", markdown: "" },
        { kind: "page", route: "/get-started/quickstart", title: "Quickstart", description: "", html: "<h1>Quickstart</h1>", markdown: "" },
        { kind: "page", route: "/configuration", title: "Configuration", description: "", html: "<h1>Configuration</h1>", markdown: "" },
        { kind: "page", route: "/api-reference/config", title: "Config Reference", description: "", html: "<h1>Config Reference</h1>", markdown: "" },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[1]);

    expect(html).toContain('class="doc-breadcrumbs"');
    expect(html).toContain('href="/">Home</a>');
    expect(html).toContain("<span>Start</span>");
    expect(html).toContain("<span>Quickstart</span>");
    expect(html).toContain('class="doc-page-nav"');
    expect(html).toContain('class="doc-page-nav-prev" href="/"');
    expect(html).toContain('class="doc-page-nav-next" href="/configuration/"');
  });

  it("deduplicates generated heading ids", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/reference",
          title: "Reference",
          description: "",
          html: "<h1>Reference</h1><h2>Parameters</h2><h2>Parameters</h2>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain('<h2 id="parameters">');
    expect(html).toContain('<h2 id="parameters-2">');
    expect(html).toContain('href="#parameters-2"');
  });

  it("writes sitemap, robots, and redirect artifacts", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "documentee-seo-"));
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", url: "https://docs.acme.test", description: "Docs" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: {
          twitterCard: "summary_large_image",
          sitemap: true,
          robots: { enabled: true, rules: [{ userAgent: "*", allow: "/" }] },
        },
        redirects: [{ from: "/old", to: "/quickstart", status: 301 }],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/quickstart",
          title: "Quickstart",
          description: "Start quickly.",
          seo: {},
          html: "<h1>Quickstart</h1>",
          markdown: "# Quickstart",
        },
      ],
    };

    await renderStaticSite(manifest, { outDir });

    expect(await readFile(join(outDir, "sitemap.xml"), "utf8")).toContain("https://docs.acme.test/quickstart/");
    expect(await readFile(join(outDir, "robots.txt"), "utf8")).toContain("Sitemap: https://docs.acme.test/sitemap.xml");
    expect(await readFile(join(outDir, "_redirects"), "utf8")).toBe("/old /quickstart 301\n");
    expect(await readFile(join(outDir, "vercel.json"), "utf8")).toContain('"source": "/old"');
    expect(await readFile(join(outDir, "old", "index.html"), "utf8")).toContain("Redirecting");
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
        seo: defaultSeo,
        redirects: [],
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
    expect(html).toContain('href="/schemas/core/Message/"');
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
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "schema",
          route: "/schemas/core/Message",
          title: "Schema: Message",
          description: "Shared schema reference.",
          html: "",
          markdown: "",
          schema: { name: "Message", specId: "core", route: "/schemas/core/Message" },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("Schema: Message");
    expect(html).toContain("Shared schema reference");
  });

  it("renders an API portal with spec summaries", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      versions: [
        { id: "v1", label: "Version 1", routePrefix: "/v1", default: false },
        { id: "v2", label: "Version 2", routePrefix: "/v2", default: true },
      ],
      operations: [],
      routes: [
        {
          kind: "api-portal",
          route: "/api-reference",
          title: "API Reference",
          description: "API reference portal.",
          html: "",
          markdown: "",
          apiPortal: {
            route: "/api-reference",
            title: "API Reference",
            specs: [
              {
                id: "core-v1",
                name: "Core API v1",
                version: { id: "v1", label: "Version 1", routePrefix: "/v1", default: false },
                operationCount: 2,
                firstOperationRoute: "/v1/api-reference/core/list-messages",
              },
              {
                id: "admin-v2",
                name: "Admin API v2",
                version: { id: "v2", label: "Version 2", routePrefix: "/v2", default: true },
                operationCount: 1,
                firstOperationRoute: "/v2/api-reference/admin/list-users",
              },
            ],
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("Core API v1");
    expect(html).toContain("Admin API v2");
    expect(html).toContain("Version 1");
    expect(html).toContain("2 operations");
    expect(html).toContain('class="api-portal-card"');
    expect(html).toContain('class="api-portal-card-meta"');
    expect(html).toContain('href="/v1/api-reference/core/list-messages/"');
  });

  it("renders a polished SwingSwap-shaped API reference", () => {
    const searchOperation: SiteManifest["operations"][number] = {
      specId: "core",
      method: "GET",
      path: "/products/search",
      slug: "get-products-search",
      route: "/api-reference/get-products-search",
      summary: "Search products",
      description: "Search products with various filters and pagination",
      tags: ["Products"],
      deprecated: false,
      beta: false,
      auth: [],
      parameters: [
        { name: "query", location: "query", required: false, description: "Search text.", schemaRef: undefined, schemaType: "string" },
        { name: "category", location: "query", required: false, description: "Category slug.", schemaRef: undefined, schemaType: "string" },
        { name: "condition", location: "query", required: false, description: "Product condition.", schemaRef: undefined, schemaType: "string", enumValues: ["new", "used"] },
        { name: "minPrice", location: "query", required: false, description: "Minimum price.", schemaRef: undefined, schemaType: "number" },
        { name: "maxPrice", location: "query", required: false, description: "Maximum price.", schemaRef: undefined, schemaType: "number" },
      ],
      responses: [{ status: "200", description: "Products found", mediaTypes: ["application/json"], schemaRefs: [] }],
      codeSamples: [],
    };
    const uploadOperation: SiteManifest["operations"][number] = {
      specId: "core",
      method: "POST",
      path: "/products/upload",
      slug: "post-products-upload",
      route: "/api-reference/post-products-upload",
      summary: "Create product with file upload",
      description: "Create a new product with image file uploads",
      tags: ["Products"],
      deprecated: false,
      beta: false,
      auth: ["bearerAuth"],
      parameters: [],
      requestBody: {
        required: true,
        mediaTypes: ["multipart/form-data"],
        schemaRefs: ["ProductUploadRequest"],
        fields: [
          { name: "images", required: true, description: "Product images.", schemaType: "array", schemaFormat: "binary" },
          { name: "title", required: true, description: "Product title.", schemaType: "string" },
          { name: "price", required: false, description: "Asking price.", schemaType: "number", schemaFormat: "float" },
        ],
      },
      responses: [
        { status: "201", description: "Product created with images", mediaTypes: ["application/json"], schemaRefs: [] },
        { status: "400", description: "Bad Request - Validation error", mediaTypes: ["application/json"], schemaRefs: ["ErrorResponse"] },
        { status: "401", description: "Unauthorized - Authentication required", mediaTypes: ["application/json"], schemaRefs: ["ErrorResponse"] },
      ],
      codeSamples: [],
      playground: {
        enabled: true,
        baseUrl: "http://localhost:3000/api",
        auth: "bearer",
        apiKeyLocation: "header",
      },
    };
    const productExtras: SiteManifest["operations"] = Array.from({ length: 11 }, (_, index) => ({
      specId: "core",
      method: "GET",
      path: `/products/${index + 1}`,
      slug: `get-products-${index + 1}`,
      route: `/api-reference/get-products-${index + 1}`,
      summary: `Product endpoint ${index + 1}`,
      tags: ["Products"],
      deprecated: false,
      beta: false,
      auth: [],
      parameters: [],
      responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: [] }],
      codeSamples: [],
    }));
    const otherOperations: SiteManifest["operations"] = [
      ["Health", "GET", "/health"],
      ["Authentication", "POST", "/auth/login"],
      ["Addresses", "GET", "/addresses"],
      ["Offers", "POST", "/offers"],
      ["Swaps", "POST", "/swaps"],
      ["Chats", "GET", "/chats/my"],
    ].map(([tag, method, path]) => ({
      specId: "core",
      method,
      path,
      slug: `${method.toLowerCase()}-${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`,
      route: `/api-reference/${method.toLowerCase()}-${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`,
      summary: `${tag} endpoint`,
      tags: [tag],
      deprecated: false,
      beta: false,
      auth: [],
      parameters: [],
      responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: [] }],
      codeSamples: [],
    }));
    const operations = [searchOperation, uploadOperation, ...productExtras, ...otherOperations];
    const routes: SiteManifest["routes"] = [
      {
        kind: "api-portal",
        route: "/api-reference",
        title: "API Reference",
        description: "API reference portal.",
        html: "",
        markdown: "",
        apiPortal: {
          route: "/api-reference",
          title: "API Reference",
          specs: [{ id: "core", name: "SwingSwap Backend API", operationCount: operations.length, firstOperationRoute: searchOperation.route }],
        },
      },
      ...operations.map((operation) => ({
        kind: "api-operation" as const,
        route: operation.route,
        title: `${operation.method} ${operation.path}`,
        description: operation.summary ?? "",
        html: "",
        markdown: "",
        operation,
      })),
    ];
    const manifest: SiteManifest = {
      config: {
        site: { name: "SwingSwap Backend API", description: "Comprehensive API for SwingSwap." },
        content: { directory: "docs" },
        navigation: [{ group: "API Reference", pages: [], openapi: "core" }],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { preset: "highContrast", primaryColor: "#2563eb", darkMode: true },
      },
      pages: [],
      operations,
      routes,
    };

    const uploadHtml = renderRoute(manifest, routes.find((route) => route.route === uploadOperation.route)!);
    const searchHtml = renderRoute(manifest, routes.find((route) => route.route === searchOperation.route)!);
    const portalHtml = renderRoute(manifest, routes[0]);

    expect(uploadHtml).toContain('class="nav-subgroup"');
    expect(uploadHtml).toContain('class="api-nav-filter"');
    expect(uploadHtml).toContain('data-api-nav-filter');
    expect(uploadHtml).toContain('data-documentee-api-nav-filter');
    expect(uploadHtml).toContain("Products");
    expect(uploadHtml).toContain("13 endpoints");
    expect(uploadHtml).toContain('class="api-hero method-post"');
    expect(uploadHtml).toContain('class="api-operation-frame"');
    expect(uploadHtml).toContain('class="api-operation-main"');
    expect(uploadHtml).toContain('class="api-operation-rail"');
    expect(uploadHtml).toContain('class="api-overview-grid"');
    expect(uploadHtml).toContain('class="api-overview-item"');
    expect(uploadHtml).toContain('class="skip-link" href="#main"');
    expect(uploadHtml).toContain('<main id="main" class="doc-main">');
    expect(uploadHtml).toContain(":focus-visible");
    expect(uploadHtml).toContain("@media (prefers-color-scheme: dark)");
    expect(uploadHtml).toContain(".doc-mobile-header");
    expect(uploadHtml).toContain(".doc-sidebar { display: none;");
    expect(uploadHtml).not.toContain('href="#operation"');
    expect(uploadHtml).not.toContain('href="#details"');
    expect(uploadHtml).toContain("<details");
    expect(uploadHtml).toContain("<summary");
    expect(uploadHtml).toContain('class="api-section-heading"');
    expect(uploadHtml).toContain('class="api-rail-card"');
    expect(uploadHtml).toContain('class="api-request-card api-panel-card"');
    expect(uploadHtml).toContain("<h1>Create product with file upload</h1>");
    expect(uploadHtml).toContain('class="api-endpoint-command"');
    expect(searchHtml).toContain('class="api-param-card"');
    expect(searchHtml).toContain("Product condition.");
    expect(searchHtml).toContain("new");
    expect(uploadHtml).toContain("Form fields");
    expect(uploadHtml).toContain("images");
    expect(uploadHtml).toContain("file[]");
    expect(uploadHtml).not.toContain("api-operation</span>");
    expect(uploadHtml).toContain('class="api-response-card api-status-4xx"');
    expect(uploadHtml).toContain("--doc-success");
    expect(uploadHtml).toContain("--doc-danger");
    expect(portalHtml).toContain('class="api-portal-tags"');
    expect(portalHtml).toContain('class="api-portal-card-head"');
    expect(portalHtml).toContain('class="api-portal-card-action"');
    expect(portalHtml).toContain("7 tags");
    expect(portalHtml).toContain("Products");
  });

  it("renders search page fallback and Pagefind UI assets only on the search route", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "pagefind" },
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
          markdown: "",
        },
        {
          kind: "page",
          route: "/search",
          title: "Search",
          description: "Search Acme documentation.",
          html: "",
          markdown: "",
        },
        {
          kind: "api-operation",
          route: "/api-reference/list-messages",
          title: "GET /messages",
          description: "List messages",
          html: "",
          markdown: "",
          operation: {
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
            responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: [] }],
            codeSamples: [],
          },
        },
      ],
    };

    const homeHtml = renderRoute(manifest, manifest.routes[0]);
    const searchHtml = renderRoute(manifest, manifest.routes[1]);

    expect(homeHtml).not.toContain("pagefind-ui.js");
    expect(searchHtml).toContain('id="search"');
    expect(searchHtml).toContain('class="search-fallback-list"');
    expect(searchHtml).toContain('href="/api-reference/list-messages/"');
    expect(searchHtml).toContain('/_pagefind/pagefind-ui.css');
    expect(searchHtml).toContain('/_pagefind/pagefind-ui.js');
    expect(searchHtml).toContain("<noscript>");
  });

  it("renders a search modal trigger with static suggestions on Pagefind-enabled pages", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "pagefind" },
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
          markdown: "",
        },
        {
          kind: "page",
          route: "/search",
          title: "Search",
          description: "Search Acme documentation.",
          html: "",
          markdown: "",
        },
        {
          kind: "api-operation",
          route: "/api-reference/search-products",
          title: "GET /products/search",
          description: "Search products",
          html: "",
          markdown: "",
          operation: {
            specId: "core",
            method: "GET",
            path: "/products/search",
            slug: "search-products",
            route: "/api-reference/search-products",
            summary: "Search products",
            tags: ["Products"],
            deprecated: false,
            beta: false,
            auth: [],
            parameters: [],
            responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: [] }],
            codeSamples: [],
          },
        },
      ],
    };

    const homeHtml = renderRoute(manifest, manifest.routes[0]);

    expect(homeHtml).toContain('data-search-open');
    expect(homeHtml).toContain('aria-controls="documentee-search-dialog"');
    expect(homeHtml).toContain('<dialog id="documentee-search-dialog"');
    expect(homeHtml).toContain('class="search-modal"');
    expect(homeHtml).toContain('class="search-suggestion-list"');
    expect(homeHtml).toContain('href="/api-reference/search-products/"');
    expect(homeHtml).toContain("Search products");
    expect(homeHtml).toContain('href="/search/"');
    expect(homeHtml).toContain("data-documentee-search-modal");
    expect(homeHtml).not.toContain("pagefind-ui.js");
  });

  it("renders a static version switcher when versions are configured", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      versions: [
        { id: "v1", label: "Version 1", routePrefix: "/v1", default: false },
        { id: "v2", label: "Version 2", routePrefix: "/v2", default: true },
      ],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("version-switcher");
    expect(html).toContain('href="/v1/"');
    expect(html).toContain('href="/v2/"');
    expect(html).toContain("Version 2");
  });

  it("includes default styles for richer MDX components", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/components",
          title: "Components",
          description: "",
          html: '<div class="doc-card-group"><article class="doc-card">Card</article></div>',
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain(".doc-card-group");
    expect(html).toContain(".doc-card-group-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }");
    expect(html).toContain(".doc-card-group-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }");
    expect(html).toContain(".doc-accordion");
    expect(html).toContain(".doc-field");
    expect(html).toContain(".doc-frame");
  });

  it("renders browser API playground UI and script for enabled operations", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "api-operation",
          route: "/api-reference/create-message",
          title: "POST /messages/{id}",
          description: "Create a message",
          html: "",
          markdown: "",
          operation: {
            specId: "core",
            method: "POST",
            path: "/messages/{id}",
            slug: "create-message",
            route: "/api-reference/create-message",
            summary: "Create a message",
            tags: ["Messages"],
            deprecated: false,
            beta: false,
            auth: ["bearerAuth"],
            parameters: [
              { name: "id", location: "path", required: true },
              { name: "preview", location: "query", required: false },
              { name: "x-trace-id", location: "header", required: false },
            ],
            requestBody: { required: true, mediaTypes: ["application/json"], schemaRefs: [] },
            responses: [{ status: "201", description: "Created", mediaTypes: ["application/json"], schemaRefs: [] }],
            codeSamples: [],
            playground: {
              enabled: true,
              baseUrl: "https://api.acme.test",
              auth: "bearer",
              apiKeyLocation: "header",
            },
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("Try It");
    expect(html).toContain("data-documentee-playground");
    expect(html).toContain('data-method="POST"');
    expect(html).toContain('data-path="/messages/{id}"');
    expect(html).toContain('name="id"');
    expect(html).toContain('name="preview"');
    expect(html).toContain('name="x-trace-id"');
    expect(html).toContain('name="documenteeAuth"');
    expect(html).toContain('name="mediaType"');
    expect(html).toContain('name="body"');
    expect(html).toContain("Browser requests depend on this API's CORS policy");
    expect(html).toContain('name="baseUrl" type="url"');
    expect(html).toContain(".api-playground input, .api-playground select, .api-playground textarea");
    expect(html).toContain("background: color-mix(in srgb, var(--doc-background) 92%, var(--doc-border));");
    expect(html).toContain(".api-playground button:hover");
    expect(html).toContain("<script>");
    expect(html).toContain("fetch");
  });

  it("omits browser API playground UI and script when disabled", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "api-operation",
          route: "/api-reference/list-messages",
          title: "GET /messages",
          description: "List messages",
          html: "",
          markdown: "",
          operation: {
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
            responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: [] }],
            codeSamples: [],
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).not.toContain("data-documentee-playground");
    expect(html).not.toContain("<script>");
  });
});
