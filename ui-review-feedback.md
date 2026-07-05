# Documentee UI Review Feedback

Date: 2026-07-04

Scope reviewed:

- Dogfood docs generated from the repository root.
- Example API docs generated from `examples/basic`.
- Desktop viewport around 1280 x 720.
- Mobile viewport around 390 x 844.
- Static docs pages, search entry points, API operation pages, and API playground UI.

Overall assessment:

Documentee has a strong baseline for a static documentation renderer. The current UI is readable, lightweight, and coherent with the project goal of small static HTML. The sidebar grouping is clear, the dark theme has a polished developer-docs feel, focus styles are present, and the API operation pages provide useful structure instead of simply dumping OpenAPI content.

The biggest opportunities are mobile navigation, predictable layout behavior, form polish in dark mode, and a few accessibility refinements. The improvements below are ordered by user impact.

## Implementation Status

Closed in the current UI pass:

- Mobile top navigation with search and menu access.
- Predictable `CardGroup` column counts with mobile collapse.
- Five-column API overview grid with responsive collapse.
- Themed API playground controls and URL semantics for Base URL.
- Decorative card icons hidden from assistive technology.
- Generated heading anchors and "On this page" navigation.
- Search trigger presentation with modal suggestions when Pagefind is enabled.
- Playground loading, success, and error result states.
- Semantic success, warning, danger, and info color tokens for status UI.
- API portal and operation card polish.
- Right-side table of contents for long pages, hidden on API widths where it would squeeze content.
- Copy buttons for rendered code blocks when code exists.
- Breadcrumbs and previous/next page navigation from configured navigation.
- Filterable API sidebar navigation for larger OpenAPI specs.

## 1. Make Navigation And Search Available At The Top On Mobile

Priority: High

Current behavior:

On mobile, the layout puts `.doc-main` before `.doc-sidebar`. This means users land directly on page content and only reach navigation/search after scrolling to the bottom of the page. For docs sites, navigation and search are primary actions, especially on mobile where users frequently jump between reference pages.

Affected code:

- `packages/core/src/static-renderer.ts`
- Mobile styles around `.doc-shell`, `.doc-main`, and `.doc-sidebar`
- Rendered shell markup around the sidebar and main content

Why it matters:

- Users cannot quickly browse sections from the top of a mobile page.
- Search appears hidden even when Pagefind is enabled.
- Long pages make navigation feel unreachable.
- The current behavior is especially painful for API reference pages, where users often need to jump between endpoints.

Recommended improvement:

Add a compact mobile header that remains near the top of the experience. It should expose at least:

- Site name or logo.
- Search trigger when search is enabled.
- Menu trigger for navigation.

Implementation direction:

- Keep the desktop sticky sidebar unchanged.
- Add a mobile-only header inside the shell or main area.
- Hide the desktop sidebar behind a mobile menu below `820px`.
- Use a `<details>` disclosure, a checkbox-driven CSS drawer, or a minimal client script if the project explicitly accepts that tradeoff.
- Because Documentee has a small HTML/no client JS policy, prefer a semantic `<details>` based menu first.

Possible structure:

```html
<header class="doc-mobile-header">
  <a class="doc-mobile-brand" href="/">Documentee</a>
  <div class="doc-mobile-actions">
    <a class="doc-mobile-search" href="/search/" data-search-open>Search</a>
    <details class="doc-mobile-menu">
      <summary>Menu</summary>
      <!-- existing navigation -->
    </details>
  </div>
</header>
```

Suggested CSS behavior:

- Desktop: `.doc-mobile-header { display: none; }`
- Mobile: `.doc-mobile-header { display: flex; position: sticky; top: 0; z-index: 10; }`
- Mobile: hide or collapse the normal sidebar instead of placing it after content.
- Preserve keyboard focus outlines and escape routes for the menu.

Testing:

- Add static renderer tests that assert mobile header/menu markup exists when rendering a route.
- Add a snapshot or HTML assertion that search remains reachable on mobile when search is enabled.
- Manually verify at 390px width that navigation and search are visible before scrolling.

## 2. Make Card Group Column Counts Predictable

