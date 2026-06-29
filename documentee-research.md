# Documentee Research: Open Source Mintlify-Like Docs Generator

Date: 2026-06-30  
Status: Research synthesis  
Goal: Define a complete product and technical picture for an open-source documentation generator similar to Mintlify's docs experience, with first-class OpenAPI support.

## 1. Executive Summary

Build Documentee as an open-source, static-first documentation generator for API and developer docs. The wedge should be:

> Mintlify-quality API docs you can self-host.

The product should not start as a hosted SaaS. V1 should focus on a polished local and static workflow:

- MDX/Markdown docs-as-code.
- A central config file for site, navigation, theme, search, redirects, and API specs.
- First-class OpenAPI 3.0 and 3.1 support from local or remote specs.
- Generated API reference pages with endpoint details, request/response examples, auth, schemas, and optional browser "try it" behavior.
- Local preview, static build, Pagefind search, sitemap, redirects, and AI-friendly `llms.txt` / `llms-full.txt`.
- A default theme that looks production-grade without user design work.

The gap is real. Existing open-source tools solve pieces: Docusaurus is broad, Redoc/Redocly and Scalar are OpenAPI-heavy, Fumadocs and Starlight are modern docs frameworks, and Pagefind solves static search. The opportunity is a cohesive, opinionated, open-source product where a user can drop in MDX plus OpenAPI and get a Mintlify-like site without assembling five tools.

## 2. Product Thesis

API teams want excellent developer docs, but current open-source paths are fragmented:

- Docusaurus is powerful, but a polished API-docs experience requires plugins, themes, and configuration glue.
- Redoc and Scalar are strong API reference layers, but not complete guide + API reference + changelog + docs site systems by themselves.
- Fumadocs and Starlight are strong frameworks, but the user still needs to productize the workflow.
- Mintlify is polished and ergonomic, but is primarily a hosted/commercial platform.

Documentee should win by being:

- Open source first.
- Static deploy friendly.
- OpenAPI native.
- Mintlify-compatible where reasonable.
- Opinionated enough to work immediately.
- Extensible enough to grow into a hosted product later.

## 3. Primary Personas

| Persona | Need | What makes them adopt |
|---|---|---|
| API startup founder or founding engineer | Beautiful docs quickly without SaaS lock-in | `npx create-documentee`, paste OpenAPI, deploy static site |
| Developer experience engineer | Reliable docs pipeline with OpenAPI validation, preview, search, deploy | Strong CLI, CI checks, config schema, deterministic builds |
| Technical writer at dev-tooling company | Author guides and API docs together | MDX components, navigation control, changelog, reusable snippets |
| Open-source maintainer | Hosted-quality docs for a public project | Free static hosting, low maintenance, attractive defaults |

## 4. V1 Product Scope

V1 should include:

- CLI commands: `init`, `dev`, `build`, `preview`, `validate`, `openapi bundle`.
- MDX and Markdown content pages.
- Central config: `documentee.config.ts` as the typed primary format, plus a `docs.json` subset for Mintlify-like compatibility.
- Navigation model with groups, pages, tabs, anchors, external links, and OpenAPI-generated sections.
- OpenAPI 3.0 and 3.1 ingestion from local files or remote URLs.
- Generated API reference pages grouped by tag or custom docs metadata.
- Operation pages with method/path, summary, description, auth, parameters, request body, responses, examples, schemas, and code samples.
- Optional static browser "try it" flow, with clear CORS/auth limitations.
- Built-in MDX components: callouts, cards, tabs, steps, code groups, accordions, endpoint cards, request examples, response examples, schema viewer, changelog entry.
- Pagefind static search.
- Sitemap, robots.txt, redirects, canonical URLs, and SEO metadata.
- `llms.txt` and `llms-full.txt` generation.
- Light/dark mode.
- CSS variable theming.
- Static output deployable to Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3/R2, or any static host.
- Starter templates for API docs, SDK docs, and platform docs.
- GitHub Action template for validation and build checks.

