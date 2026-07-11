# @documentee/cli

Command line interface for Documentee.

## Commands

```bash
documentee init <project>
documentee init --template <api-first|product-docs|enterprise-docs>
documentee validate <project>
documentee audit <project> --format <markdown|json>
documentee build <project> --out <dir>
documentee dev <project> --port <port>
documentee preview <project> --out <dir> --port <port>
documentee migrate <mintlify|docusaurus|nextra|scalar|redocly> <source> <target>
documentee diff-openapi old.yaml new.yaml
documentee generate-mcp <project> --out .documentee-mcp
```

`documentee dev` serves manifest-rendered routes directly from the source project. `documentee preview` builds the deployable static artifact first, then serves files from the output directory.

`documentee init` defaults to the API-first starter and supports `api-first`, `product-docs`, and `enterprise-docs` templates. Pass a project path to create a new folder, or use `documentee init --template product-docs` to scaffold the current directory.

`documentee audit` prints a stable launch-readiness report for broken links, metadata gaps, missing H1 headings, duplicate titles, public private/draft content, OpenAPI examples, AI-readable metadata, page size, search routes, and sitemap/robots consistency. Use `--format json` for CI parsing.

Migration helpers copy docs and API files into Documentee shape, normalize common Mintlify, Docusaurus, and Nextra MDX syntax, and map common config from Mintlify, Docusaurus, Scalar, and Redocly projects. Each migration writes `migration-report.md` with converted files, unsupported components, broken local doc links, and manual cleanup items.

`documentee diff-openapi` compares two OpenAPI files and prints a Markdown report of operation, request, response, deprecation, and breaking-change differences.

`documentee generate-mcp` emits a local read-only MCP server from the built manifest and `llms.json` route chunks. The generated server exposes `search_docs`, `read_doc`, `list_api_operations`, and `read_api_operation`.

See the [root README](../../README.md) and [repository rules](../../AGENTS.md).