Priority: High

Current behavior:

The homepage uses `<CardGroup cols="2">`, but the generated desktop layout displayed three cards in the first row and one card below. That happens because `.doc-card-group-2` uses `auto-fit` with `minmax(260px, 1fr)`, so the requested column count is treated as a suggestion instead of a contract.

Affected code:

- `packages/core/src/static-renderer.ts`
- `.doc-card-group`, `.doc-card-group-1`, `.doc-card-group-2`, `.doc-card-group-3`
- `packages/core/src/mdx-components.ts`, where `CardGroup` maps `cols` into classes

Why it matters:

- A documented `cols` prop should produce the requested number of columns when space allows.
- Three cards plus one orphan card feels accidental and unbalanced.
- Docs authors will expect `cols="2"` to be stable.

Recommended improvement:

Make explicit column classes honor their column counts on desktop:

```css
.doc-card-group-1 { grid-template-columns: 1fr; }
.doc-card-group-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.doc-card-group-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
```

Then collapse responsively:

```css
@media (max-width: 820px) {
  .doc-card-group-2,
  .doc-card-group-3 {
    grid-template-columns: 1fr;
  }
}
```

Optional refinement:

If the renderer wants to protect narrow containers, add an intermediate breakpoint:

```css
@media (max-width: 1100px) {
  .doc-card-group-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

Testing:

- Add static renderer tests for `CardGroup cols="2"` and `CardGroup cols="3"` class output.
- Consider a CSS snapshot test if the project already validates generated CSS.
- Manually verify homepage card layout on desktop and mobile.

## 3. Fix The API Overview Grid Orphan Item

Priority: Medium High

Current behavior:

API operation pages render five overview items:

- Method
- Path
- Auth
- Request
- Responses

The desktop grid uses four columns, so the fifth item sits alone on a second row.

Affected code:

- `packages/core/src/static-renderer.ts`
- `.api-overview-grid`
- `renderApiOverview`

Why it matters:

- The orphaned fifth item makes the layout look unfinished.
- API pages are one of the most important surfaces in Documentee.
- The overview grid should scan quickly and feel intentionally composed.

Recommended improvement:

Use five columns on wide API pages:

```css
.api-overview-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
```

Then retain responsive collapse:

```css
@media (max-width: 1100px) {
  .api-overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .api-overview-grid {
    grid-template-columns: 1fr;
  }
}
```

Alternative:

If five columns feel too dense for long paths, make the path item span two columns and place the remaining items around it:

```css
.api-overview-item-path {
  grid-column: span 2;
}
```

That would require class names per overview item.

Testing:

- Add HTML tests if class names change.
- Manually verify long paths such as `/messages/{id}` and deeper nested paths.
- Check that text wraps cleanly without horizontal scrolling.

## 4. Give API Playground Inputs Explicit Themed Styling

Priority: Medium High

Current behavior:

The playground styles input borders and padding, but not explicit background or text colors. In dark mode, native input styling appears as muddy gray blocks that do not match the rest of the UI.

Affected code:

- `packages/core/src/static-renderer.ts`
- `.api-playground input`
- `.api-playground select`
- `.api-playground textarea`
- `.api-playground button`
- `renderApiPlayground`
- `renderParameterInputs`
- `renderPlaygroundAuth`
- `renderPlaygroundBody`

Why it matters:

- The playground is an interactive, user-facing tool.
- Native dark-mode control colors make the page look less finished than the static API reference sections.
- Form controls need clear hover, focus, disabled, and loading states.

Recommended improvement:

Add explicit themed control styling:

```css
.api-playground input,
.api-playground select,
.api-playground textarea {
  background: color-mix(in srgb, var(--doc-background) 92%, var(--doc-border));
  border: 1px solid var(--doc-border);
  border-radius: 6px;
  color: var(--doc-text);
  font: inherit;
  padding: 8px 10px;
}

.api-playground input::placeholder,
.api-playground textarea::placeholder {
  color: var(--doc-muted-text);
}

.api-playground button {
  background: var(--doc-primary);
  border: 1px solid var(--doc-primary);
  color: var(--doc-background);
}

