# Competitive Platform Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Documentee competitive with Mintlify, Docusaurus, Nextra, Scalar, and adjacent docs platforms by improving first-impression UI quality, API reference depth, AI-agent outputs, framework maturity, migration paths, and launch proof.

**Architecture:** Preserve Documentee's strongest differentiator: static-first output from a shared manifest, with no Documentee client JavaScript unless a feature explicitly opts in. Keep ownership boundaries intact: `packages/core` owns config, manifest, static rendering, validation, SEO, MDX transforms, and docs shell; `packages/openapi` owns OpenAPI loading and compact normalization; `packages/cli` owns commands and migration helpers; `packages/llms` owns AI-readable text outputs; `packages/search` owns Pagefind integration; renderer packages consume the shared manifest.

**Tech Stack:** TypeScript, Vitest, static HTML/CSS, Pagefind, OpenAPI 3.0/3.1, Node CLI, optional tiny client scripts for search/playground/feedback/assistant features.

---

## Strategic Positioning

Documentee should not try to become a managed Mintlify clone. The winning lane is:

> Static-first, OpenAPI-first, AI-agent-ready docs that stay tiny, local, portable, and easy for humans and coding agents to maintain.

This roadmap targets parity where it matters and differentiation where Documentee can win:

- Beat basic Docusaurus/Nextra defaults on static output, AI-readable artifacts, and OpenAPI-first setup.
- Approach Mintlify polish for docs shell, API guides, search, AI outputs, and migration ergonomics.
- Challenge Scalar for static API reference quality, while keeping broader docs-site features.
- Avoid hosted-only features until the open-source foundation is excellent.

## Baseline Problems To Fix First

- The dogfood homepage cards currently break visually because linked cards contain headings, then heading anchors are injected inside those headings. This creates invalid nested anchors and fragmented card boxes.
- Dogfood docs currently expose `docs/superpowers/**` plan/spec pages in generated routes and search. This weakens launch polish unless intentional.
- The visual system is clean but generic. It lacks the first-viewport confidence of Mintlify, polished Nextra sites, and modern API platforms.
- API operation pages are promising but need richer examples, schema exploration, code samples, auth handling, and stronger playground design.
- AI-readable output exists, but the product should graduate from `llms.txt` files to a full agent-consumption layer.

## Milestone Order

1. First-impression repair and visual QA.
2. Premium docs shell and theme system.
3. API reference excellence.
4. AI-native documentation layer.
5. Framework maturity: i18n, versioning depth, plugins, content boundaries.
6. Migration and adoption tooling.
7. Feedback, analytics, quality audits, and launch proof.