## 5. V1 Non-Goals

Do not include these in V1:

- Hosted publishing platform.
- Team accounts, roles, approvals, comments, or web editor.
- Private docs authentication.
- Analytics dashboard.
- AI assistant, AI search, or automatic docs update agent.
- SDK generation.
- Mock server.
- AsyncAPI, GraphQL, or gRPC support.
- Full arbitrary theme replacement API.
- Large plugin marketplace.

These can come later, but putting them in V1 would blur the product and slow the core wedge.

## 5A. Extended Goal: React And Next.js No-JS HTML Mode

Add an extended goal after the static generator is credible:

> Basic React authoring support plus a Next.js renderer that can serve server-rendered HTML through both App Router and Pages Router, with no Documentee JavaScript shipped to the client.

This should be treated as a deliberate renderer mode, not as a replacement for the static-first V1.

### Why This Matters

Some teams will want Documentee inside an existing React or Next.js application rather than as a standalone generated site. The useful version of that support is not a hydrated SPA. It is a server-rendered docs surface that can live inside an application shell while preserving the performance, accessibility, and crawlability benefits of plain HTML.

The main problem to solve is not only removing JavaScript. It is preventing the no-JS mode from sending huge HTML documents. API docs can become extremely large when every parameter, nested schema, response example, enum, and code sample is expanded into server-rendered markup. A no-JS renderer must therefore optimize HTML size as deliberately as a JS renderer optimizes bundle size.

### Desired Capabilities

- Author content and theme extensions using basic React components.
- Render docs pages through a Next.js App Router integration using Server Components by default.
- Render docs pages through a Next.js Pages Router integration using server-side rendering.
- Serve HTML on request for teams that need runtime-aware docs, multi-tenant docs, auth-adjacent shells, or app-level routing.
- Ship no Documentee client-side JavaScript in this mode.
- Use plain anchors, forms, and server-rendered UI for navigation and interactions.
- Provide server-rendered fallbacks for search and API reference pages.
- Disable or replace client-only features such as browser "try it", client search modals, animated tabs, and client-side navigation.
- Split large API references into many small HTML routes instead of rendering large all-in-one reference pages.
- Keep schemas, examples, and related operations linkable across routes instead of duplicating large chunks of markup.

### Constraints

- No `use client` components in the App Router integration.
- No hooks, event handlers, browser APIs, or client-only UI primitives in no-JS mode.
- No `next/link` behavior should be required for core docs navigation; plain anchors must work.
- No client-side search index hydration. Search should be static HTML, server-rendered, or disabled.
- No browser request playground in strict no-JS mode; API examples remain copyable text.
- Build and test output must verify the emitted pages do not include Documentee client bundles.
- Build and test output must enforce HTML size budgets for representative docs and OpenAPI fixtures.
- API operation pages must not inline the full global schema graph by default.
- Repeated examples, auth docs, error models, and shared schemas should render once and be linked, not duplicated across every endpoint page.

### Recommended Package Additions

| Package | Responsibility |
|---|---|
| `@documentee/react` | Server-renderable React components for docs, API pages, and MDX primitives |
| `@documentee/renderer-next` | Next.js App Router and Pages Router adapters |
| `@documentee/no-js` | Shared constraints, test helpers, and runtime guards for the no-client-JS profile |

### Feasibility Note

Next.js officially supports both App Router and Pages Router. App Router Server Components render on the server and do not add component code to the client bundle. Pages Router supports request-time SSR with `getServerSideProps`. However, a strict "no JS on client" guarantee is stronger than ordinary SSR. It must be validated against real emitted HTML and scripts, because framework runtime behavior, routing helpers, and interactive components can reintroduce client JavaScript.

It must also be validated against HTML payload size. A no-JS output can still be slow if the server returns 500 KB or several MB of markup for a single API page. The right target is not "move everything from JS into HTML"; it is "serve small, complete HTML pages with stable links between detailed resources."

The safest product language is:

