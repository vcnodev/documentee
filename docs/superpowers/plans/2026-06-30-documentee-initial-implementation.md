# Documentee Initial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a working first milestone of Documentee: a TypeScript CLI that reads a docs project config, loads MDX/Markdown pages, ingests OpenAPI 3.0/3.1 specs, generates route manifests, emits static HTML, and writes `llms.txt` / `llms-full.txt`.

**Architecture:** The milestone uses a renderer-agnostic core model. `@documentee/core` owns config/content/routes, `@documentee/openapi` owns spec ingestion and operation normalization, `@documentee/llms` owns AI-readable outputs, and `@documentee/cli` orchestrates validation/build. The static renderer is intentionally simple HTML for this milestone; Astro/Vite and Next.js adapters remain future renderers that consume the same route manifest.

**Tech Stack:** TypeScript, Node.js ESM, pnpm workspaces, Vitest, tsx, Zod, gray-matter, marked, yaml, fast-glob, shiki-free plain HTML code rendering.

---

## Scope

This plan implements the first complete working slice:

- `documentee init`
- `documentee validate`
- `documentee build`
- typed config loading from `documentee.config.ts` or `docs.json`
- MD/MDX page discovery
- OpenAPI YAML/JSON loading
- operation route generation
- static HTML output
- `llms.txt` and `llms-full.txt`
- HTML payload budget helper for the future small-HTML/no-JS renderer goal

This plan does not implement Astro, Pagefind, full MDX runtime components, browser try-it, or Next.js adapters. It creates the stable model those renderers should consume later.

## File Structure

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
vitest.config.ts
packages/
  core/
    package.json
    src/
      config.ts
      content.ts
      html.ts
      index.ts
      manifest.ts
      paths.ts
      static-renderer.ts
    test/
      config.test.ts
      content.test.ts
      manifest.test.ts
      static-renderer.test.ts
  openapi/
    package.json
    src/
      index.ts
      loader.ts
      normalize.ts
      types.ts
    test/
      loader.test.ts
      normalize.test.ts
  llms/
    package.json
    src/
      index.ts
      render.ts
    test/
      render.test.ts
  cli/
    package.json
    src/
      commands/
        build.ts
        init.ts
        validate.ts
      index.ts
    test/
      cli.test.ts
  create/
    package.json
    src/
      index.ts
examples/
  basic/
    documentee.config.ts
    docs/
      get-started/
        quickstart.mdx
    api/
      openapi.yaml
```

## Task 1: Workspace And Tooling

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`

- [x] **Step 1: Create workspace files**

`package.json`:

```json
{
  "name": "documentee",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r --sort run build",
    "test": "vitest run",
    "typecheck": "pnpm -r --sort run typecheck",
    "validate": "pnpm --filter @documentee/cli documentee validate examples/basic",
    "example:build": "pnpm --filter @documentee/cli documentee build examples/basic --out dist-example"
  },
  "devDependencies": {
    "@types/node": "^20.14.12",
    "tsx": "^4.16.2",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  },
  "packageManager": "pnpm@9.6.0"
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  }
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["packages/*/test/**/*.test.ts"],
  },
});
```

- [x] **Step 2: Run install**

Run: `pnpm install`

Expected: lockfile created and dependencies installed.

