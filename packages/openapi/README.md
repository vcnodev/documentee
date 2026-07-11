# @documentee/openapi

OpenAPI loading and compact operation normalization for Documentee.

This package supports OpenAPI 3.0 and OpenAPI 3.1 YAML/JSON documents. It extracts operation metadata for API reference pages:

- stable route slugs
- auth/security names
- parameters
- request body media types, schema references, field summaries, and examples
- response media types, schema references, field summaries, and examples
- code samples
- first server URL for generated examples
- playground base URL defaults from servers

The normalizer resolves local component refs for parameters, request bodies, and responses. Field summaries include useful compact metadata such as nested object fields, array item schemas, enums, defaults, nullable/deprecated state, examples, and `oneOf`/`anyOf`/`allOf` composition without inlining full raw schema graphs into every operation page.

See the [root README](../../README.md) and [small HTML policy](../../docs/contributing/small-html-no-client-js.md).