- "No Documentee client JavaScript" for the first milestone.
- "Small HTML, no Documentee client JavaScript" for the practical product promise.
- "Strict no-client-JS output" as a measured compatibility target after proof-of-concept validation.

## 6. Success Metrics

| Goal | Metric | Target |
|---|---|---|
| Fast activation | Time from install to working site | Under 10 minutes for one OpenAPI file and one MDX page |
| OpenAPI quality | Valid OpenAPI 3.0/3.1 specs that build successfully in benchmark suite | 95%+ |
| Developer experience | Local preview startup | Under 2 seconds for small docs, under 6 seconds for large specs |
| Community adoption | GitHub stars | 1,000 within 6 months |
| Real usage | Public sites using Documentee | 100 within 6 months |
| Contribution signal | External contributors | 25 within 6 months |

## 7. Recommended Information Architecture

Use this default top-level docs structure:

```text
Get Started
Guides
Cookbook
API Reference
Changelog
```

Recommended purpose:

| Section | Purpose |
|---|---|
| Get Started | Installation, first request, authentication, environments |
| Guides | Conceptual workflows and integration paths |
| Cookbook | Task recipes with copy-pasteable examples |
| API Reference | Generated from OpenAPI, grouped by tag/resource |
| Changelog | Dated entries, breaking-change labels, migration links |

Generated API reference pages should stay separate from hand-authored guide pages. However, MDX guides should be able to embed endpoint cards, request examples, response examples, and schemas from the OpenAPI source.

## 8. Suggested Project File Conventions

Starter docs project:

```text
my-docs/
  documentee.config.ts
  docs.json
  docs/
    get-started/
      quickstart.mdx
      authentication.mdx
    guides/
      streaming.mdx
      rate-limits.mdx
    cookbook/
      chat-completions.mdx
    changelog/
      2026-06-30-launch.mdx
  api/
    openapi.yaml
  snippets/
    auth-header.mdx
  public/
    logo.svg
    favicon.svg
```

Rules:

- MDX files own prose.
- OpenAPI owns endpoint truth.
- Files under `snippets/` are importable partials and never become pages.
- Changelog entries can be dated MDX files or MDX components.
- Every page should have `title` and `description`.
- Optional frontmatter: `tags`, `status`, `owner`, `llms`, `sidebarTitle`, `hidden`, `canonical`.

## 9. Config Model

Prefer typed config as the stable primary API:

```ts
import { defineConfig } from "documentee";

export default defineConfig({
  site: {
    name: "Acme Docs",
    url: "https://docs.acme.com",
    description: "Developer documentation for the Acme API",
    logo: "/logo.svg",
  },
  content: {
    directory: "docs",
  },
  navigation: [
    {
      group: "Get Started",
      pages: [
        "docs/get-started/quickstart",
        "docs/get-started/authentication",
      ],
    },
    {
      group: "Guides",
      pages: ["docs/guides/streaming", "docs/guides/rate-limits"],
    },
    {
      group: "API Reference",
      openapi: "core",
    },
    {
      group: "Changelog",
      pages: ["docs/changelog"],
    },
  ],
  openapi: {
    specs: [
      {
        id: "core",
        name: "Core API",
        source: "./api/openapi.yaml",
        routeBase: "/api-reference",
      },
    ],
  },
  search: {
    provider: "pagefind",
  },
  theme: {
    primaryColor: "#2563eb",
    darkMode: true,
  },
});
```

Also support a `docs.json` subset for users migrating from Mintlify-style config:

```json
{
  "$schema": "https://documentee.dev/schema.json",
  "name": "Acme Docs",
  "theme": "default",
  "colors": {
    "primary": "#2563eb"
  },
  "navigation": [
    { "group": "Get Started", "pages": ["docs/get-started/quickstart"] },
    { "group": "API Reference", "openapi": "core" }
  ],
  "openapi": {
    "specs": [
      {
        "id": "core",
        "source": "./api/openapi.yaml",
        "routeBase": "/api-reference"
      }
    ]
  }
}
```