.api-playground button:hover {
  filter: brightness(1.08);
}

.api-playground button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
```

Also replace the hard-coded fieldset border:

```css
.api-playground fieldset {
  border: 1px solid var(--doc-border);
}
```

Recommended interaction states:

- While request is in flight, disable submit and show "Sending..."
- On success, show a success-tinted result border.
- On error, show an error-tinted result border and concise error message.
- Keep `aria-live="polite"` for response output.

Testing:

- Add static renderer tests for generated playground form structure.
- Add playground script tests if button loading/error state behavior is added.
- Manually verify in light and dark color schemes.

## 5. Improve API Playground Input Semantics

Priority: Medium

Current behavior:

The playground renders several generic inputs:

- Base URL input has no `type="url"`.
- Path/query/header inputs have no schema-driven input type or input mode.
- Auth input uses `type="password"`, which is good, but could be more explicit about secret handling.

Affected code:

- `packages/core/src/static-renderer.ts`
- `renderApiPlayground`
- `renderParameterInputs`
- `renderPlaygroundAuth`

Why it matters:

- Better input types improve mobile keyboards and browser validation.
- API playground forms benefit from schema-aware constraints.
- Small semantic improvements cost little and make the UI feel more professional.

Recommended improvement:

Use a URL input for Base URL:

```html
<input name="baseUrl" type="url" value="..." required>
```

Infer parameter controls where schema information exists:

- `integer` or `number`: `type="number"` and possibly `inputmode="numeric"` or `inputmode="decimal"`.
- `boolean`: select or checkbox.
- enum values: select.
- string format `email`: `type="email"`.
- string format `uri` or `url`: `type="url"`.
- date/date-time: date or datetime-local when appropriate.

If schema data is not currently available in `renderParameterInputs`, consider passing a richer parameter object through from OpenAPI normalization.

Testing:

- Add OpenAPI fixture coverage for parameter schema types.
- Add renderer tests asserting expected input attributes.
- Verify no regressions for existing minimal parameter fixtures.

## 6. Hide Decorative Card Icons From Assistive Technology

Priority: Medium

Current behavior:

Card icons are rendered as text glyphs inside links. For example, a card may expose text like `-> Quickstart` or `</> Config Reference`.

Affected code:

- `packages/core/src/mdx-components.ts`
- `transformCards`
- `.doc-card-icon`

Why it matters:

- Decorative glyphs can pollute link names for screen reader users.
- The card title already communicates the destination.
- The glyphs are visually useful but should not change accessible names.

Recommended improvement:

Mark decorative card icons as hidden:

```ts
const icon = attrs.icon
  ? `<span class="doc-card-icon" aria-hidden="true">${escapeHtml(iconGlyph(attrs.icon))}</span>`
  : "";
```

Do not apply this change to standalone `<Icon />` output automatically, because standalone icons may be meaningful. The existing standalone icon rendering includes an `aria-label`, which is a different use case.

Testing:

- Update or add MDX component tests for card icon markup.
- Confirm that card links still have clean title/description text.

## 7. Add Deep Links For Generated Headings

Priority: Medium

Current behavior:

Generated H2/H3 headings do not have IDs. Reference pages such as the config page contain many sections, but users cannot copy direct links to `theme`, `openapi.specs`, `seo`, and similar headings.

Affected code:

- Content rendering pipeline in `packages/core`
- Static renderer CSS for headings
- Markdown/MDX transform behavior if heading IDs are generated there

Why it matters:

- Documentation users expect deep links.
- Support conversations and agent instructions benefit from stable section URLs.
- Config and API docs become easier to reference.

Recommended improvement:

Generate slug IDs for headings and optionally add visible anchor links on hover/focus.

Example output:

```html
<h2 id="theme">
  <a class="doc-heading-anchor" href="#theme" aria-label="Link to theme">#</a>
  theme
</h2>
```

Suggested CSS:

```css
.doc-content :where(h2, h3) {
  scroll-margin-top: 80px;
}

.doc-heading-anchor {
  opacity: 0;
  text-decoration: none;
}

