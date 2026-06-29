# Documentee Steps 2-8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Complete the next Documentee implementation slice: publishing-clean built exports, `documentee dev`, richer OpenAPI HTML, Pagefind indexing, Astro renderer scaffold, small-HTML/no-Documentee-client-JS Next.js spike, and validation hardening.

**Architecture:** Keep `@documentee/core` as the renderer-agnostic source of truth. Add optional renderer packages (`@documentee/renderer-astro`, `@documentee/renderer-next`, `@documentee/react`) that consume the same manifest. Keep no-JS work honest with payload-budget tests rather than large HTML dumps.

**Tech Stack:** TypeScript, Node.js ESM, Vitest, pnpm workspaces, Pagefind Node API, Astro integration scaffold, React server-renderable components, Node HTTP server.

---

## Task 1: Publishing-Clean Package Outputs

**Files:** package manifests, tsconfig package output settings, CLI bin shims.

- [x] Write tests/scripts proving built package exports resolve from `dist`.
- [x] Switch package `exports` to `./dist/src/index.js` and `types` to `./dist/src/index.d.ts`.
- [x] Switch CLI bins to built JS files.
- [x] Add package `files` lists for publishable output.
- [x] Update scripts so tests build before running package-boundary checks.

## Task 2: `documentee dev`

**Files:** `packages/cli/src/commands/dev.ts`, CLI tests.

- [x] Write a test that starts a dev server on port `0`, requests `/`, and sees generated HTML.
- [x] Implement dev server using Node `http`.
- [x] Rebuild manifest per request so content/config/OpenAPI edits appear without a watcher.
- [x] Add `documentee dev <project> --port <port>` to CLI.

## Task 3: Richer OpenAPI Rendering

**Files:** `packages/openapi/src/types.ts`, `normalize.ts`, `packages/core/src/static-renderer.ts`, tests.

- [x] Write tests for parameters, request body presence, response codes, auth schemes, and compact schema links.
- [x] Normalize operation details without inlining the full schema graph.
- [x] Render API operation sections for auth, parameters, request body, responses, and schema references.
- [x] Preserve HTML payload budget tests.

## Task 4: Pagefind Search

**Files:** `packages/search/*`, `packages/cli/src/commands/build.ts`, tests.

- [x] Write a test that build can emit Pagefind artifacts when search provider is `pagefind`.
- [x] Add `@documentee/search` package.
- [x] Use Pagefind Node API after static render.
- [x] Document that Pagefind is for static output and not the strict no-JS Next mode.

## Task 5: Astro Renderer Scaffold

**Files:** `packages/renderer-astro/*`, tests.

- [x] Add a package that turns a manifest into Astro-ready route module metadata and theme assets.
- [x] Add tests proving it consumes the same manifest and emits route definitions.
- [x] Do not build a full custom Astro app yet; keep this as a scaffold over the current core model.

## Task 6: React And Next.js Small-HTML No-JS Spike

**Files:** `packages/react/*`, `packages/renderer-next/*`, tests.

- [x] Add server-renderable React component functions that return static markup strings or React elements without hooks.
- [x] Add Next App Router and Pages Router adapter metadata generators.
- [x] Add tests asserting no `"use client"`, no event handlers, no Documentee script tags, and route-level HTML budgets.
- [x] Keep the spike small and explicit: adapters consume manifests, they do not fork the content pipeline.

## Task 7: Validation Hardening

**Files:** `packages/core/src/validation.ts`, CLI validate command, tests.

- [x] Add tests for duplicate routes, missing navigation page targets, duplicate OpenAPI operation routes, and broken internal links.
- [x] Implement validation diagnostics with actionable messages.
- [x] Make `documentee validate` fail on validation errors.

## Task 8: Final Verification And Docs

**Files:** `README.md`, `task_plan.md`, `progress.md`.

- [x] Update README with new commands and package notes.
- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm build`.
- [x] Run CLI validate/build/dev smoke checks.
- [x] Scan for unfinished markers.
