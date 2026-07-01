# Versioned Docs and Multi-Spec Portals Design

## Goal

Documentee should support versioned documentation trees and multiple OpenAPI specs in one generated static site while preserving the current single-version configuration and no-client-JS HTML output.

## Scope

This feature adds:

- Optional `versions` config entries for loading additional docs directories under stable route prefixes.
- Optional `version` metadata on OpenAPI specs so API routes can belong to a docs version.
- A generated API portal route that lists every configured OpenAPI spec with operation counts.
- Spec-scoped schema routes so schemas from different specs cannot collide.
- Validation for duplicate version ids, duplicate version prefixes, unknown spec version references, and missing navigation OpenAPI groups.

This feature does not add interactive client-side version switching, per-version search indexes, or automatic content diffing between versions.

## Configuration

Existing projects keep working with the current shape:

```ts
export default {
  site: { name: "Acme Docs" },
  content: { directory: "docs" },
  openapi: {
    specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference" }],
  },
};
```

Versioned projects can add:

```ts
export default {
  site: { name: "Acme Docs" },
  content: { directory: "docs" },
  versions: [
    {
      id: "v1",
      label: "Version 1",
      routePrefix: "/v1",
      content: { directory: "docs/v1" },
    },
    {
      id: "v2",
      label: "Version 2",
      routePrefix: "/v2",
      content: { directory: "docs/v2" },
      default: true,
    },
  ],
  openapi: {
    specs: [
      {
        id: "core-v1",
        name: "Core API v1",
        source: "./api/core-v1.yaml",
        routeBase: "/api-reference/core",
        version: "v1",
      },
      {
        id: "admin-v2",
        name: "Admin API v2",
        source: "./api/admin-v2.yaml",
        routeBase: "/api-reference/admin",
        version: "v2",
      },
    ],
  },
};
```

`versions[].routePrefix` defaults to `/${id}`. `versions[].label` defaults to `id`. `versions[].content.directory` is required because versioned docs are explicit content roots. At most one version may set `default: true`.

`openapi.specs[].version` is optional. When present, it must reference a configured version id. The manifest prefixes that spec's route base with the version's route prefix, so `version: "v2"` and `routeBase: "/api-reference/core"` produce operation routes like `/v2/api-reference/core/list-messages`.

## Manifest Model

The manifest gains:

- `versions`: normalized version references with `id`, `label`, `routePrefix`, and `default`.
- `apiPortal`: metadata for the generated API portal route.
- `SiteRoute.version` for routes created from versioned content or versioned OpenAPI specs.
- `RouteKind` value `api-portal`.
- `SchemaReference.route` so renderer links do not hard-code schema paths.

Base content pages continue to load from `config.content.directory`. Versioned pages are loaded with `loadContentPages` for each version content directory, then route-prefixed in the manifest. Source Markdown and compiled HTML remain unchanged.

## API Portal

The manifest generates one portal route at `/api-reference` when at least one OpenAPI spec is configured. The portal route lists all configured specs with:

- Spec name, falling back to spec id.
- Spec id.
- Version label when attached to a version.
- First operation route for quick entry.
- Operation count.

The route is static HTML and contains no client JavaScript. If a content page or operation also claims `/api-reference`, duplicate route validation reports it.

## Schema Routes

Schema routes become spec-scoped:

```txt
/schemas/core-v1/Message
/schemas/admin-v2/Message
```

The renderer receives schema reference metadata from the operation's `specId`, so request and response schema links point to the correct spec-scoped route. This avoids incorrect links when multiple OpenAPI specs share schema names.

## Navigation

Existing navigation remains valid:

```ts
navigation: [
  { group: "Get Started", pages: ["docs/index"] },
  { group: "Core API", openapi: "core-v2" },
]
```

The renderer also adds a compact version switcher when versions are configured. Each version link points to that version's route prefix. This is plain HTML and is safe for no-client-JS output.

Versioned content page refs in navigation can use their generated route directly, such as `/v2/get-started/quickstart`, or the existing docs path convention for unversioned pages. This keeps navigation deterministic without inventing hidden page-ref rules.

## Validation

Config loading rejects:

- Duplicate OpenAPI spec ids.
- Duplicate version ids.
- Duplicate version route prefixes.
- More than one default version.

Manifest validation reports:

- Duplicate generated routes.
- Navigation page targets that do not exist.
- Navigation OpenAPI groups that reference missing spec ids.
- OpenAPI specs whose `version` references a missing version id.
- Broken internal links.
- Redirect sources that conflict with generated routes.

## Testing

Coverage should include:

- Config normalization for `versions` and OpenAPI spec `version`.
- Config rejection for duplicate version ids, duplicate route prefixes, and multiple defaults.
- Manifest route generation for versioned content and versioned specs.
- API portal route generation with multiple specs and operation counts.
- Spec-scoped schema routes and schema links in operation HTML.
- Static navigation rendering with a version switcher and multi-spec API links.
- Validation diagnostics for missing OpenAPI navigation groups and unknown spec versions.

Full verification remains `pnpm test`, `pnpm typecheck`, and `pnpm build`.