The project should publish a JSON schema so editors provide autocomplete and validation.

## 10. OpenAPI Support

OpenAPI should be first-class content, not a side widget.

V1 support:

- OpenAPI 3.0 and 3.1 fully.
- OpenAPI 3.2 graceful validation warnings until ecosystem parser support is broad.
- Local YAML/JSON files.
- Remote URL specs with local dev cache.
- Multi-file specs with `$ref`.
- Bundled publishable artifacts under `/openapi/<id>.json`.
- Multiple specs per site.
- Tag-based grouping.
- Custom grouping through vendor extensions.
- Stable route generation from `operationId`, method, and path.

Recommended operation page sections:

- Endpoint title.
- Method and path.
- Summary and description.
- Auth requirements.
- Path/query/header/cookie parameters.
- Request body.
- Response examples.
- Error responses.
- Schema viewer.
- Code samples.
- Optional browser request playground.
- Deprecated, beta, or hidden badges.

Recommended vendor extensions:

```yaml
x-docs-group: "Chat"
x-sidebar-order: 10
x-hideTryIt: false
x-beta: true
x-codeSamples:
  - lang: curl
    source: |
      curl https://api.acme.com/v1/messages
```

`operationId` should be strongly recommended and optionally required in strict mode.

## 11. Recommended Architecture

Build a modular TypeScript monorepo.

Recommended stack:

- Runtime/build: Node.js.
- Static site engine: Astro + Vite.
- Extended renderer: React server-rendered components plus Next.js App Router and Pages Router adapters.
- Content: Markdown + MDX.
- Validation: Zod or equivalent schema validation.
- OpenAPI processing: Redocly-style bundling/linting concepts, with a Documentee-owned normalized operation model.
- Search: Pagefind for production, lightweight in-memory search for dev.
- Package manager: pnpm.
- Monorepo orchestration: Turborepo or pnpm workspaces alone for V1.
- Tests: Vitest, Playwright for rendered UI, fixture-based OpenAPI tests.

Package boundaries:

| Package | Responsibility |
|---|---|
| `@documentee/cli` | CLI commands, diagnostics, command orchestration |
| `@documentee/core` | Config loading, normalized site model, content graph, nav graph, plugin runner |
| `@documentee/renderer-astro` | Astro/Vite integration, virtual routes, dev server, static build |
| `@documentee/renderer-next` | Extended Next.js App Router and Pages Router SSR adapters |
| `@documentee/react` | Server-renderable React components and MDX primitives |
| `@documentee/theme-default` | Layouts, MDX components, API page components, CSS tokens |
| `@documentee/openapi` | Spec loading, bundling, validation, operation extraction, schema model |
| `@documentee/search` | Pagefind integration and dev search fallback |
| `@documentee/llms` | `llms.txt` and `llms-full.txt` generation |
| `@documentee/create` | Project scaffolding |
| `@documentee/plugin-*` | Official plugins for sitemap, redirects, Algolia, analytics later |

Important boundary:

`@documentee/core` should not depend on Astro or UI. It should produce a normalized site model and route manifest. The renderer consumes that manifest.

The React and Next.js packages should also consume the same normalized site model. They must not fork the content, navigation, or OpenAPI pipeline. The renderer layer changes how pages are served; it should not change what a page means.

## 12. Rendering Pipeline

Build pipeline:

1. Load `documentee.config.ts` or `docs.json`.
2. Validate config and normalize into an internal typed model.
3. Discover `docs/**/*.{md,mdx}` plus assets.
4. Parse frontmatter, headings, slugs, table of contents, links, and metadata.
5. Load OpenAPI specs from local files or remote URLs.
6. Cache remote specs in dev.
7. Bundle external `$ref`s.
8. Validate OpenAPI and produce actionable diagnostics.
9. Normalize specs into operations, schemas, tags, auth, examples, and route metadata.
10. Generate route manifest:
    - authored docs pages
    - generated API overview pages
    - generated endpoint pages
    - changelog pages
    - static assets
    - redirects
    - sitemap entries
    - `llms.txt` and `llms-full.txt`
