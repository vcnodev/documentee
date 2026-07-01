# Visual Search MDX Polish Design

## Goal

Make the generated static site feel closer to a polished hosted docs product while preserving Documentee's small HTML and no Documentee client JavaScript defaults.

## Scope

- Improve the generated static HTML shell: layout, navigation hierarchy, article typography, API portal cards, operation pages, dark mode, and responsive CSS.
- Add a first-class `/search/` route with static fallback results for no-JS users.
- When `search.provider` is `pagefind`, load Pagefind UI only on `/search/`.
- Extend MDX compatibility for common Mintlify, Docusaurus, and Nextra components.

## Architecture

The static renderer remains the owner of generated HTML and CSS. It will render a richer document shell with semantic regions, route-aware navigation classes, a search entry point, and CSS that works without runtime state. The manifest will gain a generated search route when search is configured, so search is a normal static page.

MDX compatibility remains a deterministic transform layer in `packages/core/src/mdx-components.ts`. New framework tags will become static HTML primitives that use existing or new renderer CSS classes. This avoids bundling React, framework runtimes, or client hydration.

## Search

`search.provider: "none"` keeps ordinary docs pages free of search scripts and does not add Pagefind assets. The search route still renders a static page index only when the renderer decides search should be exposed.

`search.provider: "pagefind"` generates `/search/` with:

- A no-JS static list of docs/API routes.
- A `<link rel="stylesheet" href="/_pagefind/pagefind-ui.css">`.
- A module script that initializes Pagefind UI into a dedicated container.
- A noscript/static fallback that remains useful if the script is blocked.

Pagefind JavaScript is allowed only because the site owner explicitly opted in. It must not appear on ordinary docs pages.

## Visual Design

The default look should be quiet, dense, and documentation-focused:

- Fixed-width sidebar on desktop with brand, search link, versions, and grouped navigation.
- Clear active route styling using server-rendered classes.
- Article width tuned for reading, with better heading rhythm, tables, code, figures, and callouts.
- API portal specs rendered as compact cards with spec id, version, operation count, and primary link.
- Operation pages rendered as structured sections with method badges, endpoint text, metadata, tables, request/response cards, code samples, and playground framing.
- Responsive CSS turns the shell into a single-column flow on narrow screens.
- Dark mode is driven by existing theme variables and `color-scheme`.

## MDX Compatibility

Add static transforms for:

- Docusaurus `DocCardList`.
- Docusaurus admonition components such as `<Admonition type="tip">`.
- Nextra `FileTree`, `Folder`, and `File`.
- Nextra `Pre` and `CodeBlock` wrappers.
- Mintlify `Expandable`.
- Mintlify `Snippet`.
- Mintlify `RequestExample`.
- Mintlify `ResponseExample`.

Transforms should support common attributes, escape user-provided text, and leave inner Markdown/HTML content as static readable content where possible.

## Testing

- Static renderer tests prove the polished shell, active nav classes, API portal cards, search route, no-JS fallback, and Pagefind-only script behavior.
- Manifest tests prove `/search/` is generated when Pagefind search is enabled.
- MDX tests prove each added compatibility component renders stable static markup.
- Existing full verification remains required: `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm validate`, and `pnpm example:build`.

## Docs

Update the root README, core README, search README, and small HTML policy to explain:

- The polished static shell.
- Search route behavior.
- The explicit Pagefind opt-in script exception.
- The expanded MDX compatibility layer.
