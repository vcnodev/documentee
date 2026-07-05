# API Reference UI Revamp Design

## Goal

Make Documentee's generated API reference feel credible for real Swagger/OpenAPI specs while preserving the static HTML contract. The SwingSwap repro has 48 operations across Health, Authentication, Products, Addresses, Offers, Swaps, and Chats, and it currently exposes the main gap: the output is technically complete but visually flat, especially for large endpoint sets and multipart upload operations.

## Evidence

- Local SwingSwap portal at `http://127.0.0.1:4567/api-reference/` renders one sparse card with `core` and `48 operations`, while the sidebar lists every endpoint as a flat stream.
- `GET /products/search` has eight query parameters, but the docs render a plain three-column table with no descriptions, types, or grouping.
- `POST /products/upload` is `multipart/form-data`, but the docs only show the media type and a generic textarea in the playground.
- Mintlify positions OpenAPI support around generated endpoint pages, request builders, and navigation.
- Redocly documents tag-based sidebars where tags become subgroups with operations beneath them.
- Scalar and Redocly emphasize modern API reference experiences with clear navigation, request/response examples, and method-aware operation surfaces.

References used for direction:

- [Mintlify OpenAPI setup](https://www.mintlify.com/docs/api-playground/openapi-setup)
- [Mintlify navigation](https://www.mintlify.com/docs/organize/navigation)
- [Redocly reference docs integration](https://redocly.com/docs-legacy/developer-portal/guides/reference-docs-integration)
- [Redocly tags visual reference](https://redocly.com/learn/openapi/openapi-visual-reference/tags)
- [Scalar open-source API platform](https://github.com/scalar/scalar)

## Direction

Use generated structure, not client-side behavior, to improve the docs. The renderer should output richer semantic HTML and CSS for API pages, while the OpenAPI normalizer should extract compact metadata that is useful for display: parameter descriptions, schema type/format, enums, and request body fields for object schemas. The output remains no-client-JS except the existing optional playground and Pagefind search features.

## Scope

Included:

- Group generated API sidebar links by OpenAPI tag for each `navigation.openapi` group.
- Use method-colored endpoint badges and operation hero sections.
- Replace parameter tables with scan-friendly cards grouped by `path`, `query`, `header`, and `cookie`.
- Improve request body cards with media-type pills, schema links, required state, and field rows for object-like payloads.
- Render multipart/form-data as form fields, including file/binary fields, instead of a generic media-type-only block.
- Improve responses with status-colored cards, media-type pills, schema links, and short descriptions.
- Upgrade API portal summaries to show spec stats and tag/category chips.
- Add a SwingSwap-shaped fixture test that covers many tags, query-heavy operations, multipart upload, response states, and portal stats.

Excluded:

- A full interactive multipart request sender in the browser playground.
- Client-side sidebar collapse state or search filtering.
- Inlining full JSON schema internals into every operation page.

## Architecture

`packages/openapi` remains the source of compact OpenAPI operation metadata. It will add display-oriented fields without storing full schema trees:

- `ApiParameter.description`
- `ApiParameter.schemaType`
- `ApiParameter.schemaFormat`
- `ApiParameter.enumValues`
- `ApiRequestBody.fields`
- `ApiRequestBody.required`

`packages/core` remains the static HTML renderer. It will derive tag navigation and portal stats from `manifest.operations`, then render operation sections with small, reusable helper functions inside `static-renderer.ts`. This keeps the change aligned with the existing renderer style without introducing a new runtime.

## UI Requirements

- Sidebar: each configured OpenAPI group should render tag subgroups such as `Products`, `Offers`, and `Swaps`, each with an operation count and endpoint links underneath.
- Operation hero: show method, path, summary, description, tags, auth state, and deprecated/beta badges in a compact header.
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD, and TRACE get stable CSS classes so themes can style them.
- Parameters: cards should show name, location, required/optional, type/format/enum where available, and description where available.
- Request body: cards should show required/optional, media types, schema refs, and field rows. Multipart fields should have an explicit `Form fields` section and file fields should read as binary/file inputs.
- Responses: status cards should visually separate 2xx, 3xx, 4xx, 5xx, and default responses.
- Portal: each spec card should show operation count, tag count, auth count, and tag chips ordered by operation frequency.
- Responsive behavior: the sidebar can stay stacked on mobile, but endpoint cards and portal stats must avoid text overlap and horizontal overflow.

## Mintlify-Quality Pass

The second UI pass raises the bar from "structured" to "docs-product quality." A UI Designer subagent reviewed the SwingSwap preview and identified the blockers: mobile showed a very long sidebar before page content, the operation page lacked a request/response workbench, the hero over-emphasized raw paths, navigation remained too dense, dark mode was nominal, and accessibility basics were missing.

Additional requirements:

- Mobile API pages must show the operation content before the large generated sidebar. The sidebar should remain available after content and be scrollable.
- OpenAPI tag navigation should use native collapsible groups. The current operation's tag opens by default; unrelated tags stay collapsed.
- Operation hero hierarchy should lead with the human summary and show the HTTP method/path as a compact endpoint command row.
- Desktop operation pages should use a two-column workbench: main reference content plus a sticky operation summary rail.
- Static accessibility basics are required: skip link, `main#main`, and visible `:focus-visible` styles.
- Dark preference should emit real dark CSS variables when `theme.darkMode` is enabled.
- Multipart binary fields should read like file inputs, for example `file[]`, instead of disconnected `array` and `binary` chips.

## Testing

Use TDD:

- Add renderer tests first for tag-grouped nav, portal summary chips, operation hero/classes, parameter cards, request body field rows, multipart field presentation, and response cards.
- Add OpenAPI normalization tests for parameter descriptions/types/enums and request body field extraction from inline object schemas and component `$ref`s.
- Add a SwingSwap-shaped static fixture test in `packages/core/test/static-renderer.test.ts` using a local manifest, not the ignored `test-project`.

## Success Criteria

- SwingSwap-like docs no longer present a flat 48-link API sidebar.
- The API portal summarizes categories instead of only saying `48 operations`.
- Query-heavy pages can be scanned without reading a raw table.
- Multipart upload pages reveal the actual fields and binary upload shape.
- At desktop width, API pages show the operation hero, reference content, and request/response context in a workbench layout.
- At mobile width, the operation hero appears before the long generated API sidebar.
- Dark preference changes the generated docs from white-background tokens to dark-background tokens.
- Keyboard users can reach the page content with a skip link and visible focus.
- The static renderer still produces small, no-client-JS HTML unless optional features are enabled.
- Full verification commands in `AGENTS.md` pass before completion is claimed.