11. Render static HTML through Astro/Vite.
12. Post-process:
    - Pagefind index
    - sitemap
    - robots.txt
    - redirect artifacts
    - bundled OpenAPI JSON
    - optional link check
13. Emit deploy-ready `dist/`.

Extended Next.js SSR pipeline:

1. Load and normalize the same Documentee config.
2. Build the same content graph, OpenAPI model, and route manifest.
3. Expose route handlers or page components for App Router and Pages Router.
4. Render docs pages on the server from `@documentee/react` components.
5. In no-JS mode, use only server-renderable components and plain HTML interactions.
6. Replace client-side features with server-rendered alternatives:
   - plain sidebar navigation instead of client-side navigation
   - server-rendered search results or no search modal
   - static code/request examples instead of browser "try it"
   - CSS-only tabs/details where possible
7. Apply HTML-size controls:
   - one operation per endpoint route
   - separate schema detail routes for large or shared models
   - separate example routes for very large request/response examples
   - server-rendered search result pages instead of embedding a full index
   - configurable truncation for deeply nested schemas with links to full schema views
8. Verify generated responses and build artifacts for both client JavaScript regressions and HTML payload regressions.

## 13. Search Strategy

Default to Pagefind for production static search.

Why:

- Works on generated static HTML.
- No hosted infrastructure.
- Good fit for open-source docs.
- Low operational burden.

Search indexing rules:

- Index page title, description, headings, and body text.
- For API pages, index method, path, operation summary, description, tags, and selected schema names.
- Do not index entire deeply nested schemas by default. It can bloat the index.
- Provide an Algolia DocSearch plugin later for large public docs.
- Consider Orama later for self-hosted semantic/hybrid search.

## 14. Theme And UI Scope

V1 should ship a strong default theme, not a theme framework.

Theme controls:

- Logo.
- Favicon.
- Primary/accent colors.
- Light/dark mode.
- Font family tokens.
- Custom CSS file.
- Header links.
- Sidebar grouping.
- API method colors.

Core UI surfaces:

- Top nav.
- Sidebar.
- Content area.
- Right-side table of contents.
- Search modal.
- API endpoint page.
- Changelog page.
- Mobile navigation.

MDX components:

- `Callout`
- `Card`
- `CardGrid`
- `Tabs`
- `Steps`
- `CodeGroup`
- `Accordion`
- `EndpointCard`
- `ParamTable`
- `RequestExample`
- `ResponseExample`
- `SchemaViewer`
- `ChangelogEntry`

Avoid full arbitrary theme replacement in V1. Offer CSS variables and stable component primitives first.

## 15. CLI Commands

Recommended commands:

```bash
documentee init
documentee dev
documentee build
documentee preview
documentee validate
documentee openapi bundle
documentee migrate mintlify
documentee migrate docusaurus
```

V1 command behavior:

| Command | Behavior |
|---|---|
| `init` | Create starter project |
| `dev` | Run local preview, watch config/content/OpenAPI, show diagnostics |
| `build` | Produce static `dist/` and fail on invalid required inputs |
| `preview` | Serve built output locally |
| `validate` | Validate config, links, MDX frontmatter, OpenAPI, duplicate routes |
| `openapi bundle` | Bundle and emit normalized OpenAPI artifact |
| `migrate mintlify` | Best-effort conversion of `docs.json` and MDX pages |
| `migrate docusaurus` | Best-effort import from docs/sidebar structure |

Migration commands can be beta after the core commands work.

## 16. Starter Templates

Ship three starter templates:

### SaaS API

Includes:

- Quickstart.
- Authentication.
- API reference from OpenAPI.
- Errors.
- Pagination.
- Rate limits.
- Webhooks guide.
- Changelog.
- Working sample requests.

### SDK Docs

Includes:

- Install.
- Client setup.
- Common examples.
- API methods.
- Migration guide.
- Release notes.

