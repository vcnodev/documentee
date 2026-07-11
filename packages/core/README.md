# @documentee/core

Renderer-agnostic core for Documentee.

The core package owns:

- `documentee.config.ts` and `docs.json` loading.
- Content discovery for Markdown/MDX docs.
- Versioned docs, i18n/RTL docs, navigation, and route manifest generation.
- Multi-spec OpenAPI portal routes and spec-scoped schema routes.
- Validation for duplicate routes, navigation targets, internal links, redirects, and version/spec references.
- Static HTML rendering, polished docs shell CSS, SEO tags, sitemap, robots, redirects, theme CSS, search page markup, optional ask-docs UI markup, and browser API playground markup with environment presets, request preview, and separated response output.
- Static MDX-style transforms for `Callout`, `Steps`, `Tabs`, `CodeGroup`, `Accordion`, `Card`, `CardGroup`, `ParamField`, `ResponseField`, `Frame`, `Icon`, `Badge`, `DocCardList`, `Admonition`, `FileTree`, `CodeBlock`, `Pre`, `Expandable`, `Snippet`, `RequestExample`, and `ResponseExample`.

## Theme

The `theme` config supports `preset`, `primaryColor`, `accentColor`, `backgroundColor`, `textColor`, `mutedTextColor`, `borderColor`, `codeBackgroundColor`, `fontFamily`, `codeFontFamily`, `radius`, `navWidth`, `customCss`, and `darkMode`. Preset names are `neutral`, `mint`, `slate`, `highContrast`, `classic`, `terminal`, `startup`, `enterprise`, `api`, and `minimal`.

Preset values are defaults, including dark-mode token sets when `darkMode` is enabled. Explicit custom tokens override the preset before the static renderer emits CSS variables with no Documentee client JavaScript.

## Layout

The `layout` config accepts shell preferences through `nav`, `toc`, `footer`, `breadcrumbs`, `editUrl`, and `announcement`. Defaults are sidebar navigation, a right-hand table of contents, footer enabled, and breadcrumbs enabled. `nav` can be `sidebar`, `topbar`, or `hybrid`; `toc` can be `right`, `inline`, or `hidden`.

## i18n

The `i18n` config accepts `defaultLocale`, `prefixDefaultLocale`, and `locales`. The default locale keeps existing routes unless `prefixDefaultLocale` is enabled. Non-default locale content is loaded from folders under the configured content directory, and RTL locales set `dir="rtl"` in the static renderer.

## Versions

The `versions` config accepts `id`, `label`, `routePrefix`, `content`, `default`, `latest`, and `deprecated`. Version ids and route prefixes must be unique. A single `latest` version can be marked for canonical metadata that points versioned routes at their matching unversioned routes, while `latest` and `deprecated` render lifecycle badges in the static version switcher.

## Plugins

The optional `plugins` config accepts typed `DocumenteePlugin` objects from TypeScript config files. Plugins can implement `transformManifest`, `transformHtml`, and `validate`. Hooks run in configured order after core builds the manifest or renders HTML, which keeps plugin behavior deterministic and prevents plugins from replacing content loading.

## Search

When `search.provider` is `pagefind`, the manifest includes `/search/`. That page renders grouped static results, summary counts, and Pagefind UI assets there only. Ordinary docs pages render a lightweight grouped search modal with static suggestions, a visible `Ctrl` + `K` affordance, and a small click/filter enhancer; they do not load Pagefind UI assets.

## Assistant

The optional `assistant` config renders a small ask-docs form only when `assistant.enabled` is true and `assistant.endpoint` is configured. The form posts the query and route context to the configured endpoint; core does not implement the endpoint.

See the [root README](../../README.md), [architecture notes](../../docs/contributing/architecture.md), and [repository rules](../../AGENTS.md).
