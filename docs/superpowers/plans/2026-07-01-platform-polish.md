# Platform Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement deeper theming, migration MDX compatibility, static preview, richer OpenAPI fixture coverage, and complete repo documentation/rules.

**Architecture:** Keep behavior centralized in existing packages: `@documentee/core` owns config/rendering, `@documentee/cli` owns commands and migration transforms, `@documentee/openapi` owns loader/normalizer fixture coverage, and Markdown docs describe the verified surface. All runtime output remains static HTML unless an existing opt-in feature, such as the API playground or Pagefind, emits client assets.

**Tech Stack:** TypeScript, Zod, Node HTTP server, Vitest, existing Documentee packages.

---

## File Structure

- Modify `packages/core/src/config.ts`: expand `theme` schema and docs JSON color mapping.
- Modify `packages/core/src/static-renderer.ts`: render theme CSS variables and append custom CSS.
- Modify `packages/core/test/config.test.ts`: cover theme defaults and docs JSON color compatibility.
- Modify `packages/core/test/static-renderer.test.ts`: cover theme CSS output.
- Create `packages/cli/src/commands/preview.ts`: build static output and serve files from disk.
- Modify `packages/cli/src/index.ts`: route `documentee preview`.
- Create `packages/cli/test/preview.test.ts`: verify built HTML and static assets are served.
- Modify `packages/cli/src/commands/migrate.ts`: normalize copied Markdown/MDX files during migration.
- Modify `packages/cli/test/migrate.test.ts`: cover Docusaurus, Nextra, and Mintlify MDX compatibility.
- Modify `packages/openapi/src/normalize.ts`: resolve local component `$ref`s for parameters, request bodies, and responses; include root security fallback.
- Modify `packages/openapi/test/normalize.test.ts`: add OpenAPI 3.0 and 3.1 fixture cases.
- Modify `README.md` and all `packages/*/README.md`: document current features and links.
- Create `AGENTS.md`: repo rules and verification expectations.
- Modify `docs/contributing/architecture.md` and `docs/contributing/testing.md`: cross-link rules and feature ownership.
- Modify `packages/cli/test/contributor-docs.test.ts` or `package-boundary.test.ts`: assert key docs/rules files and links exist.

## Task 1: Theme Customization

- [ ] **Step 1: Write failing config and renderer tests**

Add config assertions to `packages/core/test/config.test.ts`:

```ts
expect(config.theme).toMatchObject({
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
});
```

Add renderer assertions to `packages/core/test/static-renderer.test.ts`:

```ts
expect(html).toContain("--doc-primary: #2563eb;");
expect(html).toContain("--doc-nav-width: 300px;");
expect(html).toContain("font-family: var(--doc-font-family)");
expect(html).toContain(".custom { color: red; }");
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm test packages/core/test/config.test.ts packages/core/test/static-renderer.test.ts
```

Expected: fails because theme fields and CSS variables are missing.

- [ ] **Step 3: Implement theme schema and CSS variables**