### Platform Docs

Includes:

- Concepts.
- Tutorials.
- Recipes.
- Reference.
- Troubleshooting.
- Release notes.

Every starter should include:

- Valid OpenAPI sample.
- `llms.txt` / `llms-full.txt`.
- Search enabled.
- Redirect example.
- GitHub Actions validation workflow.
- Deployment notes for Vercel, Netlify, Cloudflare Pages, GitHub Pages.

## 17. Migration Paths

### From Mintlify

Support:

- Read `docs.json`.
- Preserve MDX pages.
- Convert common navigation groups.
- Map OpenAPI config into Documentee config.
- Preserve snippets where possible.
- Map common MDX components to Documentee equivalents.
- Preserve `llms.txt` / `llms-full.txt` behavior conceptually.

Not all Mintlify features should be copied. Hosted analytics, AI assistant, team workflows, and managed integrations are outside v1.

### From Docusaurus

Support:

- Import docs folder.
- Convert sidebar config to Documentee navigation.
- Preserve MDX where possible.
- Replace OpenAPI plugin-generated pages with native generated reference pages.
- Convert frontmatter fields where possible.

### From Nextra

Support:

- Convert file routes and `_meta` files into central navigation.
- Preserve MDX.
- Replace theme-specific components with Documentee components.

## 18. Testing And Quality Strategy

Test by layer:

| Layer | Test Type |
|---|---|
| Config schema | Unit tests with valid/invalid config fixtures |
| Content graph | Markdown/MDX fixture tests |
| OpenAPI parser | Fixture suite covering 3.0, 3.1, `$ref`, auth, examples, oneOf/allOf/anyOf, discriminators, circular refs |
| Route manifest | Snapshot tests for generated routes |
| CLI | Integration tests using temporary projects |
| Build output | Static build smoke tests |
| UI | Playwright tests for docs pages, search, mobile nav, API pages |
| Next.js no-JS mode | App Router and Pages Router fixture apps that assert no Documentee client bundles are emitted and HTML payloads stay within route-level budgets |
| Search | Pagefind index smoke tests |
| Migration | Golden-file tests for Mintlify/Docusaurus/Nextra samples |

The OpenAPI fixture suite is the most important technical risk reducer.

## 19. Risks And Mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| OpenAPI 3.1 complexity | JSON Schema alignment, refs, cycles, unions, discriminators are hard | Build fixture suite early; use proven bundling and validation |
| API reference scope creep | Can become SDK generation, mocks, Postman replacement, governance platform | V1 is docs rendering, examples, validation, and optional try-it only |
| Static try-it limitations | Browser CORS and auth can look like product bugs | Clear UX, no secret storage, optional disabled mode |
| Search bloat | Large schemas can make search slow | Index operation-level content first; schema indexing opt-in |
| Theme API lock-in | Early APIs can freeze bad internals | CSS variables and limited slots first |
| Plugin instability | Too many hooks create compatibility debt | Start with few hooks and versioned data objects |
| MDX security | MDX executes code at build time | Treat local docs as trusted project code; do not execute remote MDX |
| Framework coupling | Astro dependency could constrain future choices | Keep core renderer-agnostic |
| Next.js no-JS guarantee | Ordinary SSR can still emit framework or component scripts | Start with "no Documentee client JavaScript"; add fixture tests that inspect HTML and emitted assets |
| No-JS HTML bloat | Removing client JS can push too much content into large HTML responses, especially API schemas and examples | Route-split aggressively; enforce HTML payload budgets; link to schema/example detail routes instead of inlining everything |
| Mintlify comparison trap | Users may expect full hosted platform | Position clearly as OSS static generator first |

## 20. Roadmap

### Phase 0: Validation

- Interview 10 API/docs teams.
- Test migration from one Mintlify-like docs tree.
- Test migration from one Docusaurus + OpenAPI plugin project.
- Define OpenAPI benchmark fixtures.
- Build visual reference board for docs UI and API pages.