## Task 2: Core Config Loader

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/src/config.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/test/config.test.ts`

- [x] **Step 1: Write config tests**

```ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("loads docs.json and normalizes defaults", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        navigation: [{ group: "Get Started", pages: ["docs/get-started/quickstart"] }],
        openapi: { specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference" }] },
      }),
    );

    const config = await loadConfig(root);

    expect(config.site.name).toBe("Acme Docs");
    expect(config.content.directory).toBe("docs");
    expect(config.openapi.specs[0].id).toBe("core");
    expect(config.search.provider).toBe("none");
  });

  it("rejects duplicate OpenAPI spec ids", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        openapi: {
          specs: [
            { id: "core", source: "./api/a.yaml", routeBase: "/a" },
            { id: "core", source: "./api/b.yaml", routeBase: "/b" }
          ]
        }
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow("Duplicate OpenAPI spec id: core");
  });
});
```

- [x] **Step 2: Run test to verify RED**

Run: `pnpm test packages/core/test/config.test.ts`

Expected: FAIL because `packages/core/src/config.ts` does not exist.

- [x] **Step 3: Implement config loader**

Implementation creates a Zod schema, supports `docs.json`, supports `documentee.config.ts`, normalizes defaults, and rejects duplicate OpenAPI IDs.

- [x] **Step 4: Run test to verify GREEN**

Run: `pnpm test packages/core/test/config.test.ts`

Expected: PASS.

## Task 3: Content Discovery And HTML Rendering

**Files:**
- Create: `packages/core/src/content.ts`
- Create: `packages/core/src/html.ts`
- Create: `packages/core/test/content.test.ts`

- [x] **Step 1: Write content tests**

Test behaviors:

- finds `.md` and `.mdx` files under the configured docs directory
- extracts frontmatter title and description
- derives route path from file path
- renders Markdown headings and paragraphs into HTML

- [x] **Step 2: Run test to verify RED**

Run: `pnpm test packages/core/test/content.test.ts`

Expected: FAIL because content loader does not exist.

- [x] **Step 3: Implement content loader**

Use `fast-glob`, `gray-matter`, and `marked`.

- [x] **Step 4: Run test to verify GREEN**

Run: `pnpm test packages/core/test/content.test.ts`

Expected: PASS.

## Task 4: OpenAPI Loader And Operation Normalizer

**Files:**
- Create: `packages/openapi/package.json`
- Create: `packages/openapi/src/types.ts`
- Create: `packages/openapi/src/loader.ts`
- Create: `packages/openapi/src/normalize.ts`
- Create: `packages/openapi/src/index.ts`
- Create: `packages/openapi/test/loader.test.ts`
- Create: `packages/openapi/test/normalize.test.ts`

- [x] **Step 1: Write OpenAPI tests**

Test behaviors:

- loads YAML OpenAPI 3.1 files
- rejects specs without `openapi`
- extracts operations from paths
- generates stable operation slugs from method and path
- keeps operation pages small by not inlining the full schema graph

- [x] **Step 2: Run tests to verify RED**

Run: `pnpm test packages/openapi/test`

Expected: FAIL because package does not exist.

- [x] **Step 3: Implement OpenAPI package**

Use `yaml` for YAML parsing. Validate minimum structure. Normalize operations into:

```ts
export interface ApiOperation {
  specId: string;
  method: string;
  path: string;
  slug: string;
  route: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
}
```

- [x] **Step 4: Run tests to verify GREEN**

Run: `pnpm test packages/openapi/test`

Expected: PASS.

## Task 5: Route Manifest And Static Renderer

**Files:**
- Create: `packages/core/src/manifest.ts`
- Create: `packages/core/src/paths.ts`
- Create: `packages/core/src/static-renderer.ts`
- Create: `packages/core/test/manifest.test.ts`
- Create: `packages/core/test/static-renderer.test.ts`

- [x] **Step 1: Write manifest and renderer tests**

Test behaviors:

- authored content pages become routes
- OpenAPI operations become `/api-reference/<slug>` routes
- generated API pages include method/path but not full global schemas
- HTML payload budget helper fails pages over the configured byte limit
- renderer writes `index.html` files for every route

- [x] **Step 2: Run tests to verify RED**

Run: `pnpm test packages/core/test/manifest.test.ts packages/core/test/static-renderer.test.ts`

Expected: FAIL because manifest/static renderer do not exist.

- [x] **Step 3: Implement manifest and static renderer**

Implement a small static HTML shell with sidebar links, route title, route description, and body. Keep API operation pages intentionally compact.

- [x] **Step 4: Run tests to verify GREEN**

Run: `pnpm test packages/core/test/manifest.test.ts packages/core/test/static-renderer.test.ts`

Expected: PASS.

## Task 6: LLM Text Outputs

**Files:**
- Create: `packages/llms/package.json`
- Create: `packages/llms/src/render.ts`
- Create: `packages/llms/src/index.ts`
- Create: `packages/llms/test/render.test.ts`

- [x] **Step 1: Write LLM output tests**

Test behaviors:

- `llms.txt` includes site name, description, docs page links, and OpenAPI spec links
- `llms-full.txt` includes page content and API operation summaries

- [x] **Step 2: Run tests to verify RED**

Run: `pnpm test packages/llms/test/render.test.ts`

Expected: FAIL because package does not exist.

- [x] **Step 3: Implement LLM renderer**

Generate plain Markdown text from the route manifest.

- [x] **Step 4: Run tests to verify GREEN**

Run: `pnpm test packages/llms/test/render.test.ts`

Expected: PASS.

## Task 7: CLI Build, Validate, Init

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/build.ts`
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/commands/validate.ts`
- Create: `packages/cli/test/cli.test.ts`
- Create: `packages/create/package.json`
- Create: `packages/create/src/index.ts`

- [x] **Step 1: Write CLI tests**

Test behaviors:

- `validate <project>` exits successfully for a valid fixture
- `build <project> --out <dir>` writes HTML pages, `llms.txt`, and `llms-full.txt`
- `init <dir>` writes a starter docs project

- [x] **Step 2: Run tests to verify RED**

Run: `pnpm test packages/cli/test/cli.test.ts`

Expected: FAIL because CLI does not exist.

- [x] **Step 3: Implement CLI**

Use Node APIs and a small hand-written argument parser. Avoid adding a CLI framework until needed.

- [x] **Step 4: Run tests to verify GREEN**

Run: `pnpm test packages/cli/test/cli.test.ts`

Expected: PASS.

## Task 8: Example Project And End-To-End Verification

**Files:**
- Create: `examples/basic/documentee.config.ts`
- Create: `examples/basic/docs/get-started/quickstart.mdx`
- Create: `examples/basic/api/openapi.yaml`
- Create: `README.md`

- [x] **Step 1: Create example project**

The example must include one guide page and at least two OpenAPI operations.

- [x] **Step 2: Run full verification**

Run:

```bash
pnpm test
pnpm typecheck
pnpm --filter @documentee/cli documentee validate examples/basic
pnpm --filter @documentee/cli documentee build examples/basic --out dist-example
```

Expected:

- all tests pass
- typecheck passes
- validation succeeds
- `dist-example/index.html` exists
- `dist-example/api-reference/list-messages/index.html` exists
- `dist-example/llms.txt` exists
- `dist-example/llms-full.txt` exists

## Self-Review

- Research scope coverage: this milestone covers config, content, OpenAPI, route manifest, static HTML, LLM outputs, CLI, and the small-HTML/no-JS future constraint through HTML budget tests.
- Deferred by design: Astro renderer, Pagefind, full MDX component runtime, browser try-it, and Next.js adapters.
- No hosted platform work is included.
