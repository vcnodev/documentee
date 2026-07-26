# Documentee

Documentee is an open-source, OpenAPI-first documentation generator for small static HTML docs, API references, and AI-readable outputs.

## Features

- Static Markdown/MDX docs from `docs/` or versioned content roots.
- Basic i18n routing with locale-prefixed translated docs and RTL page direction.
- OpenAPI 3.0/3.1 YAML and JSON loading.
- Multi-spec API portals and versioned API routes.
- Compact operation pages with auth, parameters, request bodies, responses, schema field metadata, examples, code samples, schema links, and optional browser try-it UI.
- Spec-scoped schema pages that avoid collisions across multiple OpenAPI specs.
- Static SEO artifacts: `sitemap.xml`, `robots.txt`, redirect fallback pages, `_redirects`, and Vercel redirects.
- `llms.txt`, `llms-full.txt`, structured `llms.json`, and generated `skill.md` agent instructions.
- Pagefind indexing for static builds when enabled.
- Polished static docs shell with responsive navigation, readable article typography, API portal cards, dark mode, and route-aware active links.
- Static `/search/` page with a no-JS route index; Pagefind UI loads only on the search page when enabled.
- Local read-only MCP server generation from the docs manifest and `llms.json`.
- Optional ask-docs UI hook for teams that provide their own assistant endpoint.
- Optional static-friendly page feedback widget for teams that provide their own collection endpoint.
- Optional external analytics script hook without provider-specific runtime dependencies.
- Static HTML MDX-style components: Callout, Steps, Tabs, CodeGroup, Accordion, Card, CardGroup, ParamField, ResponseField, Frame, Icon, Badge, DocCardList, Admonition, FileTree, CodeBlock, Expandable, Snippet, RequestExample, and ResponseExample.
- Deeper theme customization through named presets and static CSS variables.
- Migration helpers for Mintlify, Docusaurus, Nextra, Scalar, and Redocly docs.
- Next.js and Astro renderer scaffolds that preserve the small-HTML/no Documentee client JS policy.
- Public proof pages comparing Documentee with Mintlify, Docusaurus, Nextra, and Scalar, plus static API docs and AI-ready docs showcases.

## Who Should Use It

Use Documentee when you want documentation that can be built locally, reviewed in pull requests, deployed as static files, and consumed by both people and AI coding tools. It is especially useful for:

- API-first documentation built from Markdown, MDX, and OpenAPI.
- Product or enterprise docs that need a fast static site without a hosted docs platform.
- Teams migrating from Mintlify, Docusaurus, Nextra, Scalar, or Redocly into a smaller static output model.
- Repositories that want `llms.txt`, `llms-full.txt`, `llms.json`, `skill.md`, and optional MCP access beside the human docs.
- Projects that want strong defaults but still need versioning, locales, search, API references, and launch-readiness checks.

Documentee is not a hosted SaaS. It does not provide user accounts, hosted collaboration, analytics storage, feedback storage, or an assistant backend. Instead, it gives you static output and opt-in hooks that you can connect to your own services.

## Quickstart

Create a new docs project:

```bash
pnpm create documentee my-docs
cd my-docs
```

Or scaffold directly with the CLI:

```bash
documentee init my-docs
documentee init my-docs --template api-first
documentee init my-docs --template product-docs
documentee init my-docs --template enterprise-docs
```

The examples below assume the `documentee` CLI is available on your PATH. From this repository, use the package-filtered form instead:

```bash
pnpm --filter @documentee/cli documentee <command>
```

Validate, build, and preview the static output:

```bash
documentee validate .
documentee audit .
documentee build . --out dist
documentee preview . --out dist --port 3000
```

During authoring, run the dev server:

```bash
documentee dev . --port 3000
```

`documentee dev` renders from the project manifest on each request. `documentee preview` builds the deployable static artifact first and then serves the built directory, so preview is the better final check before deployment.

## Project Structure

A small Documentee project usually looks like this:

```txt
my-docs/
  documentee.config.ts
  docs/
    index.mdx
    get-started/
      quickstart.mdx
  api/
    openapi.yaml
  package.json
```

