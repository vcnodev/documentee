# Architecture

Documentee is built around a renderer-agnostic site manifest.

Core flow:

1. `@documentee/core` loads config.
2. `@documentee/core` discovers Markdown/MDX content.
3. `@documentee/openapi` loads OpenAPI files and normalizes compact operation metadata.
4. `@documentee/core` builds a route manifest.
5. Renderers consume the same manifest.

Renderers must not fork the content pipeline. Static HTML, Astro, React, and Next.js output should all preserve the same route, OpenAPI, and validation semantics.

## Feature Ownership

- Config, theme tokens, content loading, MDX transforms, validation, route manifests, SEO, redirects, and static HTML rendering live in `packages/core`.
- OpenAPI 3.0/3.1 loading and compact operation normalization live in `packages/openapi`.
- CLI commands, including `init`, `validate`, `build`, `dev`, `preview`, and `migrate`, live in `packages/cli`.
- Static preview builds the deployable artifact first, then serves files from disk. Dev mode renders from source on each request.
- Migration compatibility for Mintlify, Docusaurus, and Nextra belongs in CLI migration helpers, while runtime MDX-style transforms belong in core.
- Renderer packages consume the manifest. They should not fork versioned docs, multi-spec portal, theme, or OpenAPI behavior.

See [Repository Rules](../../AGENTS.md), [Testing](testing.md), and [Small HTML And No Documentee Client JS](small-html-no-client-js.md).
