# @documentee/core

Renderer-agnostic core for Documentee.

The core package owns:

- `documentee.config.ts` and `docs.json` loading.
- Content discovery for Markdown/MDX docs.
- Versioned docs, navigation, and route manifest generation.
- Multi-spec OpenAPI portal routes and spec-scoped schema routes.
- Validation for duplicate routes, navigation targets, internal links, redirects, and version/spec references.
- Static HTML rendering, polished docs shell CSS, SEO tags, sitemap, robots, redirects, theme CSS, search page markup, and browser API playground markup.
- Static MDX-style transforms for `Callout`, `Steps`, `Tabs`, `CodeGroup`, `Accordion`, `Card`, `CardGroup`, `ParamField`, `ResponseField`, `Frame`, `Icon`, `Badge`, `DocCardList`, `Admonition`, `FileTree`, `CodeBlock`, `Pre`, `Expandable`, `Snippet`, `RequestExample`, and `ResponseExample`.

## Theme

The `theme` config supports `primaryColor`, `accentColor`, `backgroundColor`, `textColor`, `mutedTextColor`, `borderColor`, `codeBackgroundColor`, `fontFamily`, `codeFontFamily`, `radius`, `navWidth`, `customCss`, and `darkMode`. The static renderer emits these as CSS variables with no Documentee client JavaScript.

## Search

When `search.provider` is `pagefind`, the manifest includes `/search/`. That page renders a static fallback index and loads Pagefind UI assets there only; ordinary docs pages keep the no Documentee client JavaScript baseline.

See the [root README](../../README.md), [architecture notes](../../docs/contributing/architecture.md), and [repository rules](../../AGENTS.md).