### Phase 1: OSS Core

- Monorepo setup.
- CLI: `init`, `dev`, `build`, `preview`, `validate`.
- Config schema.
- MDX content graph.
- Default theme.
- Navigation.
- Static build.
- Pagefind search.

### Phase 2: OpenAPI Native

- OpenAPI 3.0/3.1 loader.
- Bundling and validation.
- Operation normalization.
- Generated endpoint pages.
- Request/response examples.
- Schema viewer.
- Optional browser try-it.
- Bundled `/openapi/<id>.json` artifacts.

### Phase 3: Publishing Polish

- Sitemap.
- Redirects.
- Robots.
- SEO metadata.
- `llms.txt` and `llms-full.txt`.
- Changelog primitives.
- GitHub Action template.
- Deployment templates.

### Phase 4: Migration And Ecosystem

- `migrate mintlify`.
- `migrate docusaurus`.
- `migrate nextra`.
- Official plugins.
- Versioned docs.
- Multi-spec portals.
- Better code sample controls.

### Phase 4A: React And Next.js SSR HTML Mode

- `@documentee/react` server-renderable component primitives.
- `@documentee/renderer-next` App Router adapter.
- `@documentee/renderer-next` Pages Router adapter.
- Small-HTML, no-Documentee-client-JS rendering profile.
- Server-rendered or disabled alternatives for search and API playground features.
- Route splitting for operations, schemas, large examples, changelog archives, and search results.
- Test harness that checks rendered HTML and emitted assets for client JavaScript regressions and HTML payload regressions.

### Phase 5: Optional Commercial Layer

Only after OSS adoption:

- Hosted deploys.
- Preview environments.
- Team workflows.
- Private docs/auth.
- Analytics.
- AI search/assistant.
- Docs quality monitoring.

## 21. Recommended Build Order

1. Create monorepo and package boundaries.
2. Implement config loading and validation.
3. Implement content discovery and route manifest for MDX pages.
4. Implement Astro renderer and default theme.
5. Implement CLI dev/build/preview.
6. Add Pagefind post-build indexing.
7. Add OpenAPI loader, bundler, validation, and fixture suite.
8. Generate API reference routes.
9. Build endpoint page UI.
10. Add `llms.txt`, sitemap, redirects, and robots.
11. Add starter templates.
12. Add migration utilities.
13. Prototype `@documentee/react` and `@documentee/renderer-next` after the core model is stable.
14. Add no-JS fixture tests before advertising strict Next.js compatibility.

Do not start with a hosted dashboard. The fastest path to a credible project is a local CLI that produces a beautiful static site.

## 22. Open Source Strategy

Recommended license:

- Apache 2.0 if patent protection matters.
- MIT if maximum simplicity and adoption matter.

Recommended default: Apache 2.0 for a developer platform that may later have commercial adoption.

Repository should include:

- Clear README with a 5-minute quickstart.
- Screenshot or GIF of generated docs.
- Example docs project.
- Contributor guide.
- Code of conduct.
- Issue templates.
- Roadmap.
- Architecture notes.
- Fixture-based test docs.

Commercial strategy later:

- Keep the core docs generator open.
- Charge for hosted deploys, previews, team workflow, analytics, private docs, and AI search.
- Avoid gating the core OpenAPI reference renderer in a paid tier. That is the adoption wedge.

## 23. Initial PRD Draft

### Problem

Developer teams want polished API documentation like Mintlify, but the open-source path requires combining multiple tools and maintaining glue code. This slows teams down and creates inconsistent docs quality.

### Hypothesis

If Documentee provides an open-source, static docs generator with MDX authoring and first-class OpenAPI pages, API teams will adopt it as a self-hosted Mintlify alternative.

### V1 User Story

As an API-first developer, I want to run one command, point the project at my OpenAPI spec, write MDX guides, and deploy a searchable static docs site, so that users can understand and use my API without me buying or operating a docs platform.

### Acceptance Criteria