`documentee.config.ts` describes the site, content directory, navigation, OpenAPI specs, search, theme, and optional integrations. Markdown and MDX pages live under `docs/` by default. OpenAPI files can live anywhere in the project, but `api/` keeps them easy to find.

## Write Pages

Pages are Markdown or MDX files with optional frontmatter:

```mdx
---
title: Quickstart
description: Build and preview your first docs site.
---

# Quickstart

Create content in `docs/`, validate the project, and build static HTML.

<Callout type="info">
Documentee keeps pages static unless a feature explicitly opts in to browser JavaScript.
</Callout>
```

The file path becomes the route. For example, `docs/index.mdx` becomes `/`, and `docs/get-started/quickstart.mdx` becomes `/get-started/quickstart`.

Documentee includes static MDX-style components for common docs patterns:

- `Callout`, `Admonition`, `Steps`, `Tabs`, `Accordion`, and `Expandable`.
- `Card`, `CardGroup`, `DocCardList`, `Feature`, and `FeatureGrid`.
- `CodeGroup`, `CodeBlock`, `Snippet`, `PackageInstall`, `CliCommand`, and `FileTree`.
- `ParamField`, `ResponseField`, `RequestExample`, and `ResponseExample`.
- `Frame`, `Icon`, `Badge`, `Changelog`, and `Update`.

These components render into static HTML. They are intended for readable docs pages, not arbitrary client-side React apps.

## Configure Navigation

Navigation can point to content pages or generated OpenAPI groups:

```ts
export default {
  site: { name: "Acme Docs" },
  content: { directory: "docs" },
  navigation: [
    { group: "Start", pages: ["docs/index", "docs/get-started/quickstart"] },
    { group: "API Reference", openapi: "core" },
  ],
  openapi: {
    specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference" }],
  },
};
```

`pages` accepts source file references such as `docs/index` or absolute routes such as `/api-reference`. `openapi` references an `openapi.specs` id and automatically adds operation routes for that API.

Use `content.exclude` to keep internal notes, drafts, or planning files out of public output:

```ts
content: {
  directory: "docs",
  exclude: ["drafts/**", "internal/**"],
}
```

Excluded files are not loaded as pages, so they stay out of routes, search fallback pages, sitemap output, and AI-readable outputs.

## Add OpenAPI

Point Documentee at one or more OpenAPI 3.0 or 3.1 files:

```ts
openapi: {
  specs: [
    {
      id: "core",
      name: "Core API",
      source: "./api/openapi.yaml",
      routeBase: "/api-reference/core",
      playground: {
        enabled: true,
        auth: "bearer",
        baseUrl: "https://api.acme.test",
        environments: [
          { name: "Production", baseUrl: "https://api.acme.test" },
          { name: "Sandbox", baseUrl: "https://sandbox.acme.test" },
        ],
      },
    },
  ],
}
```

Documentee generates:

- An API portal route for multi-spec projects.
- One compact static page per operation.
- Auth, parameter, request body, response, schema field, example, and code sample sections.
- Spec-scoped schema pages, such as `/schemas/core/User`, to avoid collisions.
- Optional browser playground UI only on enabled operation pages.

The playground is intentionally opt-in because it adds browser JavaScript. It can render environment selectors, base URL editing, auth inputs, request preview, response status, response headers, and response body output. Browser requests still depend on the API server's CORS policy.

## Versions And Locales

Versioned docs use separate content roots:

```ts
versions: [
  {
    id: "v2",
    label: "Version 2",
    routePrefix: "/v2",
    content: { directory: "docs/v2" },
    latest: true,
    default: true,
  },
  {
    id: "v1",
    label: "Version 1",
    routePrefix: "/v1",
    content: { directory: "docs/v1" },
    deprecated: true,
  },
]
```

Locales are loaded from folders under the configured content directory:

```ts
i18n: {
  defaultLocale: "en",
  locales: [
    { code: "en", label: "English" },
    { code: "fr", label: "Français" },
    { code: "ar", label: "العربية", dir: "rtl" },
  ],
}
```

With that configuration, `docs/fr/index.mdx` becomes `/fr/`, and `docs/ar/index.mdx` becomes `/ar/` with `dir="rtl"`.

