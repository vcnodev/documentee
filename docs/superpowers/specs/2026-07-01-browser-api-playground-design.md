# Browser API Playground Design

## Goal

Add an opt-in browser API playground, also called a try-it UI, to generated OpenAPI operation pages.

The playground lets a reader fill path, query, header, auth, and request body fields in the browser, send the request with `fetch`, and inspect status, response headers, response body, and errors.

## Scope

This milestone implements a first-party browser playground for the static renderer.

Included:

- Per-spec config at `openapi.specs[].playground`.
- Operation normalization for server/base URL, parameters, request body media types, and playground auth settings.
- Static renderer UI for enabled API operation pages.
- Small client script emitted only for pages with an enabled playground.
- Request construction for path params, query params, header params, bearer auth, header API keys, query API keys, and request bodies.
- Visible CORS/auth limitation copy in the playground.
- Tests for config parsing, operation normalization, renderer output, script behavior, example build output, and no-script output when disabled.

Excluded:

- Server-side proxying.
- Secret storage.
- OAuth flows.
- Cookie auth management.
- Generated SDKs.
- Mock servers.

## Config

Each OpenAPI spec may opt into the playground:

```ts
{
  openapi: {
    specs: [
      {
        id: "core",
        source: "./api/openapi.yaml",
        routeBase: "/api-reference",
        playground: {
          enabled: true,
          baseUrl: "https://api.acme.test",
          auth: "bearer"
        }
      }
    ]
  }
}
```

Config fields:

- `enabled`: boolean. Defaults to `false`.
- `baseUrl`: optional string. Overrides the first OpenAPI `servers[].url`.
- `auth`: `"none" | "bearer" | "apiKey"`. Defaults to `"none"`.
- `apiKeyName`: optional string for API key auth.
- `apiKeyLocation`: `"header" | "query"`. Defaults to `"header"`.

## Data Model

The normalized operation keeps compact docs data and adds a small playground object when enabled:

```ts
interface ApiPlayground {
  enabled: boolean;
  baseUrl?: string;
  auth: "none" | "bearer" | "apiKey";
  apiKeyName?: string;
  apiKeyLocation: "header" | "query";
}
```

`ApiParameter` already captures name, location, and required state. The playground uses these parameters to render path, query, and header inputs.

The request body model keeps media types and schema reference names. The playground renders a media type selector and a request body textarea when a body exists.

## UI

Enabled operation pages get a `Try It` section after code samples.

The section includes:

- Base URL input.
- Read-only method and path display.
- Inputs grouped by path, query, and header parameters.
- Auth input when configured.
- Body media type selector and body textarea when the operation has a request body.
- Send button.
- Result panel with status, response headers, response body, and error text.
- Short note that browser requests depend on API CORS policy and secrets are not stored.

Disabled operation pages do not include the playground section and do not include the client script.

## Client Script

The script is inline for the static renderer and only included when the current page has an enabled playground.

Behavior:

- Finds forms using `data-documentee-playground`.
- Reads operation metadata from `data-*` attributes.
- Encodes path parameters into `{param}` path tokens.
- Adds query parameters with `URLSearchParams`.
- Adds header parameters.
- Adds bearer or API key auth if configured.
- Adds request body and `Content-Type` when body text is non-empty.
- Calls `fetch`.
- Prints status, response headers, and response body.
- Catches errors and prints a clear message, including likely CORS/network failure language.

Safety:

- No local storage or cookies.
- No automatic credential inclusion.
- No proxy URL.
- No request is sent until the user presses Send.

## Testing

Required tests:

- Config parses playground settings and defaults disabled.
- Operation normalization attaches playground settings and server fallback base URL.
- Renderer emits a playground form and script only when enabled.
- Renderer omits playground UI and scripts when disabled.
- Client script source includes request construction for path/query/header params, auth, body, response status, headers, and errors.
- Example project enables playground and the generated API page contains the try-it UI.
- Full project verification passes.

## Acceptance

The goal is complete when:

- The example API reference page contains a working browser try-it UI.
- Disabled playground configs produce no playground UI and no playground script.
- Tests cover config, normalization, rendering, and script output.
- The repository builds, typechecks, tests, validates, and builds the example project.
