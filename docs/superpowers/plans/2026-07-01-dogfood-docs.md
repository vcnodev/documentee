# Dogfood Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Documentee's own docs with Documentee from `docs/`, including config/API reference and AI-agent-ready guidance.

**Architecture:** Add a root `documentee.config.ts` that points at `docs/`, add first-class docs pages under `docs/`, and test the result through the real config, manifest, and validation pipeline. Keep existing contributing/superpowers documents in place as deeper generated routes.

**Tech Stack:** TypeScript config, MDX/Markdown docs, Vitest, Documentee CLI/core.

---

### Task 1: Dogfood Docs Tests

**Files:**
- Create: `packages/cli/test/dogfood-docs.test.ts`

- [x] Add a test that loads root `documentee.config.ts`, builds the manifest from `.`, and expects primary routes: `/`, `/get-started/quickstart`, `/configuration`, `/api-reference/config`, `/api-reference/cli`, `/api-reference/openapi`, `/components`, `/ai-agents`, and `/ai-agents/doc-builder-guide`.
- [x] Add a test that runs `validateManifest` on the root manifest and expects no diagnostics.
- [x] Add a test that reads `docs/api-reference/config.mdx` and expects `theme.preset`, `openapi.specs`, `versions`, `search.provider`, `seo`, `redirects`, and `playground`.
- [x] Add a test that reads `docs/ai-agents/index.mdx` and `docs/ai-agents/doc-builder-guide.mdx` and expects links to `AGENTS.md`, `/configuration`, `/api-reference/config`, `/api-reference/cli`, `/contributing/architecture`, `/contributing/testing`, and `/contributing/small-html-no-client-js`.
- [x] Run `pnpm vitest run packages/cli/test/dogfood-docs.test.ts` and confirm it fails because the root docs site does not exist yet.

### Task 2: Root Documentee Config

**Files:**
- Create: `documentee.config.ts`

- [x] Add root site metadata, `content: { directory: "docs" }`, primary navigation, `search.provider: "pagefind"`, SEO defaults, and a theme preset.
- [x] Make navigation point only to existing first-class pages and contributing references.
- [x] Run the focused dogfood docs test and confirm remaining failures are missing docs pages.

### Task 3: First-Class Docs Pages

**Files:**
- Create: `docs/index.mdx`
- Create: `docs/get-started/quickstart.mdx`
- Create: `docs/configuration.mdx`
- Create: `docs/api-reference/config.mdx`
- Create: `docs/api-reference/cli.mdx`
- Create: `docs/api-reference/openapi.mdx`
- Create: `docs/components.mdx`

- [x] Write concise user docs for installing, configuring, building, previewing, validating, static output, search, theme presets, MDX components, OpenAPI references, and CLI commands.
- [x] Ensure internal links use generated routes, not source file paths.
- [x] Run focused tests and fix broken links or missing required reference fields.

### Task 4: AI-Agent Docs

**Files:**
- Create: `docs/ai-agents/index.mdx`
- Create: `docs/ai-agents/doc-builder-guide.mdx`

- [x] Write an agent entrypoint with reading order and links to repo rules.
- [x] Write a doc builder guide with edit rules, update checklist, verification commands, and references to config/API docs.
- [x] Ensure required links are present and valid.
- [x] Run focused tests until they pass.

### Task 5: README And Package Script

**Files:**
- Modify: `README.md`
- Modify: `package.json`

- [x] Add a root docs build command, such as `docs:build`.
- [x] Mention that the root docs site is built by Documentee from `docs/`.
- [x] Run focused tests after metadata/doc updates.

### Task 6: Full Verification

**Files:**
- Generated: `dist-docs/`
- Generated: `dist-example/`

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm build`.
- [x] Run `pnpm docs:validate`.
- [x] Run `pnpm validate`.
- [x] Run `rm -rf dist-example && pnpm example:build`.
- [x] Run `rm -rf dist-docs && pnpm docs:build`.
- [x] Inspect generated `dist-docs/index.html`, `dist-docs/api-reference/config/index.html`, and `dist-docs/ai-agents/index.html`.
