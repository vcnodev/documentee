# Documentee

Documentee is an open-source, OpenAPI-first documentation generator for small static HTML docs, API references, and AI-readable outputs.

## Features

- Static Markdown/MDX docs from `docs/` or versioned content roots.
- OpenAPI 3.0/3.1 YAML and JSON loading.
- Multi-spec API portals and versioned API routes.
- Compact operation pages with auth, parameters, request bodies, responses, code samples, schema links, and optional browser try-it UI.
- Spec-scoped schema pages that avoid collisions across multiple OpenAPI specs.
- Static SEO artifacts: `sitemap.xml`, `robots.txt`, redirect fallback pages, `_redirects`, and Vercel redirects.
- `llms.txt` and `llms-full.txt` generation.
- Pagefind indexing for static builds when enabled.
- Polished static docs shell with responsive navigation, readable article typography, API portal cards, dark mode, and route-aware active links.
- Static `/search/` page with a no-JS route index; Pagefind UI loads only on the search page when enabled.
- Static HTML MDX-style components: Callout, Steps, Tabs, CodeGroup, Accordion, Card, CardGroup, ParamField, ResponseField, Frame, Icon, Badge, DocCardList, Admonition, FileTree, CodeBlock, Expandable, Snippet, RequestExample, and ResponseExample.
- Deeper theme customization through named presets and static CSS variables.
- Migration helpers for Mintlify, Docusaurus, and Nextra docs.
- Next.js and Astro renderer scaffolds that preserve the small-HTML/no Documentee client JS policy.

## CLI

```bash
documentee init <project>
documentee validate <project>
documentee build <project> --out <dir>
documentee dev <project> --port <port>
documentee preview <project> --out <dir> --port <port>
documentee migrate <mintlify|docusaurus|nextra> <source> <target>
```

`documentee dev` renders routes from the manifest on each request. `documentee preview` first builds the static artifact, then serves the built directory so you can inspect the deployable output.

Search stays static-first. With `search.provider: "pagefind"`, Documentee emits a `/search/` route that includes a plain HTML index of generated pages and loads Pagefind UI assets only on that route.

Theme presets are available as `theme.preset`: `mint`, `slate`, `neutral`, and `highContrast`. Presets provide defaults only; explicit custom tokens such as `primaryColor`, `navWidth`, `fontFamily`, and `customCss` override the preset.

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
  content: { directory: "docs" },
  versions: [
    { id: "v1", label: "Version 1", routePrefix: "/v1", content: { directory: "docs/v1" } },
  ],
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
        version: "v1",
        playground: { enabled: true, auth: "bearer", baseUrl: "https://api.acme.test" },
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
  search: { provider: "pagefind" },
};
```

## Packages

- [Core](packages/core/README.md): config, content, manifest, validation, static renderer, MDX transforms, SEO.
- [CLI](packages/cli/README.md): init, validate, build, dev, preview, migrate.
- [OpenAPI](packages/openapi/README.md): loading and compact operation normalization.
- [LLMS](packages/llms/README.md): `llms.txt` and `llms-full.txt`.
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
