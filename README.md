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

## CLI

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
```

`documentee dev` renders routes from the manifest on each request. `documentee preview` first builds the static artifact, then serves the built directory so you can inspect the deployable output.

`documentee init` defaults to the API-first starter and also supports `--template api-first`, `--template product-docs`, and `--template enterprise-docs`. Use `documentee init --template product-docs` to scaffold in the current directory, or `documentee init my-docs --template enterprise-docs` to create a named project.

`documentee audit` produces a stable Markdown or JSON launch-readiness report for broken links, missing metadata, structure issues, OpenAPI examples, AI-readable metadata, page size, search routes, and sitemap/robots consistency.

Search stays static-first. With `search.provider: "pagefind"`, Documentee emits a `/search/` route with grouped static results, summary counts, and Pagefind UI assets loaded only on that route. Ordinary docs pages get a lightweight grouped suggestion modal with a visible `Ctrl` + `K` affordance.

`documentee generate-mcp` writes a deterministic local MCP server folder with `llms.json`, `server.mjs`, and package metadata. The generated server exposes read-only tools for searching docs, reading a route, listing API operations, and reading one API operation by method/path.

Theme presets are available as `theme.preset`: `neutral`, `mint`, `slate`, `highContrast`, `classic`, `terminal`, `startup`, `enterprise`, `api`, and `minimal`. Presets provide light and dark token defaults only; explicit custom tokens such as `primaryColor`, `navWidth`, `fontFamily`, and `customCss` override the preset.

## Quickstart

```bash
pnpm install
pnpm test
pnpm docs:validate
pnpm docs:build
pnpm --filter @documentee/cli documentee validate examples/basic
pnpm --filter @documentee/cli documentee build examples/basic --out dist-example
pnpm --filter @documentee/cli documentee preview examples/basic --out dist-example --port 3000
```

Documentee dogfoods itself from the root [documentee.config.ts](documentee.config.ts) and [docs](docs/index.mdx) directory. Run `pnpm docs:build` to build the project docs into `dist-docs`.

## Configuration

```ts
export default {
  site: {
    name: "Acme Docs",
    url: "https://docs.acme.test",
    description: "Developer documentation for the Acme API",
  },
  content: {
    directory: "docs",
    exclude: ["superpowers/**"],
  },
  versions: [
    { id: "v2", label: "Version 2", routePrefix: "/v2", content: { directory: "docs/v2" }, latest: true, default: true },
    { id: "v1", label: "Version 1", routePrefix: "/v1", content: { directory: "docs/v1", exclude: ["drafts/**"] }, deprecated: true },
  ],
  i18n: {
    defaultLocale: "en",
    locales: [
      { code: "en", label: "English" },
      { code: "fr", label: "Français" },
      { code: "ar", label: "العربية", dir: "rtl" },
    ],
  },
  navigation: [
    { group: "Get Started", pages: ["docs/index", "docs/get-started/quickstart"] },
    { group: "API Reference", openapi: "core" },
  ],
  openapi: {
    specs: [
      {
        id: "core",
        name: "Core API",
        source: "./api/openapi.yaml",
        routeBase: "/api-reference/core",
        version: "v2",
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
  },
  theme: {
    preset: "mint",
    primaryColor: "#2563eb",
    navWidth: "300px",
    radius: "8px",
    darkMode: true,
  },
  layout: {
    nav: "sidebar",
    toc: "right",
    footer: true,
    breadcrumbs: true,
    editUrl: "https://github.com/acme/docs/edit/main",
    announcement: "v1.0 is available",
  },
  search: { provider: "pagefind" },
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
};
```

`content.exclude` patterns are matched relative to the configured content directory. Excluded Markdown and MDX files are not loaded as pages, so they stay out of public routes, search fallback pages, sitemap output, and `llms.txt`/`llms-full.txt`/`llms.json`/`skill.md`.

`layout` accepts shell preferences for future-compatible docs builds. It defaults to sidebar navigation, a right-hand table of contents, footer enabled, and breadcrumbs enabled. `layout.nav` supports `sidebar`, `topbar`, or `hybrid`; `layout.toc` supports `right`, `inline`, or `hidden`. `editUrl` stores an edit-link base URL, and `announcement` stores a short site-wide announcement.

`i18n` keeps the default locale at existing routes by default and loads non-default locale content from folders such as `docs/fr` and `docs/ar`. RTL locales set `dir="rtl"` on generated pages and appear in the locale switcher.

`assistant` is opt-in. When `assistant.enabled` is true, Documentee renders a small ask-docs form that posts the query, current route, title, and URL to `assistant.endpoint`. Documentee does not implement the endpoint.

`feedback` is opt-in. When `feedback.enabled` is true, Documentee renders helpful/not helpful controls with an optional comment box and posts the route, title, vote, and comment to `feedback.endpoint`. Documentee does not implement or store feedback.

`analytics` is opt-in. When `analytics.provider` is `custom`, Documentee renders a single deferred external script from `analytics.scriptSrc`. Inline scripts and unsafe URL protocols are not accepted.

`plugins` is an optional TypeScript-only extension point for deterministic output transforms. Plugins can inspect or transform the built manifest, transform generated HTML, or return validation diagnostics. They run after Documentee has loaded content and OpenAPI specs, so plugins extend output without replacing the core content pipeline:

```ts
plugins: [
  {
    name: "html-marker",
    transformHtml(html) {
      return html.replace("</body>", "<!-- generated by Acme docs --></body>");
    },
  },
]
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