Update `packages/core/src/config.ts` with expanded optional fields and defaults. Update `packages/core/src/static-renderer.ts` to emit `:root` variables using `manifest.config.theme` and use variables in layout/style rules.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
pnpm test packages/core/test/config.test.ts packages/core/test/static-renderer.test.ts
```

Expected: focused tests pass.

## Task 2: Migration MDX Compatibility

- [ ] **Step 1: Write failing migration tests**

Add tests in `packages/cli/test/migrate.test.ts`:

```ts
expect(output).not.toContain("import ");
expect(output).toContain('<Callout type="tip">');
expect(output).toContain('<Tab title="cURL">');
expect(output).toContain("<CardGroup>");
```

Use source docs containing Docusaurus admonitions, `<Tabs><TabItem label="cURL">`, Nextra `<Cards>`, and Mintlify-style imports.

- [ ] **Step 2: Run migration tests and verify RED**

Run:

```bash
pnpm test packages/cli/test/migrate.test.ts
```

Expected: fails because migration currently only copies files.

- [ ] **Step 3: Implement migration transforms**

Update `packages/cli/src/commands/migrate.ts` so copied `.md` and `.mdx` files are read, transformed, and written. Keep non-Markdown files copied unchanged.

- [ ] **Step 4: Run migration tests and verify GREEN**

Run:

```bash
pnpm test packages/cli/test/migrate.test.ts
```

Expected: migration tests pass.

## Task 3: Preview CLI

- [ ] **Step 1: Write failing preview tests**

Create `packages/cli/test/preview.test.ts`:

```ts
const server = await previewCommand(projectRoot, { outDir, port: 0 });
const response = await fetch(`http://127.0.0.1:${port}/`);
expect(response.status).toBe(200);
expect(await response.text()).toContain("<h1>Acme Docs</h1>");
expect((await fetch(`http://127.0.0.1:${port}/llms.txt`)).status).toBe(200);
```

Also add CLI routing coverage in `packages/cli/test/cli.test.ts` or the new preview test.

- [ ] **Step 2: Run preview tests and verify RED**

Run:

```bash
pnpm test packages/cli/test/preview.test.ts
```

Expected: fails because `previewCommand` does not exist.

- [ ] **Step 3: Implement preview command**

Create `packages/cli/src/commands/preview.ts` that calls `buildCommand`, serves built files from `outDir`, maps extensionless routes to `index.html`, and returns a `Server`. Update `packages/cli/src/index.ts` with command parsing and exports.

- [ ] **Step 4: Run preview tests and verify GREEN**

Run:

```bash
pnpm test packages/cli/test/preview.test.ts packages/cli/test/cli.test.ts
```

Expected: preview and CLI tests pass.

## Task 4: OpenAPI 3.0/3.1 Fixture Coverage

- [ ] **Step 1: Write failing OpenAPI tests**

Add tests in `packages/openapi/test/normalize.test.ts` for:

```ts
expect(operation.parameters).toContainEqual({
  name: "traceId",
  location: "header",
  required: false,
  schemaRef: "TraceId",
});
expect(operation.requestBody?.schemaRefs).toEqual(["CreateMessage"]);
expect(operation.responses[0].schemaRefs).toEqual(["Message"]);
expect(operation.auth).toEqual(["apiKeyAuth"]);
```

Use OpenAPI 3.0 and 3.1 fixtures with local `$ref`s under `components.parameters`, `components.requestBodies`, and `components.responses`.

- [ ] **Step 2: Run OpenAPI tests and verify RED**

Run:

```bash
pnpm test packages/openapi/test/normalize.test.ts
```

Expected: fails because component `$ref` normalization is not implemented.

- [ ] **Step 3: Implement compact local ref resolution**

Update `packages/openapi/src/normalize.ts` to resolve local `#/components/...` references for parameters, request bodies, and responses. Keep schema graphs compact by storing names only.

- [ ] **Step 4: Run OpenAPI tests and verify GREEN**

Run:

```bash
pnpm test packages/openapi/test/normalize.test.ts
```

Expected: OpenAPI tests pass.

## Task 5: Documentation And Rules

- [ ] **Step 1: Write failing docs tests**

Extend `packages/cli/test/contributor-docs.test.ts` to assert:

```ts
expect(await exists("AGENTS.md")).toBe(true);
expect(await readFile("README.md", "utf8")).toContain("documentee preview");
expect(await readFile("AGENTS.md", "utf8")).toContain("Behavior changes require tests");
expect(await readFile("docs/contributing/testing.md", "utf8")).toContain("User-facing changes require docs");
```

- [ ] **Step 2: Run docs tests and verify RED**

Run:

```bash
pnpm test packages/cli/test/contributor-docs.test.ts
```

Expected: fails because docs/rules are incomplete.

- [ ] **Step 3: Update README, package docs, AGENTS, and contributing docs**

Update root and package READMEs with current feature references and links. Create `AGENTS.md` with codebase rules. Update `docs/contributing/architecture.md` and `docs/contributing/testing.md`.

- [ ] **Step 4: Run docs tests and verify GREEN**

Run:

```bash
pnpm test packages/cli/test/contributor-docs.test.ts
```

Expected: docs tests pass.

## Task 6: Full Verification And Commit

- [ ] **Step 1: Run full verification**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm validate
rm -rf dist-example && pnpm example:build
```

Expected: every command exits 0.

- [ ] **Step 2: Inspect generated example output**

Run:

```bash
find dist-example -maxdepth 4 -type f | sort | sed -n '1,120p'
rg -n "documentee|version-switcher|Core API|Admin API" dist-example | sed -n '1,120p'
```

Expected: built docs, API portal, versioned routes, schemas, and generated assets are present.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git status --short
git add README.md AGENTS.md docs/contributing packages examples docs/superpowers/plans/2026-07-01-platform-polish.md
git commit -m "feat: polish documentee platform"
```

Expected: implementation and docs are committed.
