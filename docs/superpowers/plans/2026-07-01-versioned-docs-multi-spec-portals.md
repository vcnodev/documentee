# Versioned Docs and Multi-Spec Portals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add versioned documentation trees and multi-spec API portal routes while preserving the current single-version Documentee behavior.

**Architecture:** Config parsing normalizes optional versions and spec-version ownership. Manifest generation loads base content plus versioned content, prefixes versioned OpenAPI routes, creates a static API portal route, and emits spec-scoped schema routes. The static renderer renders all of this as no-client-JS HTML, with validation covering bad config references and route conflicts.

**Tech Stack:** TypeScript, Zod, Vitest, existing `@documentee/core` and `@documentee/openapi` packages.

---

## File Structure

- Modify `packages/core/src/config.ts`: add `versions` schema, spec `version`, config assertions.
- Modify `packages/core/src/manifest.ts`: normalize versions, prefix versioned routes, generate API portal and spec-scoped schema routes.
- Modify `packages/core/src/static-renderer.ts`: render API portal, version switcher, spec-scoped schema links, route-based navigation refs.
- Modify `packages/core/src/validation.ts`: validate OpenAPI navigation ids and unknown spec version references.
- Modify `packages/core/test/config.test.ts`: cover version defaults and invalid version config.
- Modify `packages/core/test/manifest.test.ts`: cover versioned content, versioned spec routes, portal, and schema scoping.
- Modify `packages/core/test/static-renderer.test.ts`: cover portal HTML, version switcher, and spec-scoped schema links.
- Modify `packages/core/test/validation.test.ts`: cover missing OpenAPI navigation group and unknown spec version.
- Modify `examples/basic/documentee.config.ts` and add example files/specs: demonstrate versions and multiple specs.

## Task 1: Config Schema

- [ ] **Step 1: Write failing config tests**

Add tests in `packages/core/test/config.test.ts` that load `docs.json` with:

```json
{
  "name": "Acme Docs",
  "versions": [
    { "id": "v1", "content": { "directory": "docs/v1" } },
    { "id": "v2", "label": "Version 2", "routePrefix": "/v2", "content": { "directory": "docs/v2" }, "default": true }
  ],
  "openapi": {
    "specs": [{ "id": "core-v2", "source": "./api/core-v2.yaml", "version": "v2" }]
  }
}
```

Assert `v1` defaults to `label: "v1"`, `routePrefix: "/v1"`, and `default: false`, and that the OpenAPI spec has `version: "v2"`.

Add rejection tests for duplicate version ids, duplicate version route prefixes, and multiple default versions.

- [ ] **Step 2: Run config tests and verify RED**

Run: `pnpm --filter @documentee/core test -- config.test.ts`

Expected: tests fail because `versions` and spec `version` are not parsed or asserted yet.

- [ ] **Step 3: Implement config schema**

Add `versionSchema` to `packages/core/src/config.ts`, include `versions: z.array(versionSchema).default([])` in both config schemas, add `version: z.string().optional()` to `openApiSpecSchema`, and add assertions for duplicate version ids, duplicate route prefixes, and multiple defaults.

- [ ] **Step 4: Run config tests and verify GREEN**

Run: `pnpm --filter @documentee/core test -- config.test.ts`

Expected: config tests pass.

## Task 2: Manifest Routes

- [ ] **Step 1: Write failing manifest tests**

Add a test in `packages/core/test/manifest.test.ts` that creates:

- `docs/index.mdx`
- `docs/v1/index.mdx`
- `api/core-v1.yaml`
- `api/admin-v2.yaml`

Use config with two versions and two OpenAPI specs. Assert generated routes include:

```ts
[
  "/",
  "/api-reference",
  "/schemas/admin-v2/Message",
  "/schemas/core-v1/Message",
  "/v1/",
  "/v1/api-reference/core/list-messages",
  "/v2/api-reference/admin/list-users"
]
```

Assert the API portal route has two spec summaries and that versioned routes carry `version.id`.

- [ ] **Step 2: Run manifest tests and verify RED**

Run: `pnpm --filter @documentee/core test -- manifest.test.ts`

Expected: tests fail because versioned content, portal, and spec-scoped schemas are missing.

- [ ] **Step 3: Implement manifest generation**

Add version normalization helpers, route joining helpers, API portal summary generation, and schema route metadata in `packages/core/src/manifest.ts`.

- [ ] **Step 4: Run manifest tests and verify GREEN**

Run: `pnpm --filter @documentee/core test -- manifest.test.ts`

Expected: manifest tests pass.

## Task 3: Static Renderer

- [ ] **Step 1: Write failing renderer tests**

Add tests in `packages/core/test/static-renderer.test.ts` asserting:

- `renderRoute` for `api-portal` contains spec names, version labels, operation counts, and links to first operation routes.
- Versioned manifests render a `.version-switcher` with links to `/v1/` and `/v2/`.
- API operation schema refs link to `/schemas/core/Message/`.

- [ ] **Step 2: Run renderer tests and verify RED**

Run: `pnpm --filter @documentee/core test -- static-renderer.test.ts`

Expected: tests fail because renderer does not know `api-portal`, version switcher, or spec-scoped schema links.

- [ ] **Step 3: Implement static rendering**

Add portal rendering, version switcher HTML, spec-aware schema refs, route-ref navigation handling, and small CSS additions in `packages/core/src/static-renderer.ts`.

- [ ] **Step 4: Run renderer tests and verify GREEN**

Run: `pnpm --filter @documentee/core test -- static-renderer.test.ts`

Expected: renderer tests pass.

## Task 4: Validation

- [ ] **Step 1: Write failing validation tests**

Add tests in `packages/core/test/validation.test.ts` for:

- Navigation group `{ group: "Missing API", openapi: "missing" }` reporting `Navigation OpenAPI target does not exist: missing`.
- Spec `{ id: "core", version: "v3" }` reporting `OpenAPI spec core references missing version: v3`.

- [ ] **Step 2: Run validation tests and verify RED**

Run: `pnpm --filter @documentee/core test -- validation.test.ts`

Expected: tests fail because diagnostics do not exist yet.

- [ ] **Step 3: Implement validation**

Extend `validateNavigationTargets` and add `validateOpenApiVersions` in `packages/core/src/validation.ts`.

- [ ] **Step 4: Run validation tests and verify GREEN**

Run: `pnpm --filter @documentee/core test -- validation.test.ts`

Expected: validation tests pass.

## Task 5: Example Project and Full Verification

- [ ] **Step 1: Update the example**

Modify `examples/basic/documentee.config.ts` to include one versioned docs tree and a second OpenAPI spec. Add matching files under `examples/basic/docs/v1` and `examples/basic/api/admin-openapi.yaml`.

- [ ] **Step 2: Run focused package tests**

Run:

```bash
pnpm --filter @documentee/core test
```

Expected: all core tests pass.

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected: every command exits 0.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git status --short
git add packages/core/src/config.ts packages/core/src/manifest.ts packages/core/src/static-renderer.ts packages/core/src/validation.ts packages/core/test/config.test.ts packages/core/test/manifest.test.ts packages/core/test/static-renderer.test.ts packages/core/test/validation.test.ts examples/basic/documentee.config.ts examples/basic/docs/v1/index.mdx examples/basic/api/admin-openapi.yaml docs/superpowers/plans/2026-07-01-versioned-docs-multi-spec-portals.md
git commit -m "feat: add versioned docs portals"
```

Expected: implementation is committed after verification.
