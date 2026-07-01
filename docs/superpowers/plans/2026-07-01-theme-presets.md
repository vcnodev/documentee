# Theme Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add named theme presets (`mint`, `slate`, `neutral`, `highContrast`) while preserving custom theme token overrides.

**Architecture:** Extend the theme config schema with a preset enum, then resolve preset tokens inside the static renderer before CSS variables are emitted. User-provided custom tokens override preset values.

**Tech Stack:** TypeScript, Zod, Vitest, static CSS variables.

---

### Task 1: Config Preset Tests

**Files:**
- Modify: `packages/core/test/config.test.ts`

- [x] Add a failing test that loads `docs.json` with `theme: { preset: "mint" }` and expects `config.theme.preset` to be `"mint"`.
- [x] Add a failing test that loads `docs.json` with `theme: { preset: "ocean" }` and expects config loading to reject the invalid enum value.
- [x] Run `pnpm vitest run packages/core/test/config.test.ts` and confirm the new tests fail because `preset` is not in the schema.

### Task 2: Renderer Preset Tests

**Files:**
- Modify: `packages/core/test/static-renderer.test.ts`

- [x] Add a failing renderer test for `theme: { preset: "mint", darkMode: true }` that expects mint preset CSS variables such as `--doc-primary: #0f766e;`.
- [x] Add a failing renderer test for `theme: { preset: "slate", primaryColor: "#db2777", navWidth: "320px", darkMode: false }` that expects custom `primaryColor` and `navWidth` to override preset values.
- [x] Run `pnpm vitest run packages/core/test/static-renderer.test.ts` and confirm the new tests fail for missing preset resolution.

### Task 3: Implement Preset Schema And Resolution

**Files:**
- Modify: `packages/core/src/config.ts`
- Modify: `packages/core/src/static-renderer.ts`

- [x] Add `preset: z.enum(["mint", "slate", "neutral", "highContrast"]).optional()` to `themeSchema`.
- [x] Add a `themePresets` map in `static-renderer.ts` with token defaults for `mint`, `slate`, `neutral`, and `highContrast`.
- [x] Merge preset values with user tokens in `renderThemeCss` so explicit tokens win.
- [x] Run the focused config and renderer tests until they pass.

### Task 4: Documentation And Example

**Files:**
- Modify: `README.md`
- Modify: `packages/core/README.md`
- Modify: `examples/basic/documentee.config.ts`

- [x] Document `theme.preset`, supported names, and the override rule.
- [x] Update the example config to use a preset plus at least one explicit override.
- [x] Run focused tests again after docs/example changes.

### Task 5: Verification

**Files:**
- Generated: `dist-example/`

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm build`.
- [x] Run `pnpm validate`.
- [x] Run `rm -rf dist-example && pnpm example:build`.
- [x] Inspect generated example HTML for preset CSS variables and custom overrides.
