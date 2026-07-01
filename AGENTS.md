# AGENTS.md

This file is the working agreement for humans and agents changing Documentee.

## Core Rules

- Behavior changes require tests.
- User-facing changes require docs, README, or Markdown updates.
- Config changes require config tests and README examples.
- CLI changes require CLI tests and command docs.
- OpenAPI changes require fixture coverage.
- Static renderer changes must preserve small HTML/no Documentee client JS unless a feature explicitly opts in.
- Migration changes must include source-framework fixture tests.
- Documentation changes should keep links between [README.md](README.md), package READMEs, and [docs/contributing](docs/contributing/architecture.md) current.

## Verification

Run these before claiming completion:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm validate
rm -rf dist-example && pnpm example:build
```

Use focused tests during development, but do not use a focused test as proof that a full goal is complete.

## Architecture Boundaries

- `packages/core` owns config, content loading, manifest generation, validation, SEO, MDX transforms, theme CSS, and baseline static rendering.
- `packages/openapi` owns OpenAPI loading and compact operation normalization.
- `packages/cli` owns command routing, build/dev/preview servers, and migration helpers.
- `packages/llms` owns AI-readable text output.
- `packages/search` owns Pagefind integration.
- Renderer packages consume the shared manifest instead of forking the content pipeline.

## Links

- [Project README](README.md)
- [Architecture](docs/contributing/architecture.md)
- [Testing](docs/contributing/testing.md)
- [Package Boundaries](docs/contributing/package-boundaries.md)
- [Small HTML Policy](docs/contributing/small-html-no-client-js.md)
