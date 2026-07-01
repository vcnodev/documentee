# @documentee/core

Renderer-agnostic core for Documentee.

The core package owns:

- `documentee.config.ts` and `docs.json` loading.
- Content discovery for Markdown/MDX docs.
- Versioned docs, navigation, and route manifest generation.
- Multi-spec OpenAPI portal routes and spec-scoped schema routes.
- Validation for duplicate routes, navigation targets, internal links, redirects, and version/spec references.
- Static HTML rendering, SEO tags, sitemap, robots, redirects, theme CSS, and browser API playground markup.
- Static MDX-style transforms for `Callout`, `Steps`, `Tabs`, `CodeGroup`, `Accordion`, `Card`, `CardGroup`, `ParamField`, `ResponseField`, `Frame`, `Icon`, and `Badge`.

## Theme

The `theme` config supports `primaryColor`, `accentColor`, `backgroundColor`, `textColor`, `mutedTextColor`, `borderColor`, `codeBackgroundColor`, `fontFamily`, `codeFontFamily`, `radius`, `navWidth`, `customCss`, and `darkMode`. The static renderer emits these as CSS variables with no Documentee client JavaScript.

See the [root README](../../README.md), [architecture notes](../../docs/contributing/architecture.md), and [repository rules](../../AGENTS.md).
