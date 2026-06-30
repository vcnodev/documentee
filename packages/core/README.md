# @documentee/core

Renderer-agnostic core for Documentee. Loads config, discovers content, builds the route manifest, validates docs, and renders baseline static HTML.

Use this package when building a renderer or CLI command that needs the shared Documentee content graph.

## MDX-Style Components

The core package includes static HTML transforms for docs authoring primitives:

- `Callout`
- `Steps` and `Step`
- `Tabs` and `Tab`
- `CodeGroup`
- `Accordion` and `AccordionGroup`
- `Card` and `CardGroup`
- `ParamField` and `ResponseField`
- `Frame`
- `Icon`
- `Badge`

These transforms emit no Documentee client JavaScript.
