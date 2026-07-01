# Platform Polish Design

## Goal

Documentee should gain deeper theme customization, better MDX migration compatibility, a static preview command, broader OpenAPI 3.0/3.1 coverage, and complete project documentation/rules that describe how to work in the codebase.

## Scope

This pass adds:

- Theme tokens beyond `primaryColor` and `darkMode`.
- Migration cleanup for common framework-specific MDX components.
- A `documentee preview` CLI command that serves built static output.
- OpenAPI 3.0 and 3.1 fixture coverage for richer normalization cases.
- Root and package README updates, `AGENTS.md`, and cross-linked codebase rules.

This pass does not add a browser-based visual theme editor, live reload, external `$ref` resolution, full MDX compilation, or client-side runtime adapters.

## Theme Customization

`theme` remains optional and backward compatible. Existing config keeps working:

```ts
theme: {
  primaryColor: "#2563eb",
  darkMode: true,
}
```

The expanded shape supports:

```ts
theme: {
  primaryColor: "#2563eb",
  accentColor: "#0f766e",
  backgroundColor: "#ffffff",
  textColor: "#18181b",
  mutedTextColor: "#52525b",
  borderColor: "#d4d4d8",
  codeBackgroundColor: "#f4f4f5",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  codeFontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  radius: "8px",
  navWidth: "280px",
  customCss: ".doc-callout { border-left-width: 4px; }",
  darkMode: true,
}
```

The static renderer emits these as CSS variables and uses those variables throughout the baseline HTML. `customCss` is appended inside the generated `<style>` block after the built-in rules. Values are escaped for safe CSS string inclusion where needed and remain static HTML with no client JavaScript.

Docs JSON compatibility maps existing Mintlify-style `colors.primary` to `theme.primaryColor` and keeps default theme values stable.

## MDX Migration Compatibility

Migration should copy source files and normalize common framework-specific MDX syntax so generated Documentee pages are less likely to contain dead imports or unsupported wrappers.

The migration command will run copied `.md` and `.mdx` files through a compatibility transform:

- Remove import/export lines that only exist for framework MDX runtimes.
- Convert Docusaurus admonition blocks such as `:::tip` into `<Callout type="tip">`.
- Convert Docusaurus `<Tabs>` / `<TabItem value="curl" label="cURL">` into Documentee `<Tabs>` / `<Tab title="cURL">`.
- Convert Nextra `<Callout type="warning">` to Documentee `Callout`, unwrap `<Cards>` to `CardGroup`, and preserve `<Card>` entries with `title`, `href`, and body content.
- Preserve unknown JSX as text rather than deleting content.

This is intentionally a migration helper, not a full MDX compiler. Runtime rendering remains handled by the existing core static transforms.

## Preview CLI Command

`documentee preview <project> --out <dir> --port <port>` builds static output into `outDir`, then serves that directory over HTTP.

Behavior:

- Default `--out` is `dist`.
- Default `--port` is `3000`; `0` asks the OS for a free port.
- The command logs `Documentee preview server running at http://127.0.0.1:<port>`.
- Requests map `/path/` and `/path` to `index.html` files.
- Static assets such as `_pagefind/pagefind.js`, `robots.txt`, `sitemap.xml`, `llms.txt`, and redirect fallback pages are served from disk.
- Missing files return `404`.

`documentee dev` remains a live manifest server that rebuilds routes per request. `preview` validates the built artifact users will deploy.

## OpenAPI 3.0/3.1 Fixture Coverage

OpenAPI coverage should exercise both loader and normalizer behavior with representative 3.0 and 3.1 documents:

- YAML and JSON loading.
- OpenAPI 3.0 nullable schemas.
- OpenAPI 3.1 JSON Schema keywords such as `oneOf`, `anyOf`, `allOf`, and `const`.
- Parameter `$ref` through `components.parameters`.
- Request body `$ref` through `components.requestBodies`.
- Response `$ref` through `components.responses`.
- Multiple content types.
- Operation-level and root-level security.
- Code samples with both `lang/source` and `language/code` shapes.

Implementation remains compact: operation pages should reference schema/component names and avoid inlining large schema graphs. External `$ref` resolution is out of scope for this pass.

## Documentation And Rules

After features land, documentation should describe the actual current feature set.

Required documentation:

- Root `README.md`: project overview, feature matrix, quickstart, CLI commands, config examples, links to package docs and contributor rules.
- Package READMEs: focused usage/ownership notes for each package.
- `AGENTS.md`: coding rules for humans and agents working in this repo.
- `docs/contributing/testing.md`: keep TDD and full verification expectations explicit.
- `docs/contributing/architecture.md`: include theme, preview, migration, OpenAPI, and docs ownership boundaries where relevant.

Required rules:

- Behavior changes require tests.
- User-facing changes require docs/README/Markdown updates.
- Config changes require config tests and README examples.
- CLI changes require CLI tests and command docs.
- OpenAPI changes require fixture coverage.
- Static renderer changes must preserve small HTML/no Documentee client JS unless a feature explicitly opts in.
- Before completion, run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

Cross-links should connect root README, package READMEs, `AGENTS.md`, and `docs/contributing/*` so future contributors can navigate without guessing.

## Testing

Coverage should include:

- Theme config normalization and renderer CSS output.
- Docs JSON color compatibility.
- Migration fixture tests for Docusaurus, Nextra, and Mintlify-style MDX.
- Preview command serving built HTML and static assets.
- CLI routing for `preview`.
- OpenAPI 3.0 and 3.1 fixture normalization tests.
- README/AGENTS/package README presence and cross-link tests where existing package-boundary tests fit.

Full verification remains:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm validate
rm -rf dist-example && pnpm example:build
```