.doc-content :where(h2, h3):hover .doc-heading-anchor,
.doc-heading-anchor:focus-visible {
  opacity: 1;
}
```

Testing:

- Add content or renderer tests for generated heading IDs.
- Test duplicate headings and punctuation-heavy headings.
- Verify anchor links work with the topbar and sticky sidebar.

## 8. Improve Search Trigger Presentation

Priority: Medium Low

Current behavior:

The search trigger displays "Search docs" and a right-aligned pseudo-label that also says "Search". It works, but it reads less like a modern command/search affordance than it could.

Affected code:

- `packages/core/src/static-renderer.ts`
- `.doc-search-link`
- `.doc-search-link:after`
- `renderSearchLink`

Why it matters:

- Search is a primary docs workflow.
- A clearer affordance helps users recognize it as a command palette/search dialog entry point.

Recommended improvement:

Use a visual treatment closer to a search box:

- Left icon or text "Search docs..."
- Right keyboard hint such as `/` or `Ctrl K` if the shortcut exists.
- If no shortcut exists, avoid implying one.

Example:

```css
.doc-search-link::before {
  content: "⌕";
}

.doc-search-link::after {
  content: "/";
  border: 1px solid var(--doc-border);
  border-radius: 4px;
  padding: 1px 5px;
}
```

If keyboard shortcuts are added, also add tests and docs.

Testing:

- Static renderer test for search link markup.
- Manual keyboard test for opening and closing the modal.

## 9. Add Empty, Loading, And Error States For Search And Playground

Priority: Medium Low

Current behavior:

Search has a suggestion list and an empty state for suggestion filtering. The playground has a default response output area, but the UI could better communicate request lifecycle states.

Affected code:

- `packages/core/src/static-renderer.ts`
- `renderSearchModal`
- `renderSearchModalScript`
- `renderApiPlayground`
- `renderPlaygroundScript` in `packages/core/src/playground.ts`

Why it matters:

- Interactive docs tools should make state visible.
- Better states reduce uncertainty when a request fails due to CORS, network issues, or invalid input.

Recommended improvement:

For playground:

- Default: "Response output will appear here."
- Loading: "Sending request..."
- Success: show status, response headers if available, and body.
- Error: show concise error reason and likely next action.

For search:

- Keep the current empty state.
- Consider showing the query in the empty state.
- Confirm focus returns to the search trigger when the dialog closes.

Testing:

- Add tests for playground success and failure rendering if script behavior changes.
- Add a browser-level smoke test if the project accepts one for local UI behavior.

## 10. Review Color Contrast For Status And Required Labels In Dark Mode

Priority: Medium Low

Current behavior:

Some semantic colors are hard-coded for badges and required labels. Several are tuned for light backgrounds and can become too muted or too harsh in dark mode.

Affected code:

- `packages/core/src/static-renderer.ts`
- `.doc-badge-success`
- `.doc-badge-warning`
- `.doc-badge-danger`
- `.api-required`
- status colors such as `.api-status-2xx`

Why it matters:

- Status labels communicate important API information.
- Contrast should hold in both light and dark mode.
- Hard-coded color tokens can clash with custom themes.

Recommended improvement:

Introduce semantic CSS variables for success, warning, danger, and info:

```css
:root {
  --doc-success: #16a34a;
  --doc-warning: #d97706;
  --doc-danger: #dc2626;
  --doc-info: #2563eb;
}
```

Then override them in dark mode:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --doc-success: #4ade80;
    --doc-warning: #fbbf24;
    --doc-danger: #f87171;
    --doc-info: #60a5fa;
  }
}
```

Testing:

- Add theme CSS tests if available.
- Manually inspect dark and light schemes.

## 11. Add Visual Polish To API Reference Cards Without Increasing Complexity

Priority: Low

Current behavior:

API sections are clear and usable. The visual system is functional but could use a little more hierarchy between hero, overview, content sections, and side rail.

Affected code:

- `packages/core/src/static-renderer.ts`
- `.api-hero`
- `.api-section`
- `.api-rail-card`
- `.api-param-card`
- `.api-response-card`

Recommended improvement:

Keep the static renderer simple, but tune hierarchy:

- Make the API hero slightly less tall on desktop for simple endpoints.
- Use consistent section spacing between overview, parameters, responses, and playground.
- Give side-rail cards slightly quieter borders than primary content cards.
- Add hover states to API nav links and cards.
- Consider making method pills more compact in side navigation.

Testing:

- Manual visual review on endpoints with:
  - no params
  - path params
  - query params
  - request body
  - many responses
  - long paths

## 12. Add A Right-Side Table Of Contents For Long Pages

Priority: High

Senior developer flag:

Long documentation and reference pages need fast in-page navigation. As a developer reading config or API documentation, I expect to jump directly to sections such as `theme`, `openapi.specs`, `redirects`, `search.provider`, or individual API subsections without scanning the whole page.

Current behavior:

The UI has a left sidebar for site navigation, but no right-side table of contents for headings within the current page.

Affected areas:

- Long Markdown/MDX docs pages.
- Config reference pages.
- API reference pages with parameters, responses, request body, and playground sections.
- Content rendering pipeline if heading extraction is needed.

Why it matters:

- Developers rarely read reference documentation linearly.
- In-page navigation is expected in modern docs.
- It reduces scroll fatigue and makes large pages feel structured.
- It pairs naturally with heading anchors.

Recommended improvement:

Add a page-level table of contents on desktop and a compact in-page jump control on mobile.

Desktop direction:

- Use a right-side rail for H2 and optionally H3 headings.
- Keep it sticky below the topbar.
- Highlight the currently visible section if client JS is allowed for this enhancement.
- Without JS, still render static anchor links.

Mobile direction:

- Add a collapsible "On this page" disclosure near the top of content.
- Keep it above the first long section.

Testing:

- Add fixtures with multiple H2/H3 headings.
- Assert generated TOC links match heading IDs.
- Manually verify long config pages and API pages.

## 13. Add Copy Buttons To Code Blocks

Priority: High

Senior developer flag:

Developer docs should make commands and config snippets easy to copy. The current code blocks are readable, but they do not expose a copy action.

Current behavior:

Code blocks render as `pre > code` with styling, but no copy affordance.

Affected code:

- `packages/core/src/static-renderer.ts`
- Markdown/MDX code block rendering.
- MDX component transforms such as `CodeBlock`, `Pre`, `RequestExample`, and `ResponseExample`.

Why it matters:

- Quickstarts and config docs rely heavily on copying commands and snippets.
- Copy actions reduce friction and avoid selection mistakes.
- This is a baseline expectation for developer documentation.

Recommended improvement:

Add copy buttons to code blocks while preserving static output constraints.

No-JS baseline:

- Consider a visible, selectable code block with a clear filename/title when copy is not enabled.

JS-enhanced option:

- Add a small copy button only when a minimal copy script is included.
- Scope the script to pages that contain copyable code.
- Use `navigator.clipboard.writeText`.
- Show copied state for a short duration.

Suggested markup:

```html
<figure class="doc-code-block">
  <figcaption>
    <span>documentee.config.ts</span>
    <button type="button" class="doc-copy-button" data-copy-code>Copy</button>
  </figcaption>
  <pre><code>...</code></pre>
</figure>
```

Testing:

- Add renderer tests for copy button markup.
- Add script tests if copy behavior is implemented.
- Verify keyboard focus and accessible button names.

## 14. Strengthen Current Page Context

Priority: Medium

Senior developer flag:

The active sidebar state is useful, but the topbar currently duplicates simple page/site text and does not add enough context. As a developer, breadcrumbs or section context would be more useful.

Current behavior:

The topbar shows the current route title on the left and site name on the right. On many pages this repeats information already visible in the H1 and sidebar.

Affected code:

- `packages/core/src/static-renderer.ts`
- `.doc-topbar`
- Route and navigation metadata.

Why it matters:

- Developers need orientation in nested docs, versioned docs, and API references.
- Breadcrumbs clarify location better than duplicated page titles.
- Versioned routes and API portals benefit from stronger hierarchy.

Recommended improvement:

Replace or augment the topbar with breadcrumbs:

- `Docs / Reference / Config Reference`
- `API Reference / Core API / GET /messages/{id}`
- `Version 1 / API Reference / List messages`

Implementation notes:

- Use configured navigation groups when available.
- For API operations, use spec name, tag, method, and path.
- Keep breadcrumbs compact and wrap safely on narrow screens.

Testing:

- Add renderer tests for normal docs pages, versioned pages, API portal pages, and API operation pages.
- Verify breadcrumbs do not create horizontal overflow on long paths.

## 15. Add Previous And Next Page Navigation

Priority: Medium

Senior developer flag:

At the end of a docs page, I expect previous/next navigation. This is especially useful for onboarding flows such as home -> quickstart -> configuration -> config reference.

Current behavior:

Pages end without guided navigation to the next related page.

Affected code:

- Manifest route ordering.
- Navigation config interpretation.
- Static page rendering.

Why it matters:

- Helps first-time users follow a path.
- Makes short docs sites feel complete.
- Reduces dependence on the sidebar.

Recommended improvement:

Render a footer nav based on configured navigation order:

```html
<nav class="doc-page-nav" aria-label="Page navigation">
  <a class="doc-page-nav-prev" href="/get-started/quickstart/">Previous</a>
  <a class="doc-page-nav-next" href="/configuration/">Next</a>
</nav>
```

Design notes:

- Use two balanced cards or compact links.
- Hide missing previous/next sides cleanly.
- Include page titles, not only "Previous" and "Next".

Testing:

- Add renderer tests for first page, middle page, last page, and pages outside configured navigation.
- Verify versioned docs do not cross into unrelated route groups unless intended.

## 16. Improve API Sidebar Scalability

Priority: Medium

Senior developer flag:

The API sidebar works for small examples, but it can become dense quickly as the number of endpoints grows. Larger APIs need better scanning, filtering, and collapse behavior.

Current behavior:

Operations are grouped under tags using `<details>`. This is a good start, but many endpoints with long paths will create a tall and visually dense sidebar.

Affected code:

- `packages/core/src/static-renderer.ts`
- `renderOpenApiNavGroups`
- `renderApiNavLink`
- Sidebar navigation CSS.

Why it matters:

- API reference navigation is one of the most common developer workflows.
- Dense endpoint lists slow down scanning.
- Long paths can dominate the sidebar and make tags harder to distinguish.

Recommended improvement:

Improve endpoint navigation for larger APIs:

- Keep only the active tag group open by default.
- Add clearer visual separation between API specs and tags.
- Compact method pills so paths align more consistently.
- Consider a filter field for endpoint navigation if client JS is allowed.
- Preserve `details` support for no-JS collapse.

Testing:

- Add fixtures with many tags and many operations.
- Test long paths and repeated path prefixes.
- Verify active operation remains visible and discoverable.

## Suggested Implementation Order

1. Mobile navigation and search access.
2. Heading anchors.
3. Right-side table of contents.
4. Code block copy buttons.
5. Card group column behavior.
6. API overview grid layout.
7. Playground dark-mode form styling.
8. Current page context and breadcrumbs.
9. Previous/next page navigation.
10. API sidebar scalability.
11. Card icon accessibility.
12. Playground input semantics.
13. Search and playground states.
14. Semantic color tokens.
15. API visual hierarchy polish.

## Suggested Verification

Focused checks during development:

```bash
pnpm --filter @documentee/core test
pnpm --filter @documentee/cli test
pnpm --filter @documentee/cli documentee build . --out dist-docs
pnpm --filter @documentee/cli documentee build examples/basic --out dist-example
```

Full verification before claiming completion, matching the repository agreement:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm docs:validate
pnpm validate
pnpm docs:build
rm -rf dist-example && pnpm example:build
```

## Notes From Review

- Temporary review builds were created and removed after inspection.
- The review did not intentionally modify source files.
- The current UI already has a useful baseline: readable typography, good sidebar grouping, skip link support, visible focus styles, and a strong static-first direction.
- Improvements should preserve Documentee's small HTML and no-client-JS-by-default policy unless an interaction explicitly opts into JavaScript.
