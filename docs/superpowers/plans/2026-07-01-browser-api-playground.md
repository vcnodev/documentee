# Browser API Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in browser API playground / try-it UI to generated OpenAPI operation pages.

**Architecture:** Keep the playground data compact in the existing config, OpenAPI normalizer, and route manifest flow. Render the UI in the static renderer only when an operation has playground enabled, and isolate browser behavior in a small generated script helper that can be unit tested as source.

**Tech Stack:** TypeScript, Zod, Vitest, OpenAPI normalization, static HTML renderer, browser `fetch`.

---

## File Map

- Modify `packages/core/src/config.ts` to parse `openapi.specs[].playground`.
- Modify `packages/openapi/src/types.ts` to add `ApiPlayground` and request parameter schema metadata used by the playground.
- Modify `packages/openapi/src/normalize.ts` to accept playground config and server base URL input.
- Modify `packages/core/src/manifest.ts` to pass spec playground options and base URL into normalization.
- Create `packages/core/src/playground.ts` for rendering the inline browser script source.
- Modify `packages/core/src/static-renderer.ts` to render the playground section and include the script only on enabled operation pages.
- Modify `examples/basic/documentee.config.ts` to enable the playground for the sample API.
- Update `README.md`, `task_plan.md`, and `progress.md`.
- Add tests in `packages/core/test/config.test.ts`, `packages/openapi/test/normalize.test.ts`, `packages/core/test/playground.test.ts`, and `packages/core/test/static-renderer.test.ts`.

## Task 1: Config Schema

- [x] Write failing config tests for enabled playground settings and disabled defaults.
- [x] Implement `playground` config parsing in `packages/core/src/config.ts`.
- [x] Run `pnpm vitest run packages/core/test/config.test.ts`.

## Task 2: Operation Normalization

- [x] Write failing OpenAPI normalization tests for playground metadata and OpenAPI server fallback.
- [x] Implement `ApiPlayground` types and normalizer input options.
- [x] Run `pnpm vitest run packages/openapi/test/normalize.test.ts`.

## Task 3: Playground Script Helper

- [x] Write failing tests for script source containing path/query/header/auth/body/fetch/result behavior.
- [x] Implement `renderPlaygroundScript`.
- [x] Run `pnpm vitest run packages/core/test/playground.test.ts`.

## Task 4: Static Renderer UI

- [x] Write failing renderer tests for enabled playground UI/script and disabled no-script behavior.
- [x] Render base URL, parameter, auth, body, send, result, and CORS note fields.
- [x] Include the script only when the current route has an enabled playground.
- [x] Run `pnpm vitest run packages/core/test/static-renderer.test.ts`.

## Task 5: Example And Docs

- [x] Enable playground in `examples/basic/documentee.config.ts`.
- [x] Update README and planning notes.
- [x] Run CLI validate/build for `examples/basic`.
- [x] Inspect generated API HTML for `data-documentee-playground` and playground script.

## Task 6: Final Verification

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm build`.
- [x] Run CLI validate/build for `examples/basic`.
- [x] Scan for unfinished markers.
- [x] Commit implementation.
