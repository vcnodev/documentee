# SEO Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sitemap, redirects, robots, and SEO metadata support to Documentee static builds.

**Architecture:** Extend the existing config/content/manifest/static-renderer flow instead of adding a separate plugin. Keep page HTML metadata in the route renderer, and write build artifacts from `renderStaticSite` so CLI, dev, and future renderers can consume the same manifest semantics.

**Tech Stack:** TypeScript, Zod, Vitest, Node.js filesystem APIs, static HTML/XML/text output.

---

## File Map

- Modify `packages/core/src/config.ts` for `seo` and `redirects` schemas.
- Modify `packages/core/src/content.ts` for page frontmatter SEO fields.
- Create `packages/core/src/seo.ts` for URL joining, metadata rendering, sitemap, robots, redirects, and host artifact helpers.
- Modify `packages/core/src/static-renderer.ts` to use SEO metadata and write SEO assets during static builds.
- Modify `packages/core/src/validation.ts` to report redirect route conflicts.
- Update `examples/basic/documentee.config.ts` and page frontmatter.
- Update `README.md`, `task_plan.md`, and `progress.md`.
- Add/extend tests in `packages/core/test/config.test.ts`, `packages/core/test/content.test.ts`, `packages/core/test/static-renderer.test.ts`, and `packages/core/test/validation.test.ts`.

## Task 1: Config And Content Metadata

- [x] Add failing tests for default and explicit `seo`/`redirects` config.
- [x] Add failing content test for canonical, robots, image, social title, and social description frontmatter.
- [x] Implement config and content parsing.
- [x] Run `pnpm vitest run packages/core/test/config.test.ts packages/core/test/content.test.ts`.

## Task 2: SEO Helper Outputs

- [x] Add failing tests for rendered metadata, sitemap XML, robots text, redirect fallback HTML, `_redirects`, and Vercel redirects JSON.
- [x] Implement `packages/core/src/seo.ts`.
- [x] Run `pnpm vitest run packages/core/test/seo.test.ts`.

## Task 3: Static Renderer Integration

- [x] Add failing static renderer tests for metadata and emitted files.
- [x] Integrate SEO metadata into page HTML.
- [x] Write `sitemap.xml`, `robots.txt`, redirect fallback pages, `_redirects`, and `vercel.json` from `renderStaticSite`.
- [x] Run `pnpm vitest run packages/core/test/static-renderer.test.ts`.

## Task 4: Validation

- [x] Add failing validation test for redirect source conflicts with generated routes.
- [x] Implement redirect conflict validation.
- [x] Run `pnpm vitest run packages/core/test/validation.test.ts`.

## Task 5: Example And Docs

- [x] Configure `site.url`, `seo`, and one redirect in `examples/basic/documentee.config.ts`.
- [x] Add page frontmatter SEO override to the quickstart page.
- [x] Update README and planning notes.
- [x] Run CLI validate/build and inspect generated files.

## Task 6: Final Verification

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm build`.
- [x] Run CLI validate/build for `examples/basic`.
- [x] Inspect `dist-example/sitemap.xml`, `robots.txt`, `_redirects`, `vercel.json`, redirect HTML, and quickstart metadata.
- [x] Scan for unfinished markers.
- [x] Commit implementation.
