# Visual Search MDX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish Documentee's generated static docs UI, expose a real search experience, and expand framework MDX compatibility.

**Architecture:** Keep generated sites static by enriching `packages/core/src/static-renderer.ts`, add a generated search route in `packages/core/src/manifest.ts`, and extend server-only MDX transforms in `packages/core/src/mdx-components.ts`. Pagefind JavaScript is loaded only on `/search/` when `search.provider` is `pagefind`.

**Tech Stack:** TypeScript, Vitest, static HTML/CSS, Pagefind assets.

---

### Task 1: Renderer Shell And Search Tests

**Files:**
- Modify: `packages/core/test/static-renderer.test.ts`
- Modify: `packages/core/test/manifest.test.ts`

- [ ] Add failing static renderer tests for polished layout classes, route-aware nav, API portal cards, `/search/` fallback markup, and Pagefind-only script/link behavior.
- [ ] Add failing manifest test that `buildManifest` appends `/search/` when `search.provider` is `pagefind`.
- [ ] Run `pnpm --filter @documentee/core test` or `pnpm test -- packages/core/test/static-renderer.test.ts packages/core/test/manifest.test.ts` and confirm the new tests fail for missing behavior.

### Task 2: Implement Static Shell And Search Route

**Files:**
- Modify: `packages/core/src/manifest.ts`
- Modify: `packages/core/src/static-renderer.ts`

- [ ] Add `search` to `RouteKind`.
- [ ] Generate a `/search/` route for Pagefind-enabled sites.
- [ ] Render a richer shell with `doc-shell`, `doc-sidebar`, `doc-main`, `doc-topbar`, `doc-content`, route-aware navigation classes, search link, responsive CSS, typography rules, API portal cards, and operation-section styling.
- [ ] Render `/search/` with a static route index and optional Pagefind UI assets only for `search.provider: "pagefind"`.
- [ ] Run the focused renderer and manifest tests until they pass.

### Task 3: MDX Compatibility Tests

**Files:**
- Modify: `packages/core/test/mdx-components.test.ts`

- [ ] Add failing tests for `DocCardList`, `Admonition`, `FileTree`, `Folder`, `File`, `Pre`, `CodeBlock`, `Expandable`, `Snippet`, `RequestExample`, and `ResponseExample`.
- [ ] Run the focused MDX test and confirm it fails for missing transforms.

### Task 4: Implement MDX Compatibility

**Files:**
- Modify: `packages/core/src/mdx-components.ts`

- [ ] Add transforms for Docusaurus, Nextra, and Mintlify compatibility components.
- [ ] Prefer static semantic HTML: cards, callouts, file-tree lists, code wrappers, details blocks, and example figures.
- [ ] Escape attributes and labels while preserving already-authored static inner content.
- [ ] Run the focused MDX test until it passes.

### Task 5: Documentation

**Files:**
- Modify: `README.md`
- Modify: `packages/core/README.md`
- Modify: `packages/search/README.md`
- Modify: `docs/contributing/small-html-no-client-js.md`

- [ ] Document the polished static shell, search route, Pagefind opt-in behavior, and new MDX compatibility components.
- [ ] Keep links between README, package READMEs, and contributing docs current.

### Task 6: Full Verification

**Files:**
- Generated: `dist-example/`

- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm build`.
- [ ] Run `pnpm validate`.
- [ ] Run `rm -rf dist-example && pnpm example:build`.
- [ ] Inspect generated HTML for `/search/`, no Pagefind scripts on ordinary pages, and polished shell classes.
