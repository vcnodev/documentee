# @documentee/openapi

OpenAPI loading and compact operation normalization for Documentee.

This package supports OpenAPI 3.0 and OpenAPI 3.1 YAML/JSON documents. It extracts operation metadata for API reference pages:

- stable route slugs
- auth/security names
- parameters
- request body media types and schema references
- response media types and schema references
- code samples
- playground base URL defaults from servers

The normalizer resolves local component refs for parameters, request bodies, and responses, but it does not inline large schema graphs into every operation page.

See the [root README](../../README.md) and [small HTML policy](../../docs/contributing/small-html-no-client-js.md).