Each milestone is independently shippable and should end with full verification:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm docs:validate
pnpm validate
pnpm docs:build
rm -rf dist-example && pnpm example:build
```

---

## File Structure

### Core Rendering And Config

- Modify `packages/core/src/static-renderer.ts`: docs shell, visual system, cards, TOC, search modal, API reference pages, feedback widgets, generated scripts, CSS variables.
- Modify `packages/core/src/config.ts`: theme presets, layout options, content visibility, i18n, feedback, AI, plugin hooks.
- Modify `packages/core/src/manifest.ts`: route metadata, generated search/AI/audit routes, locale/version route expansion.
- Modify `packages/core/src/content.ts`: content filtering, public/private route metadata, last-updated data, edit links.
- Modify `packages/core/src/mdx-components.ts`: richer static MDX primitives and framework compatibility transforms.
- Modify `packages/core/src/validation.ts`: config, content, OpenAPI, i18n, visibility, plugin, and quality validation.
- Modify `packages/core/test/*.test.ts`: focused unit and renderer tests for every behavior change.

### OpenAPI

- Modify `packages/openapi/src/types.ts`: richer compact schema, examples, auth, server, diff, SDK/code sample metadata.
- Modify `packages/openapi/src/normalize.ts`: extract schema composition, examples, request/response bodies, servers, auth variants, tags, deprecations.
- Modify `packages/openapi/src/loader.ts`: external `$ref` resolution, bundling, remote source handling if introduced.
- Modify `packages/openapi/test/*.test.ts`: fixture-driven OpenAPI 3.0/3.1 coverage.

### CLI

- Modify `packages/cli/src/index.ts`: route new commands.
- Modify `packages/cli/src/commands/build.ts`: extra artifacts, content visibility, i18n builds, audit reports.
- Modify `packages/cli/src/commands/validate.ts`: quality/audit checks.
- Modify `packages/cli/src/commands/migrate.ts`: richer migrations from Mintlify, Docusaurus, Nextra, Scalar/Redocly.
- Create `packages/cli/src/commands/audit.ts`: docs quality and launch readiness report.
- Create `packages/cli/src/commands/diff-openapi.ts`: OpenAPI version diff report.
- Create `packages/cli/src/commands/generate-mcp.ts`: local MCP/search server scaffolding.
- Create `packages/cli/src/commands/screenshots.ts`: visual screenshot audit command if browser tooling is acceptable.
- Modify/create `packages/cli/test/*.test.ts`: command coverage.

### AI And Search

- Modify `packages/llms/src/render.ts`: `llms.json`, route chunks, summaries, structured citations, agent instructions.
- Modify `packages/search/src/pagefind.ts`: route visibility filtering and search metadata.
- Create `packages/llms/src/chunks.ts`: reusable agent chunk model if complexity grows.
- Create `packages/llms/test/*.test.ts`: AI output coverage.

### Renderer Packages

- Modify `packages/react/src/render.ts`: consume richer manifest without adding client JavaScript.
- Modify `packages/renderer-next/src/*`: fixtures and adapters for new manifest output.
- Modify `packages/renderer-astro/src/*`: route/project generation for locales, versions, static assets.

### Docs And Examples

- Modify `README.md`: positioning, comparison, commands, config examples.
- Modify `docs/index.mdx`: polished dogfood homepage.
- Modify `docs/api-reference/*.mdx`: API feature docs.
- Modify `docs/ai-agents/*.mdx`: agent outputs, MCP, `llms.json`, `skill.md`.
- Modify `docs/contributing/*.md`: architecture and testing updates.
- Modify `examples/basic/*`: showcase theme, API reference, playground, search, AI outputs.
- Create `examples/realistic-api/*`: larger realistic OpenAPI portal fixture.
- Create `examples/marketing-docs/*`: non-API docs site proving general docs quality.
- Create `examples/enterprise-docs/*`: versioned/i18n/private-content scenario if added.

---

## Milestone 1: First-Impression Repair And Visual QA

**Outcome:** A new user opening the dogfood docs sees a coherent, polished site with no broken cards, no accidental internal planning pages, and stable desktop/mobile layouts.

### Task 1.1: Fix Linked Card Heading Anchors

**Files:**
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/src/mdx-components.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `packages/core/test/mdx-components.test.ts`

- [ ] Add failing renderer coverage for a linked `CardGroup`.

Expected HTML should not contain nested anchors:

```ts
expect(html).toContain('class="doc-card" href="/get-started/quickstart"');
expect(html).toContain("<h3>Quickstart</h3>");
expect(html).not.toContain('<a class="doc-heading-anchor" href="#quickstart"');
expect(html).not.toContain('<a class="doc-card" href="/get-started/quickstart"><span');
```

- [ ] Run focused tests and confirm failure:

```bash
pnpm --filter @documentee/core test -- static-renderer.test.ts mdx-components.test.ts
```

- [ ] Update `enhanceContentHeadings` so it only anchors top-level article headings, not headings inside `.doc-card`, `.api-portal-card`, `.search-fallback-list`, `.doc-page-nav`, or other linked/card UI.

Implementation direction:

```ts
function enhanceContentHeadings(html: string): { html: string; headings: TocHeading[] } {
  const protectedBlocks: string[] = [];
  const protectedHtml = html.replace(
    /<(a|article|section)([^>]*class="[^"]*(?:doc-card|api-portal-card|search-fallback-list|doc-page-nav)[^"]*"[^>]*)>[\s\S]*?<\/\1>/g,
    (block) => {
      const token = `<!--documentee-protected-${protectedBlocks.length}-->`;
      protectedBlocks.push(block);
      return token;
    },
  );

  const enhanced = protectedHtml.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, ...);

  return {
    html: enhanced.replace(/<!--documentee-protected-(\d+)-->/g, (_match, index) => protectedBlocks[Number(index)] ?? ""),
    headings,
  };
}
```

The final implementation may use smaller helpers, but it must preserve headings inside linked cards without injecting heading links.

- [ ] Run focused tests and confirm green.
- [ ] Rebuild dogfood docs and visually inspect `/` at desktop and mobile widths.

```bash
pnpm docs:build
```

Acceptance:

- Homepage cards render as four coherent cards.
- Mobile card layout is one card per row.
- TOC does not include card titles unless that is intentionally configured.

### Task 1.2: Add Content Visibility Controls

**Files:**
- Modify `packages/core/src/config.ts`
- Modify `packages/core/src/content.ts`
- Modify `packages/core/src/manifest.ts`
- Modify `packages/core/src/seo.ts`
- Modify `packages/core/test/config.test.ts`
- Modify `packages/core/test/content.test.ts`
- Modify `packages/core/test/manifest.test.ts`
- Modify `packages/core/test/seo.test.ts`
- Modify `documentee.config.ts`
- Modify `README.md`
- Modify `docs/contributing/architecture.md`

- [ ] Add failing tests for excluding `docs/superpowers/**` from generated public routes, search, sitemap, and AI-readable output.

Config shape:

```ts
content: {
  directory: "docs",
  exclude: ["superpowers/**"],
}
```

Expected assertions:

```ts
expect(manifest.routes.some((route) => route.route.includes("/superpowers/"))).toBe(false);
expect(renderSitemapXml(manifest)).not.toContain("/superpowers/");
expect(renderLlmsFull(manifest)).not.toContain("superpowers");
```

- [ ] Implement `content.exclude` using glob-compatible matching relative to the content directory.
- [ ] Add `robots`, `sitemap`, `search`, and `llms` filtering tests.
- [ ] Update dogfood config to exclude internal planning/spec pages unless a page is intentionally linked in public docs.
- [ ] Update README with an example and explain that excluded content is not built.

Acceptance:

- Dogfood generated docs no longer expose internal planning pages.
- Search suggestions no longer show internal planning/spec documents.
- `llms-full.txt` stays public-content-only.

### Task 1.3: Create Visual Smoke Test Harness

**Files:**
- Create `packages/core/test/visual-smoke.test.ts` or `packages/cli/test/screenshots.test.ts`
- Create `packages/cli/src/commands/screenshots.ts` if exposed as CLI
- Modify `package.json` if adding a script
- Modify `docs/contributing/testing.md`

- [ ] Add a focused test or script that builds `dist-docs` and captures key pages at desktop/mobile widths using local Chrome when available.
- [ ] Check minimum visual invariants through DOM/CSS assertions:

```ts
expect(await page.locator(".doc-card").count()).toBeGreaterThanOrEqual(4);
expect(await page.locator(".doc-card h3").first().isVisible()).toBe(true);
expect(await page.locator(".doc-mobile-header").isVisible()).toBe(true);
```

- [ ] Save screenshots to a generated ignored directory such as `.documentee-screenshots/`.
- [ ] Do not make full screenshot comparison required in CI until the environment is stable; start with an opt-in command.

Acceptance:

- Developers can run one command to visually inspect dogfood and example docs.
- The command catches broken card rendering and missing mobile navigation.

---

## Milestone 2: Premium Docs Shell And Theme System

**Outcome:** Documentee's default docs shell feels intentionally designed, not merely functional.

### Task 2.1: Define Layout Config

**Files:**
- Modify `packages/core/src/config.ts`
- Modify `packages/core/test/config.test.ts`
- Modify `docs/api-reference/config.mdx`
- Modify `README.md`

- [ ] Add config tests for:

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

- [ ] Supported values:

```ts
type NavLayout = "sidebar" | "topbar" | "hybrid";
type TocLayout = "right" | "inline" | "hidden";
```

- [ ] Implement parsing with safe defaults:

```ts
layout: {
  nav: "sidebar",
  toc: "right",
  footer: true,
  breadcrumbs: true,
}
```

- [ ] Document the config.

Acceptance:

- Existing configs keep working.
- Invalid layout values fail validation clearly.

### Task 2.2: Improve Default Visual System

**Files:**
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `docs/index.mdx`
- Modify `examples/basic/docs/index.mdx`

- [ ] Add tests asserting shell landmarks and key classes:

```ts
expect(html).toContain('class="doc-app-shell"');
expect(html).toContain('class="doc-sidebar"');
expect(html).toContain('class="doc-content-frame"');
expect(html).toContain('class="doc-footer"');
```

- [ ] Refine CSS:
  - Better page background and content surface contrast.
  - More deliberate heading scale.
  - Larger first paragraph only on page intros.
  - Better card hover state.
  - Code block title/copy layout.
  - Footer with edit link, last updated, previous/next.
  - Active TOC highlight if static-only feasible through CSS or minimal opt-in script.

- [ ] Keep small HTML policy intact. Any script must be tied to a feature flag.

Acceptance:

- Dogfood home, config article, search page, and API page look cohesive.
- Mobile has no overlap or clipped text.
- Lighthouse/accessibility smoke pass should not reveal missing landmarks or focus traps.

### Task 2.3: Expand Theme Presets

**Files:**
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/src/config.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `packages/core/test/config.test.ts`
- Modify `README.md`
- Modify `packages/core/README.md`
- Modify `docs/api-reference/config.mdx`

- [ ] Add presets:

```ts
type ThemePreset =
  | "neutral"
  | "mint"
  | "slate"
  | "highContrast"
  | "classic"
  | "terminal"
  | "startup"
  | "enterprise"
  | "api"
  | "minimal";
```

- [ ] Add snapshot-style CSS variable assertions for each preset.
- [ ] Ensure explicit custom tokens override preset tokens.
- [ ] Add real dark-mode variables for each preset where `darkMode: true`.

Acceptance:

- Example docs can showcase multiple visually distinct themes.
- No preset is a one-note blue/slate/purple wash.

### Task 2.4: Polish Search UX

**Files:**
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `packages/search/src/pagefind.ts`
- Modify `packages/search/test/pagefind.test.ts`

- [ ] Improve static search route layout.
- [ ] Improve modal suggestion grouping:
  - Pages
  - API endpoints
  - Guides
  - Recent/featured docs if configured
- [ ] Add keyboard affordance display without relying on keyboard-only interaction.
- [ ] Ensure Pagefind assets still only load on `/search/`.

Acceptance:

- Search feels like a core product surface, not a fallback list.
- Ordinary pages stay small.

---

## Milestone 3: API Reference Excellence

**Outcome:** Generated API docs are rich enough to compete with managed API documentation tools for static use cases.

### Task 3.1: Normalize Rich Schema Metadata

**Files:**
- Modify `packages/openapi/src/types.ts`
- Modify `packages/openapi/src/normalize.ts`
- Modify `packages/openapi/test/normalize.test.ts`

- [ ] Add tests for:
  - Object fields.
  - Nested object fields.
  - Arrays and array item refs.
  - Enums.
  - Nullable values.
  - Deprecated fields.
  - `oneOf`, `anyOf`, `allOf`.
  - Example values.
  - Request body examples.
  - Response examples.

Expected compact metadata:

```ts
expect(operation.requestBody?.fields).toContainEqual({
  name: "status",
  required: true,
  description: "Current message status.",
  schemaType: "string",
  enumValues: ["queued", "sent", "failed"],
  deprecated: false,
});
```

- [ ] Keep normalized output compact. Do not embed entire schema graphs into every operation.

Acceptance:

- Renderer can show useful schema details without needing raw OpenAPI internals.

### Task 3.2: Add Schema Explorer UI

**Files:**
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `docs/api-reference/openapi.mdx`

- [ ] Render object schemas as expandable static sections using `<details>`.
- [ ] Show field name, required state, type, enum, default, deprecated, nullable, and description.
- [ ] Link schema refs to generated schema pages.
- [ ] Render composition with clear labels:
  - One of
  - Any of
  - All of

Acceptance:

- Schema pages are useful by themselves.
- Operation pages show enough schema detail for common requests/responses.

### Task 3.3: Add Code Samples

**Files:**
- Modify `packages/openapi/src/types.ts`
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `docs/api-reference/openapi.mdx`

- [ ] Generate static examples for:
  - cURL
  - JavaScript `fetch`
  - Python `requests`
  - Go `net/http`

Example assertion:

```ts
expect(html).toContain("curl");
expect(html).toContain("fetch(");
expect(html).toContain("requests.get");
expect(html).toContain("http.NewRequest");
```

- [ ] Add `CodeGroup`-style static tabs. Since static HTML cannot switch tabs without JS, render examples stacked or use `<details>` sections unless a tiny opt-in tab script is accepted.

Acceptance:

- Every operation page has copyable examples when enough metadata exists.
- Examples include auth header and request body when applicable.

### Task 3.4: Improve API Playground

**Files:**
- Modify `packages/core/src/playground.ts`
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/test/playground.test.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `examples/basic/documentee.config.ts`

- [ ] Add server selector when OpenAPI servers are present.
- [ ] Add environment presets:

```ts
playground: {
  enabled: true,
  environments: [
    { name: "Production", baseUrl: "https://api.acme.test" },
    { name: "Sandbox", baseUrl: "https://sandbox.acme.test" },
  ],
}
```

- [ ] Add request preview before send.
- [ ] Add response headers/status display.
- [ ] Add clear error states for CORS/network/auth failures.
- [ ] Keep secrets out of storage.

Acceptance:

- Playground feels credible for real API users.
- No secrets are persisted.
- Non-playground pages do not load playground JavaScript.

### Task 3.5: Add OpenAPI Diff Command

**Files:**
- Create `packages/cli/src/commands/diff-openapi.ts`
- Modify `packages/cli/src/index.ts`
- Create `packages/cli/test/diff-openapi.test.ts`
- Modify `docs/api-reference/cli.mdx`

- [ ] Compare two OpenAPI files and report:
  - Added operations.
  - Removed operations.
  - Changed request fields.
  - Changed response statuses.
  - Deprecated operations.
  - Potential breaking changes.

CLI:

```bash
documentee diff-openapi old.yaml new.yaml
```

Acceptance:

- Command produces a stable Markdown or terminal report.
- Breaking changes are clearly marked.

---

## Milestone 4: AI-Native Documentation Layer

**Outcome:** Documentee becomes one of the best open-source docs tools for AI agents, not just human readers.

### Task 4.1: Add `llms.json`

**Files:**
- Modify `packages/llms/src/render.ts`
- Create `packages/llms/src/types.ts`
- Modify `packages/llms/test/render.test.ts`
- Modify `packages/core/src/static-renderer.ts` or build pipeline where assets are written
- Modify `docs/ai-agents/index.mdx`

- [ ] Add structured output:

```json
{
  "site": {
    "name": "Documentee",
    "url": "https://documentee.dev"
  },
  "routes": [
    {
      "route": "/api-reference/config/",
      "title": "Config Reference",
      "description": "Field-by-field reference...",
      "contentType": "guide",
      "source": "docs/api-reference/config.mdx",
      "chunks": []
    }
  ]
}
```

- [ ] Include API operations as structured route entries.
- [ ] Exclude private/hidden content.
- [ ] Add tests ensuring `docs/superpowers/**` is excluded when configured.

Acceptance:

- `llms.json` is machine-readable and stable.
- `llms.txt` and `llms-full.txt` remain available.

### Task 4.2: Add Agent Chunk Index

**Files:**
- Create `packages/llms/src/chunks.ts`
- Modify `packages/llms/src/render.ts`
- Modify `packages/llms/test/render.test.ts`

- [ ] Split pages into semantic chunks:
  - Heading path.
  - Source route.
  - Source file.
  - Text.
  - Links.
  - API operation metadata if applicable.

Expected test:

```ts
expect(index.chunks[0]).toMatchObject({
  route: "/get-started/quickstart/",
  headingPath: ["Install", "Build"],
  source: "docs/get-started/quickstart.mdx",
});
```

Acceptance:

- Agent tools can retrieve focused chunks instead of entire pages.

### Task 4.3: Generate MCP Search Server

**Files:**
- Create `packages/cli/src/commands/generate-mcp.ts`
- Create `packages/cli/test/generate-mcp.test.ts`
- Modify `packages/cli/src/index.ts`
- Modify `docs/ai-agents/index.mdx`
- Modify `README.md`

- [ ] Add command:

```bash
documentee generate-mcp . --out .documentee-mcp
```

- [ ] Generated server should expose read-only tools:
  - `search_docs(query)`
  - `read_doc(route)`
  - `list_api_operations()`
  - `read_api_operation(method, path)`

- [ ] Generate from built manifest and AI chunk index.
- [ ] Keep implementation local and self-hosted.

Acceptance:

- Developers can connect an AI coding tool to current local docs.
- Generated MCP output is deterministic and testable.

### Task 4.4: Generate Agent Instructions

**Files:**
- Create `packages/llms/src/skill.ts`
- Modify `packages/llms/test/render.test.ts`
- Modify build pipeline to emit `skill.md`
- Modify `docs/ai-agents/doc-builder-guide.mdx`

- [ ] Generate `skill.md` containing:
  - Project overview.
  - Reading order.
  - Important routes.
  - CLI verification commands.
  - Content contribution rules.

Acceptance:

- A coding agent can start from generated `skill.md` and understand how to use the docs.

### Task 4.5: Optional Ask Docs UI

**Files:**
- Modify `packages/core/src/config.ts`
- Modify `packages/core/src/static-renderer.ts`
- Create `packages/core/src/assistant.ts` if needed
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `docs/api-reference/config.mdx`

- [ ] Add opt-in config only. Do not make this default:

```ts
assistant: {
  enabled: true,
  endpoint: "/api/docs-assistant",
}
```

- [ ] Render a small assistant/search entry that sends query plus route context to the configured endpoint.
- [ ] Keep no endpoint implementation in core.

Acceptance:

- Hosted/self-hosted users can wire an assistant.
- Static-only users are unaffected.

---

## Milestone 5: Framework Maturity

**Outcome:** Documentee has enough platform completeness that users can choose it instead of Docusaurus/Nextra for serious docs sites.

### Task 5.1: Add i18n And RTL Support

**Files:**
- Modify `packages/core/src/config.ts`
- Modify `packages/core/src/content.ts`
- Modify `packages/core/src/manifest.ts`
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/test/config.test.ts`
- Modify `packages/core/test/manifest.test.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `docs/api-reference/config.mdx`
- Modify `README.md`

- [ ] Config:

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

- [ ] Generate locale-prefixed routes except default locale unless configured otherwise.
- [ ] Add locale switcher.
- [ ] Set `<html lang>` and `dir`.
- [ ] Add validation for missing default locale content.

Acceptance:

- Basic multilingual docs work.
- RTL layout does not break sidebar, cards, breadcrumbs, or API pages.

### Task 5.2: Deepen Versioning

**Files:**
- Modify `packages/core/src/config.ts`
- Modify `packages/core/src/manifest.ts`
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/test/manifest.test.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `examples/basic/*`

- [ ] Support version lifecycle metadata:

```ts
versions: [
  { id: "v2", label: "Version 2", latest: true },
  { id: "v1", label: "Version 1", deprecated: true },
]
```

- [ ] Show latest/deprecated badges in version switcher.
- [ ] Add canonical route behavior for latest version.

Acceptance:

- Versioning feels intentional and scalable.

### Task 5.3: Plugin API

**Files:**
- Create `packages/core/src/plugins.ts`
- Modify `packages/core/src/config.ts`
- Modify `packages/core/src/manifest.ts`
- Modify `packages/core/src/static-renderer.ts`
- Create `packages/core/test/plugins.test.ts`
- Modify `docs/contributing/architecture.md`

- [ ] Define narrow hooks:

```ts
export interface DocumenteePlugin {
  name: string;
  transformManifest?: (manifest: SiteManifest) => SiteManifest | Promise<SiteManifest>;
  transformHtml?: (html: string, route: SiteRoute, manifest: SiteManifest) => string | Promise<string>;
  validate?: (manifest: SiteManifest) => ValidationIssue[] | Promise<ValidationIssue[]>;
}
```

- [ ] Keep plugins optional and deterministic.
- [ ] Do not allow plugins to fork the content pipeline.

Acceptance:

- Users can extend output without modifying core.
- Architecture boundaries stay intact.

### Task 5.4: Richer Static Authoring Components

**Files:**
- Modify `packages/core/src/mdx-components.ts`
- Modify `packages/core/test/mdx-components.test.ts`
- Modify `docs/components.mdx`
- Modify `examples/basic/docs/components.mdx`

- [ ] Add or polish:
  - `PackageInstall`
  - `CliCommand`
  - `Mermaid`
  - `Update`
  - `Changelog`
  - `Columns`
  - `FeatureGrid`
  - `EndpointCard`
  - `OpenApiOperation`

Acceptance:

- Authoring feels closer to Mintlify/Nextra while staying static-first.

---

## Milestone 6: Migration And Adoption Tooling

**Outcome:** Teams can try Documentee without rewriting their docs by hand.

### Task 6.1: Improve Migration Commands

**Files:**
- Modify `packages/cli/src/commands/migrate.ts`
- Modify `packages/cli/test/migrate.test.ts`
- Modify `docs/api-reference/cli.mdx`

- [ ] Add migration modes:

```bash
documentee migrate mintlify ./source ./target
documentee migrate docusaurus ./source ./target
documentee migrate nextra ./source ./target
documentee migrate scalar ./source ./target
documentee migrate redocly ./source ./target
```

- [ ] Convert common config:
  - Navigation.
  - Theme color.
  - OpenAPI specs.
  - Redirects.
  - Search config.
  - SEO metadata.

- [ ] Convert common MDX components to Documentee-compatible static components.

Acceptance:

- A real small Mintlify or Docusaurus project migrates into a buildable Documentee project.

### Task 6.2: Add Migration Report

**Files:**
- Modify `packages/cli/src/commands/migrate.ts`
- Modify `packages/cli/test/migrate.test.ts`

- [ ] Emit `migration-report.md` with:
  - Files converted.
  - Unsupported components.
  - Broken links found.
  - Manual follow-up items.

Acceptance:

- Users understand exactly what needs manual cleanup.

### Task 6.3: Create Realistic Templates

**Files:**
- Modify `packages/cli/src/commands/init.ts`
- Modify `packages/cli/test/cli.test.ts`
- Create `templates/api-first/*`
- Create `templates/product-docs/*`
- Create `templates/enterprise-docs/*`
- Modify `README.md`

- [ ] Add:

```bash
documentee init --template api-first
documentee init --template product-docs
documentee init --template enterprise-docs
```

Acceptance:

- New users can start with a credible docs site in one command.

---

## Milestone 7: Feedback, Analytics, Audits, And Launch Proof

**Outcome:** Documentee has the trust-building surfaces users expect from serious docs tooling.

### Task 7.1: Add Static-Friendly Feedback Widget

**Files:**
- Modify `packages/core/src/config.ts`
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `docs/api-reference/config.mdx`

- [ ] Config:

```ts
feedback: {
  enabled: true,
  endpoint: "https://example.com/docs-feedback",
}
```

- [ ] Render helpful/not helpful buttons only when configured.
- [ ] Send route, title, vote, and optional comment to endpoint.
- [ ] Make script opt-in.

Acceptance:

- Static sites can collect feedback without Documentee hosting.

### Task 7.2: Add Audit Command

**Files:**
- Create `packages/cli/src/commands/audit.ts`
- Create `packages/cli/test/audit.test.ts`
- Modify `packages/cli/src/index.ts`
- Modify `docs/api-reference/cli.mdx`

- [ ] Audit checks:
  - Broken internal links.
  - Missing descriptions.
  - Missing h1.
  - Duplicate titles.
  - Private content accidentally public.
  - Missing OpenAPI examples.
  - Missing `llms.txt` metadata.
  - Pages too large.
  - Search route missing when configured.
  - Sitemap/robots consistency.

CLI:

```bash
documentee audit .
documentee audit . --format json
```

Acceptance:

- Audit output is actionable and stable in CI.

### Task 7.3: Add Lightweight Analytics Hooks

**Files:**
- Modify `packages/core/src/config.ts`
- Modify `packages/core/src/static-renderer.ts`
- Modify `packages/core/test/static-renderer.test.ts`
- Modify `docs/api-reference/config.mdx`

- [ ] Support script injection for analytics providers without making core depend on them:

```ts
analytics: {
  provider: "custom",
  scriptSrc: "https://analytics.example.com/script.js",
}
```

- [ ] Validate dangerous inline input carefully.
- [ ] Prefer external script URLs over arbitrary inline JavaScript.

Acceptance:

- Users can connect analytics while static pages remain clean by default.

### Task 7.4: Build Public Proof

**Files:**
- Modify `docs/index.mdx`
- Create `docs/comparisons/*.mdx`
- Create `docs/showcase/*.mdx`
- Modify `README.md`
- Modify `examples/*`

- [ ] Add pages:
  - `Documentee vs Mintlify`
  - `Documentee vs Docusaurus`
  - `Documentee vs Nextra`
  - `Documentee vs Scalar`
  - `Static API Docs`
  - `AI-Ready Docs`

- [ ] Keep comparison honest:
  - Documentee wins on local/static/portable/AI-readable OSS workflows.
  - Managed platforms win on hosted collaboration and analytics until Documentee explicitly provides alternatives.

Acceptance:

- Users understand why Documentee exists and when to choose it.

---

## Release Gates

### Gate A: Visual Quality

- [ ] Dogfood homepage cards render correctly.
- [ ] Mobile nav/search visible before scrolling.
- [ ] API operation pages have no orphan layout.
- [ ] Search page looks intentional.
- [ ] Dark mode is not muddy.
- [ ] No accidental internal pages in public docs.

### Gate B: API Docs Quality

- [ ] Request body fields are understandable.
- [ ] Response examples render.
- [ ] Code samples render.
- [ ] Auth requirements are clear.
- [ ] Playground has server/environment selection.
- [ ] Large specs have usable tag navigation and endpoint filtering.

### Gate C: AI Readiness

- [ ] `llms.txt` passes existing tests.
- [ ] `llms-full.txt` excludes private content.
- [ ] `llms.json` exists and is structured.
- [ ] MCP generator works locally.
- [ ] `skill.md` gives agents useful project-specific instructions.

### Gate D: Framework Maturity

- [ ] i18n works for at least English/French/Arabic fixture routes.
- [ ] Version switcher handles latest/deprecated versions.
- [ ] Plugin API has one working test plugin.
- [ ] Migration report identifies unsupported input.

### Gate E: Full Verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm docs:validate
pnpm validate
pnpm docs:build
rm -rf dist-example && pnpm example:build
```

Expected:

- All commands pass.
- Generated `dist-docs` contains no unintended internal planning/spec pages.
- Generated `dist-example` demonstrates docs, search, API portal, API operation, playground, and AI outputs.

---

## Suggested Execution Strategy

Use one branch or worktree per milestone:

```bash
git switch -c codex/competitive-m1-visual-repair
git switch -c codex/competitive-m2-premium-shell
git switch -c codex/competitive-m3-api-reference
git switch -c codex/competitive-m4-ai-docs
git switch -c codex/competitive-m5-framework-maturity
git switch -c codex/competitive-m6-migration
git switch -c codex/competitive-m7-audits-proof
```

Recommended order:

1. Complete Milestone 1 fully before any new feature work.
2. Ship Milestone 2 visual shell before publishing comparisons.
3. Build Milestone 3 around a realistic large OpenAPI fixture, not only `examples/basic`.
4. Build Milestone 4 with strict public/private content filtering from the start.
5. Add i18n/plugin maturity only after the UI/API/AI foundation is credible.

## Non-Goals For This Roadmap

- Hosted SaaS collaboration.
- Built-in user authentication.
- Stored analytics backend.
- Full arbitrary React component hydration by default.
- Replacing Scalar as a complete API client.
- Replacing Docusaurus as a broad plugin ecosystem immediately.

These can become future commercial or ecosystem layers after the open-source static foundation is excellent.

