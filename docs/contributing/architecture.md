# Architecture

Documentee is built around a renderer-agnostic site manifest.

Core flow:

1. `@documentee/core` loads config.
2. `@documentee/core` discovers Markdown/MDX content.
3. `@documentee/openapi` loads OpenAPI files and normalizes compact operation metadata.
4. `@documentee/core` builds a route manifest.
5. Renderers consume the same manifest.

Renderers must not fork the content pipeline. Static HTML, Astro, React, and Next.js output should all preserve the same route, OpenAPI, and validation semantics.