- User can initialize a docs site from a template.
- User can run local preview.
- User can configure navigation.
- User can add MDX pages.
- User can point to an OpenAPI 3.0 or 3.1 spec.
- Build generates API reference pages.
- Build generates search index.
- Build generates `llms.txt` and `llms-full.txt`.
- Build emits static files.
- Invalid config or invalid OpenAPI fails with actionable diagnostics.

## 24. Open Questions

- Should `docs.json` be first-class or only a migration-compatible subset?
- Should the default OpenAPI UI be fully custom, or should Scalar be embedded for V1 and replaced later?
- Should `try it` be enabled by default, or opt-in because of CORS/auth issues?
- Should versioned docs be V1.5 or V2?
- Should OpenAPI 3.2 be parsed experimentally in V1 or only warned about?
- Should `documentee.config.ts` allow arbitrary JS plugins in V1, or should plugins wait until the internal model stabilizes?
- For the extended Next.js renderer, is "no Documentee client JavaScript" sufficient, or does the project need a hard guarantee that no framework/client scripts are emitted at all?
- Should the Next.js integration prioritize App Router first, with Pages Router as compatibility, or build both adapters together?
- Which interactive docs features should be disabled in strict no-JS mode versus reimplemented with server-rendered fallbacks?
- What are the default HTML size budgets for guide pages, operation pages, schema pages, and search result pages?
- Which OpenAPI details should be inline by default, and which should move to linked detail routes when they exceed size thresholds?

## 25. Recommendation

Proceed with Documentee as an open-source static docs generator, not a hosted SaaS.

Use Astro/Vite for the static renderer, TypeScript for the toolchain, MDX for authoring, Pagefind for search, and a first-party OpenAPI pipeline for generated API reference pages. Keep the architecture modular so the renderer can change later, but optimize V1 for a fast, polished, shippable developer experience.

Treat React and Next.js support as an extended renderer goal. The core model should be renderer-agnostic enough that Astro static output and Next.js server-rendered HTML both consume the same content graph, OpenAPI model, and route manifest. The Next.js goal is not simply "HTML instead of JavaScript"; it is small, route-split, server-rendered HTML with no Documentee client JavaScript.

The core promise should be:

> Drop in docs plus OpenAPI. Get a beautiful, searchable, AI-readable, deploy-anywhere developer docs site.

## 26. Sources Reviewed

- [Mintlify](https://www.mintlify.com/)
- [Mintlify Docs](https://mintlify.com/docs)
- [Mintlify API Reference Docs](https://www.mintlify.com/docs/api-reference/introduction)
- [Mintlify `docs.json` / Global Settings](https://www.mintlify.com/docs/settings/global)
- [Mintlify `llms.txt`](https://www.mintlify.com/docs/ai/llmstxt)
- [Perplexity Docs](https://docs.perplexity.ai/docs/getting-started/overview)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [OpenAPI 3.1.1 Specification](https://spec.openapis.org/oas/v3.1.1.html)
- [Docusaurus](https://docusaurus.io/docs)
- [Docusaurus OpenAPI Docs Plugin](https://github.com/PaloAltoNetworks/docusaurus-openapi-docs)
- [Redocly CLI](https://redocly.com/docs/cli)
- [Redoc](https://redocly.com/docs/redoc)
- [Scalar](https://github.com/scalar/scalar)
- [Scalar API Reference Docs](https://guides.scalar.com/scalar/scalar-api-references/integrations/react)
- [Fumadocs](https://fumadocs.dev/docs)
- [Fumadocs OpenAPI](https://fumadocs.dev/docs/openapi)
- [Astro Starlight](https://starlight.astro.build/)
- [Starlight OpenAPI](https://starlight-openapi.vercel.app/)
- [Nextra](https://nextra.site/docs)
- [Pagefind](https://pagefind.app/docs/)
- [Algolia DocSearch](https://docsearch.algolia.com/)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js App Router and Pages Router Docs](https://nextjs.org/docs)
- [Next.js `getServerSideProps`](https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props)
