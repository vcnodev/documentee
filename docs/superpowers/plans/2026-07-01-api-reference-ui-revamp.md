# API Reference UI Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish generated API reference pages for real Swagger specs with tag navigation, method/status styling, richer parameter/body/response cards, multipart field display, portal summaries, and SwingSwap-shaped fixture coverage.

**Architecture:** Extend `@documentee/openapi` with compact display metadata, then update `@documentee/core` static rendering helpers to consume that metadata. Keep output static and no-client-JS except for existing optional playground/search scripts.

**Tech Stack:** TypeScript, Vitest, static HTML/CSS renderer, OpenAPI 3.0/3.1 metadata normalization.

---

## Files

- Modify `packages/openapi/src/types.ts`: add parameter/body field metadata types.
- Modify `packages/openapi/src/normalize.ts`: extract parameter descriptions/types/enums and request body fields.
- Modify `packages/openapi/test/normalize.test.ts`: add failing coverage for compact metadata extraction.
- Modify `packages/core/src/static-renderer.ts`: add tag nav grouping, portal stats, operation hero, card-based API sections, and CSS.
- Modify `packages/core/test/static-renderer.test.ts`: add SwingSwap-shaped renderer fixture and focused markup assertions.
- Modify `docs/superpowers/specs/2026-07-01-api-reference-ui-revamp-design.md`: keep the design updated if scope changes.
- Modify `docs/superpowers/plans/2026-07-01-api-reference-ui-revamp.md`: check off completed steps.

## Task 1: Normalize Display Metadata

- [x] **Step 1: Write failing OpenAPI normalizer tests**

Add tests to `packages/openapi/test/normalize.test.ts` that assert:

```ts
expect(operation.parameters).toContainEqual({
  name: "condition",
  location: "query",
  required: false,
  description: "Product condition filter.",
  schemaRef: undefined,
  schemaType: "string",
  enumValues: ["new", "used"],
});

expect(operation.requestBody).toMatchObject({
  required: true,
  mediaTypes: ["multipart/form-data"],
  fields: [
    { name: "images", required: true, schemaType: "array", schemaFormat: "binary", description: "Product images." },
    { name: "title", required: true, schemaType: "string", description: "Product title." },
  ],
});
```

- [x] **Step 2: Run focused test and verify RED**

Run:

```bash
pnpm --filter @documentee/openapi test -- normalize.test.ts
```

Expected: FAIL because the new metadata fields are not normalized yet.

- [x] **Step 3: Implement compact metadata extraction**

Update `packages/openapi/src/types.ts` with:

```ts
export interface ApiSchemaField {
  name: string;
  required: boolean;
  description?: string;
  schemaRef?: string;
  schemaType?: string;
  schemaFormat?: string;
  enumValues?: string[];
}
```

Then add matching optional fields to `ApiParameter` and `ApiRequestBody`.

Update `packages/openapi/src/normalize.ts` to:

- Resolve local `$ref`s before reading metadata.
- Use schema `type`, `format`, `$ref`, and string/number/boolean enums.
- Extract object `properties` into `fields`.
- Preserve compactness by omitting full `properties`, `items`, `oneOf`, and other schema internals from operation output.

- [x] **Step 4: Run focused test and verify GREEN**

Run:

```bash
pnpm --filter @documentee/openapi test -- normalize.test.ts
```

Expected: PASS.

## Task 2: Add SwingSwap-Shaped Renderer Fixture

- [x] **Step 1: Write failing renderer test**

Add an `it("renders a polished SwingSwap-shaped API reference", ...)` fixture in `packages/core/test/static-renderer.test.ts` with:

- Seven tag groups: Health, Authentication, Products, Addresses, Offers, Swaps, Chats.
- A query-heavy `GET /products/search`.
- A multipart `POST /products/upload` with fields.
- 2xx/4xx response states.
- An API portal route and one operation route.

Assert the HTML contains:

```ts
expect(html).toContain('class="nav-subgroup"');
expect(html).toContain("Products");
expect(html).toContain("13 endpoints");
expect(html).toContain('class="api-hero method-post"');
expect(html).toContain('class="api-param-card"');
expect(html).toContain("Form fields");
expect(html).toContain("images");
expect(html).toContain("binary");
expect(html).toContain('class="api-response-card api-status-4xx"');
expect(portalHtml).toContain('class="api-portal-tags"');
expect(portalHtml).toContain("Products");
```

- [x] **Step 2: Run focused test and verify RED**

Run:

```bash
pnpm --filter @documentee/core test -- static-renderer.test.ts
```

Expected: FAIL because the renderer still emits flat nav, tables, plain sections, and sparse portal cards.

## Task 3: Implement Static Renderer API Polish

- [x] **Step 1: Add method/status helper functions**

Add helpers in `packages/core/src/static-renderer.ts`:

```ts
function methodClass(method: string): string {
  return `method-${method.toLowerCase()}`;
}

function statusClass(status: string): string {
  if (/^2/.test(status)) return "api-status-2xx";
  if (/^3/.test(status)) return "api-status-3xx";
  if (/^4/.test(status)) return "api-status-4xx";
  if (/^5/.test(status)) return "api-status-5xx";
  return "api-status-default";
}
```

- [x] **Step 2: Group API nav by tag**

Replace the flat `group.openapi` path in `renderNavigation()` with an `renderOpenApiNavGroups(manifest, specId, currentRoute)` helper. It should group operations by first tag, fall back to `API`, show endpoint counts, and render links beneath each tag.

- [x] **Step 3: Improve API portal cards**

