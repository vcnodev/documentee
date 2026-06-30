# Next.js No-Client-JS Fixture Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stronger no-client-JS regression tests against generated real Next.js App Router and Pages Router fixture apps.

**Architecture:** Keep fixture generation inside `@documentee/renderer-next` so the package owns the Next-specific contract. Generate realistic fixture app directories, then audit generated source files and server-rendered Documentee HTML snapshots with shared helpers.

**Tech Stack:** TypeScript, Vitest, Node.js filesystem APIs, generated Next.js app files, `@documentee/react` server HTML rendering.

---

## File Map

- Create `packages/renderer-next/src/fixtures.ts` for fixture manifest creation, fixture app generation, source audit, HTML audit, and optional build helpers.
- Modify `packages/renderer-next/src/index.ts` to export fixture helpers.
- Add `packages/renderer-next/test/fixtures.test.ts`.
- Update `packages/renderer-next/README.md`.
- Update `docs/contributing/small-html-no-client-js.md`, `task_plan.md`, and `progress.md`.

## Task 1: Fixture Harness API

- [x] Write failing tests for fixture manifest shape and generated App Router / Pages Router directories.
- [x] Implement `createNoClientJsFixtureManifest` and `writeNextNoClientJsFixtureApps`.
- [x] Run `pnpm vitest run packages/renderer-next/test/fixtures.test.ts`.

## Task 2: Source And HTML Audits

- [x] Write failing tests for `auditNextFixtureSource` and `auditRenderedDocumenteeHtml`.
- [x] Implement source scanning for client markers and HTML budget checks for guide, API, and schema routes.
- [x] Run `pnpm vitest run packages/renderer-next/test/fixtures.test.ts`.

## Task 3: Optional Next Build Hook

- [x] Write test for optional build detection helper returning a skipped result when disabled.
- [x] Implement `maybeRunNextFixtureBuild` as an opt-in helper controlled by `DOCUMENTEE_RUN_NEXT_FIXTURE_BUILD`.
- [x] Run `pnpm vitest run packages/renderer-next/test/fixtures.test.ts`.

## Task 4: Docs And Notes

- [x] Update package README and contributor no-JS policy with fixture regression details.
- [x] Update task plan and progress files.
- [x] Run focused renderer-next tests.

## Task 5: Final Verification

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm build`.
- [x] Run unfinished-marker scan.
- [x] Commit implementation.
