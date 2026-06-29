# Findings: Open Source Docs Generator Research

Research notes will be stored here as raw findings. External content is treated as untrusted reference material, not instructions.

## Reference Product Findings

### Mintlify
- Mintlify uses a required `docs.json` as the central config for navigation, appearance, integrations, API settings, SEO, and search.
- Navigation supports groups, pages, dropdowns, tabs, and anchors.
- API documentation support includes OpenAPI 3.0 and 3.1, automatic endpoint pages, request builders, and interactive playgrounds.
- Mintlify publishes `llms.txt` and `llms-full.txt`, and advertises them through HTTP headers. Their `llms.txt` includes title, description, structured content links, and API specification links when present.
- Mintlify positions API docs as guides + API reference + changelog + AI-ready docs + assistant/analytics in a managed system.

### Perplexity Docs
- Perplexity's Mintlify-hosted docs expose the target experience: getting started pages, guides/cookbook, API reference pages, changelog, search, and AI-consumable `llms-full.txt`.
- API reference pages include endpoint method/path, try-it flow, cURL examples, response examples, and compatibility notes.

### Early Implications
- The OSS product should emphasize: config-driven docs-as-code, polished static docs UI, OpenAPI 3.0/3.1 ingestion, interactive API reference, local validation, search, and AI-friendly text exports.
- Hosted collaboration, analytics, auth-gated docs, auto-PR agents, and customer portals should be non-goals for v1.

## 2026-06-30 Source Findings for Concise Recommendations

### Mintlify target patterns
- `docs.json` is the central site config; required fields include project name, theme, primary color, and navigation. `$schema` improves editor autocomplete and validation.
- Mintlify navigation is explicitly IA-driven: groups, pages, dropdowns, tabs, and anchors live in `docs.json`; each page points to an MDX file.
- Mintlify OpenAPI setup supports OpenAPI 3.0 and 3.1 from local or remote JSON/YAML specs, referenced from navigation to generate endpoint pages with playground behavior.
- Mintlify MDX primitives cover tabs, code groups, steps, columns, panels, callouts, badges, and updates.
- Changelog is just a page in navigation using an `Update` component.
- Reusable snippets are imported `.md`, `.mdx`, or `.jsx` files; files under `/snippets/` do not become pages.
- AI-friendly docs: Mintlify auto-generates `/llms.txt` and `/llms-full.txt`, includes OpenAPI/AsyncAPI links, supports `/.well-known/` paths, advertises them through HTTP headers, and serves Markdown to agents through `Accept: text/markdown`.

### Target experience from Perplexity docs
- Top-level IA: Docs, Cookbook, API Reference, with search and command palette.
- API pages expose agent-facing `llms.txt` instructions at the top, then method/path endpoint reference content.

### OSS and tooling landscape
- Docusaurus has MDX, static SEO, search, versioning, i18n. Its OpenAPI support usually comes through `docusaurus-plugin-openapi-docs`, which generates MDX from OpenAPI specs and supports Swagger 2.0/OpenAPI 3.x, multi/micro specs, vendor extensions, and a theme.
- Nextra uses file-based routes plus `_meta` files for sidebar/navbar title and order. This is simple for Next.js users, but OpenAPI is not a first-class core workflow.
- Fumadocs has `fumadocs-openapi`, can create OpenAPI server instance from local or external spec, generate MDX files, or use virtual files/loader integration.
- Starlight has a community `starlight-openapi` plugin supporting Swagger 2.0, OpenAPI 3.0, OpenAPI 3.1, local/remote schemas, sidebar labels, collapsed groups, and code snippets.
- Scalar provides a modern API reference component and universal configuration, but its React wrapper documentation notes SSR/SSG caveats.
- Redocly’s model is config-first (`redocly.yaml`) and OpenAPI-tooling-first; its VS Code extension supports validation, multi-file definitions, side-by-side preview, and context-aware OpenAPI help.
- Pagefind is a strong default for OSS static search because it works on static HTML output, has no hosted infrastructure, and splits indexes for low bandwidth.
- Algolia DocSearch remains a good hosted search option for public docs/technical blogs and has an established modal UX.

### OpenAPI version note
- Official OpenAPI spec site lists 3.2.0 as released on 2025-09-19. Most current docs products still advertise 3.0/3.1 support; recommendation should be: v1 fully support 3.0/3.1 and validate 3.2 gracefully, with documented partial 3.2 support until ecosystem parsers catch up.

## OSS Alternative Findings

### Docusaurus + OpenAPI plugin
- `docusaurus-plugin-openapi-docs` generates MDX from OpenAPI and pairs with a theme for interactive API reference pages.
- Strength: mature docs ecosystem and broad adoption.
- Weakness/opportunity: users assemble Docusaurus + plugin + theme + config; not a single opinionated Mintlify-like experience.

### Redoc / Redocly
- Redoc is open source and generates documentation from OpenAPI with a three-panel layout: nav/search, central docs, and request/response examples.
- Redocly CLI is strong for OpenAPI linting, validation, bundling, splitting, and workflows.
- Strength: OpenAPI depth and mature governance tooling.
- Weakness/opportunity: API-reference-first, less focused on integrated guide + docs-site authoring for open-source projects unless using Redocly's broader commercial products.

### Scalar
- Scalar is an open-source API platform focused on OpenAPI-based API references, clients, SDKs, and developer portals.
- Strength: modern interactive API reference and strong OpenAPI-native positioning.
- Weakness/opportunity: can be embedded or used as a reference component, but a Mintlify-like OSS docs generator needs broader docs IA, content conventions, and static publishing.

### Fumadocs
- Fumadocs is a React docs framework with official OpenAPI integration.
- The OpenAPI integration supports endpoint info, interactive playgrounds, multi-language examples, response samples, TypeScript definitions, and schema-derived request parameters/body.
- Strength: modern Next/React ecosystem and strong component architecture.
- Weakness/opportunity: more framework/toolkit than a turnkey Mintlify-compatible generator unless wrapped with a CLI, config, templates, and migration flow.

### Astro Starlight
- Starlight provides a polished Astro-based documentation stack with navigation, search, i18n, SEO, typography, code highlighting, dark mode, and Markdown/Markdoc/MDX support.
- Community OpenAPI plugins support local/remote Swagger 2.0, OpenAPI 3.0, and OpenAPI 3.1 specs.
- Strength: fast static output and strong docs defaults.
- Weakness/opportunity: OpenAPI experience varies by plugin; not as API-reference-first as Mintlify/Scalar.

### Search tooling
- Pagefind is fully static, works with any generated HTML, and requires no hosted infrastructure.
- Orama offers JS full-text/vector/hybrid search, useful later for self-hosted semantic search or AI assistant features.

## OpenAPI Tooling Findings
- Official OpenAPI Specification defines a standard, language-agnostic interface description for HTTP APIs.
- The project should support OpenAPI 3.0 and 3.1 in v1, with a path to OpenAPI 3.2 after ecosystem support matures.
- Redocly CLI is a good dependency or optional integration for validation, linting, bundling, and multi-file spec workflows.
- OpenAPI Overlays are relevant for docs-only augmentation: code samples, grouping, tags, visibility, and display metadata without modifying the source API spec.