Change `renderApiPortal(route)` to `renderApiPortal(manifest, route)`. Derive per-spec tag stats from `manifest.operations`, then render operation count, tag count, auth count, and top tag chips.

- [x] **Step 4: Render operation hero and cards**

Refactor `renderApiOperation()` to output:

- `<article class="api-operation">`
- `<header class="api-hero method-get">`
- `.api-meta-row` for tags/auth/badges
- `.api-param-list` and `.api-param-card`
- `.api-request-card`, `.api-field-list`, `.api-field-row`
- `.api-response-list` and `.api-response-card`

- [x] **Step 5: Keep playground compatible**

Update `renderPlaygroundBody()` to accept `ApiRequestBody`, keep `name="mediaType"` and `name="body"` for current JavaScript compatibility, and add static multipart guidance/field hints without changing request submission behavior.

- [x] **Step 6: Add responsive CSS**

Add CSS for the new classes, including method colors, status colors, portal stats, tag chips, field rows, and mobile-safe layouts. Keep cards at `var(--doc-radius)` and avoid text overlap with `overflow-wrap: anywhere`.

- [x] **Step 7: Run focused renderer test and verify GREEN**

Run:

```bash
pnpm --filter @documentee/core test -- static-renderer.test.ts
```

Expected: PASS.

## Task 4: Verify Against Real SwingSwap Preview

- [x] **Step 1: Rebuild/reload the local preview**

With the preview command running in `test-project`, reload:

```text
http://127.0.0.1:4567/api-reference/
http://127.0.0.1:4567/api-reference/get-products-search/
http://127.0.0.1:4567/api-reference/post-products-upload/
```

- [x] **Step 2: Capture browser evidence**

Use the in-app browser screenshots to confirm:

- The sidebar is grouped by tags.
- Portal shows tag/category chips.
- Search endpoint parameters are card-based.
- Multipart endpoint shows form fields, including binary/file-like fields.
- Responses are status-colored cards.

## Task 5: Full Verification

- [x] **Step 1: Run focused package tests**

```bash
pnpm --filter @documentee/openapi test -- normalize.test.ts
pnpm --filter @documentee/core test -- static-renderer.test.ts
```

- [x] **Step 2: Run full required verification**

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm docs:validate
pnpm validate
pnpm docs:build
rm -rf dist-example && pnpm example:build
```

- [x] **Step 3: Review git diff**

```bash
git diff -- packages/openapi/src/types.ts packages/openapi/src/normalize.ts packages/openapi/test/normalize.test.ts packages/core/src/static-renderer.ts packages/core/test/static-renderer.test.ts docs/superpowers/specs/2026-07-01-api-reference-ui-revamp-design.md docs/superpowers/plans/2026-07-01-api-reference-ui-revamp.md
git status --short
```

Expected: only intended files plus the pre-existing user `.gitignore` change.

## Task 6: Mintlify-Quality UI Hardening

- [x] **Step 1: Launch specialist subagents**

Use a read-only `UI Designer` subagent to critique the live SwingSwap preview and a `Frontend Developer` subagent to implement a focused static renderer polish patch. The designer must return pass/fail browser QA criteria; the frontend agent must edit only `packages/core/src/static-renderer.ts` and `packages/core/test/static-renderer.test.ts`.

- [x] **Step 2: Add failing renderer assertions for remaining UI blockers**

Extend the SwingSwap-shaped fixture in `packages/core/test/static-renderer.test.ts` to assert:

```ts
expect(uploadHtml).toContain('class="skip-link" href="#main"');
expect(uploadHtml).toContain('<main id="main" class="doc-main">');
expect(uploadHtml).toContain(":focus-visible");
expect(uploadHtml).toContain("@media (prefers-color-scheme: dark)");
expect(uploadHtml).toContain(".doc-main { order: 1; }");
expect(uploadHtml).toContain(".doc-sidebar { order: 2;");
expect(uploadHtml).toContain("<details");
expect(uploadHtml).toContain("<summary");
expect(uploadHtml).toContain("<h1>Create product with file upload</h1>");
expect(uploadHtml).toContain('class="api-endpoint-command"');
expect(uploadHtml).toContain("file[]");
```

Run:

```bash
npx pnpm vitest run packages/core/test/static-renderer.test.ts
```

Expected: FAIL before implementation because these quality requirements are missing.

- [x] **Step 3: Implement the final static UI hardening**

Update `packages/core/src/static-renderer.ts` to:

- Add a skip link and `main#main`.
- Remove the visible route-kind label from the topbar.
- Add visible `:focus-visible` styles.
- Switch mobile API pages to content-first layout with the sidebar ordered after main content.
- Render OpenAPI tag nav groups as native `<details>`/`<summary>`, opening the current tag only.
- Lead operation heroes with the summary and show method/path in `.api-endpoint-command`.
- Emit dark-mode CSS variables under `@media (prefers-color-scheme: dark)`.
- Render binary array request fields as `file[]`.

- [x] **Step 4: Run focused renderer test and verify GREEN**

Run:

```bash
npx pnpm vitest run packages/core/test/static-renderer.test.ts
```

Expected: PASS.

- [x] **Step 5: Browser proof against real SwingSwap preview**

Rebuild/reload `test-project` on `http://127.0.0.1:4567`, then capture proof for:

- Desktop operation page has workbench layout and operation rail.
- Mobile operation page shows content before the generated sidebar.
- Portal exposes API category/tag entry points.
- Multipart page shows `file[]`.
- Dark-mode CSS variables are present.

- [x] **Step 6: Full final verification**

Run the full `AGENTS.md` command set from the final tree before claiming completion.