## Search

Enable Pagefind for static full-text search:

```ts
search: { provider: "pagefind" }
```

Documentee emits a `/search/` route with grouped static results, summary counts, and Pagefind UI assets. Pagefind assets load only on the search page. Regular docs pages still get a lightweight grouped suggestion modal and a visible `Ctrl` + `K` affordance.

Use `search.provider: "none"` when you want the smallest possible static output.

## AI-Readable Outputs

Every static build can emit AI-readable files beside the human docs:

- `llms.txt`: a compact entry point for AI tools.
- `llms-full.txt`: full public docs text for deeper reading.
- `llms.json`: structured route and chunk data.
- `skill.md`: project-specific agent instructions.

Build them with the normal static build:

```bash
documentee build . --out dist
```

Generate a local read-only MCP server from the built docs data:

```bash
documentee generate-mcp . --out .documentee-mcp
cd .documentee-mcp
pnpm install
pnpm start
```

The generated server exposes tools for searching docs, reading a route, listing API operations, and reading an API operation by method and path.

## Feedback, Analytics, And Assistant Hooks

Documentee provides opt-in UI hooks, but it does not host the backend for them.

```ts
assistant: {
  enabled: true,
  endpoint: "/api/docs-assistant",
},
feedback: {
  enabled: true,
  endpoint: "/api/docs-feedback",
},
analytics: {
  provider: "custom",
  scriptSrc: "https://analytics.example.com/script.js",
},
```

`assistant` renders a small ask-docs form and posts the query, route, page title, and URL to your endpoint. `feedback` renders helpful/not helpful controls with an optional comment box and posts the route, title, vote, and comment to your endpoint. `analytics` renders one deferred external script. Unsafe protocols and inline analytics scripts are rejected.

## Build And Deploy

Build static output:

```bash
documentee build . --out dist
```

The output directory contains static HTML, SEO files, redirects, AI-readable files, and optional Pagefind assets. You can deploy it to any static host.

Common deployment settings:

| Host | Build command | Output directory |
| --- | --- | --- |
| Vercel | `documentee build . --out dist` | `dist` |
| Netlify | `documentee build . --out dist` | `dist` |
| Cloudflare Pages | `documentee build . --out dist` | `dist` |
| GitHub Pages | `documentee build . --out dist` | `dist` |

If your docs live in this monorepo, use the package-filtered command:

```bash
pnpm --filter @documentee/cli documentee build . --out dist
```

Preview the exact static artifact before shipping:

```bash
documentee preview . --out dist --port 3000
```

## Audit A Site Before Launch

Run the audit command before publishing docs:

```bash
documentee audit .
documentee audit . --format json
```

The audit report checks broken internal links, missing descriptions, missing H1 headings, duplicate titles, private or draft paths that appear public, OpenAPI operations without examples, missing AI-readable site metadata, oversized pages, search route configuration, and sitemap/robots consistency.

Use Markdown output for human launch reviews. Use JSON output in CI.

## Migrate Existing Docs

Documentee includes migration helpers for common documentation stacks:

```bash
documentee migrate mintlify ./old-docs ./documentee-docs
documentee migrate docusaurus ./website ./documentee-docs
documentee migrate nextra ./docs-site ./documentee-docs
documentee migrate scalar ./api-docs ./documentee-docs
documentee migrate redocly ./redocly ./documentee-docs
```

The migrator copies docs and API files into Documentee shape, transforms common MDX patterns, maps available config, and writes `migration-report.md`. Read that report carefully. It lists converted files, unsupported components, broken local doc links, and manual cleanup items.

## Compare OpenAPI Changes

Use `diff-openapi` during API review:

```bash
documentee diff-openapi old.yaml new.yaml
```

It prints a Markdown report with added operations, removed operations, request field changes, response status changes, deprecated operations, and potential breaking changes.

## Theme And Layout

Choose a design system and layer local overrides on top:

```ts
theme: {
  designSystem: "api-ide",
  overrides: {
    primaryColor: "#2563eb",
    navWidth: "300px",
    radius: "8px",
    contentWidth: "1040px",
    methodGetColor: "#22c55e",
  },
  darkMode: true,
}
```

