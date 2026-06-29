# Documentee

Documentee is an open-source, OpenAPI-first documentation generator. This initial milestone provides a renderer-agnostic TypeScript core, a CLI, compact OpenAPI operation pages, static HTML output, and AI-readable `llms.txt` files.

## Current Milestone

Implemented:

- `documentee init`
- `documentee validate`
- `documentee build`
- `documentee dev`
- `documentee.config.ts` and `docs.json` config loading
- Markdown/MDX page discovery
- OpenAPI 3.x YAML/JSON loading
- compact API operation route generation with auth, parameters, request body, responses, and schema-reference links
- static HTML output
- Pagefind indexing for static builds when `search.provider` is `pagefind`
- `llms.txt` and `llms-full.txt`
- validation for duplicate routes, missing navigation targets, and broken internal links
- publishing-clean package exports that point at built `dist` files
- Astro renderer route scaffold
- React server-rendered HTML spike
- Next.js App Router and Pages Router adapter metadata spike with small HTML/no Documentee client JS checks

Planned next:

- richer MDX components
- browser API playground
- full Astro/Vite app renderer
- full Next.js integration from the current adapter spike

## Quickstart

```bash
pnpm install
pnpm test
pnpm --filter @documentee/cli documentee validate examples/basic
pnpm --filter @documentee/cli documentee build examples/basic --out dist-example
pnpm --filter @documentee/cli documentee dev examples/basic --port 3000
```

The build writes static files to `dist-example/`. With the example config, Pagefind artifacts are written to `dist-example/_pagefind/`.

## Project Shape

```text
packages/core             config, content, validation, route manifest, static renderer
packages/openapi          OpenAPI loading and operation normalization
packages/search           Pagefind indexing wrapper
packages/llms             llms.txt and llms-full.txt rendering
packages/cli              documentee init/validate/build/dev
packages/create           create-documentee wrapper
packages/renderer-astro   Astro route metadata scaffold
packages/react            server-rendered React HTML spike
packages/renderer-next    Next App Router and Pages Router adapter scaffold
examples/basic            small docs project fixture
```

## Design Notes

The core model is intentionally renderer-agnostic. Static HTML output, future Astro output, and future Next.js server-rendered HTML should all consume the same content graph, OpenAPI model, and route manifest.

For no-client-JS rendering, the goal is not to move large JavaScript bundles into large HTML payloads. The goal is small, route-split, server-rendered HTML with payload budgets for guide pages, API operation pages, schema pages, and search result pages.
