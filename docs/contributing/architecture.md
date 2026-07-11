# Architecture

Documentee is built around a renderer-agnostic site manifest.

Core flow:

1. `@documentee/core` loads config.
2. `@documentee/core` discovers Markdown/MDX content, applying `content.exclude` patterns relative to each content directory.
3. `@documentee/openapi` loads OpenAPI files and normalizes compact operation metadata.
4. `@documentee/core` builds a route manifest.
5. Renderers consume the same manifest.

Renderers must not fork the content pipeline. Static HTML, Astro, React, and Next.js output should all preserve the same route, OpenAPI, and validation semantics.

Content visibility is owned by core content loading. For example, `content: { directory: "docs", exclude: ["superpowers/**"] }` prevents matching Markdown/MDX files from becoming routes, which also keeps them out of derived search, sitemap, and LLM text artifacts.

## Feature Ownership

- Config, theme tokens, content loading, MDX transforms, validation, route manifests, SEO, redirects, and static HTML rendering live in `packages/core`.
- OpenAPI 3.0/3.1 loading and compact operation normalization live in `packages/openapi`.
- CLI commands, including `init`, `validate`, `build`, `dev`, `preview`, and `migrate`, live in `packages/cli`.
- Static preview builds the deployable artifact first, then serves files from disk. Dev mode renders from source on each request.
- Migration compatibility for Mintlify, Docusaurus, and Nextra belongs in CLI migration helpers, while runtime MDX-style transforms belong in core.
- Renderer packages consume the manifest. They should not fork versioned docs, multi-spec portal, theme, or OpenAPI behavior.
- Plugins are narrow post-pipeline hooks. `transformManifest` receives the already-built manifest, `transformHtml` receives generated HTML, and `validate` contributes diagnostics. Plugins must not replace content loading, OpenAPI normalization, or renderer package ownership boundaries.

See [Repository Rules](../../AGENTS.md), [Testing](testing.md), and [Small HTML And No Documentee Client JS](small-html-no-client-js.md).