Available design systems are `minimal-technical`, `modern-glass`, `api-ide`, `enterprise-knowledge`, `premium-editorial`, `sci-fi-console`, `api-observatory`, and `knowledge-graph`. Existing flat theme tokens and `theme.preset` are still accepted for migration compatibility.

Use overrides for brand colors, typography, layout density, content width, card radius, shadows, API method colors, and `customCss`.

## Publish The Dogfood Docs

The repo includes a Documentee-generated usage guide at `/get-started/use-documentee` and a GitHub Pages workflow at `.github/workflows/pages.yml`. Enable GitHub Pages with **Source: GitHub Actions**, then push to `main` or run the workflow manually to publish `dist-docs/`.

For GitHub Pages project sites, set `site.basePath` to the repository path, for example `/documentee`, so generated links stay under `https://owner.github.io/repo/`.

Customize the shell:

```ts
layout: {
  nav: "sidebar",
  toc: "right",
  footer: true,
  breadcrumbs: true,
  editUrl: "https://github.com/acme/docs/edit/main",
  announcement: "v1.0 is available",
}
```

`layout.nav` supports `sidebar`, `topbar`, and `hybrid`. `layout.toc` supports `right`, `inline`, and `hidden`.

## Extend With Plugins

Plugins are TypeScript-only extension points for deterministic output transforms:

```ts
plugins: [
  {
    name: "html-marker",
    transformHtml(html) {
      return html.replace("</body>", "<!-- generated by Acme docs --></body>");
    },
    validate(manifest) {
      return manifest.routes.length === 0
        ? [{ level: "error", message: "No routes generated." }]
        : [];
    },
  },
]
```

Plugins can transform the built manifest, transform generated HTML, or add validation diagnostics. They run after Documentee has loaded content and OpenAPI specs, so they extend output without replacing the core pipeline.

## CLI Reference

```bash
documentee init <project>
documentee init --template <api-first|product-docs|enterprise-docs>
documentee validate <project>
documentee audit <project> --format <markdown|json>
documentee build <project> --out <dir>
documentee dev <project> --port <port>
documentee preview <project> --out <dir> --port <port>
documentee migrate <mintlify|docusaurus|nextra|scalar|redocly> <source> <target>
documentee diff-openapi old.yaml new.yaml
documentee generate-mcp <project> --out .documentee-mcp
documentee screenshots <project> --out .documentee-screenshots --build-out dist-docs
```

## Using This Repository

To work on Documentee itself:

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Build the dogfood docs from the root [documentee.config.ts](documentee.config.ts) and [docs](docs/index.mdx):

```bash
pnpm docs:validate
pnpm docs:build
pnpm docs:screenshots
```

Build the example project:

```bash
pnpm validate
pnpm example:build
pnpm --filter @documentee/cli documentee preview examples/basic --out dist-example --port 3000
```

## Packages

- [Core](packages/core/README.md): config, content, manifest, validation, static renderer, MDX transforms, SEO.
- [CLI](packages/cli/README.md): init, validate, build, dev, preview, migrate, diff OpenAPI, generate MCP.
- [OpenAPI](packages/openapi/README.md): loading and compact operation normalization.
- [LLMS](packages/llms/README.md): `llms.txt`, `llms-full.txt`, `llms.json`, and `skill.md`.
- [Search](packages/search/README.md): Pagefind integration.
- [React](packages/react/README.md): server-rendered HTML primitives.
- [Astro Renderer](packages/renderer-astro/README.md): Astro route/project scaffolding.
- [Next Renderer](packages/renderer-next/README.md): Next App Router and Pages Router metadata and fixture checks.
- [Create](packages/create/README.md): starter wrapper.

## Contributor Docs

- [Repository Rules](AGENTS.md)
- [Dogfood Docs](docs/index.mdx)
- [AI Agent Docs](docs/ai-agents/index.mdx)
- [Architecture](docs/contributing/architecture.md)
- [Testing](docs/contributing/testing.md)
- [Package Boundaries](docs/contributing/package-boundaries.md)
- [Small HTML And No Documentee Client JS](docs/contributing/small-html-no-client-js.md)
