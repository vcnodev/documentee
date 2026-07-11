# @documentee/llms

Generates AI-readable `llms.txt`, `llms-full.txt`, `llms.json`, and `skill.md` outputs from a Documentee site manifest.

These files summarize generated docs, API operation routes, schema routes, source Markdown, and a stable structured route index so LLM tools can inspect the documentation without crawling the rendered site.

`llms.json` includes semantic chunks with route, heading path, source file, text, links, and compact API operation metadata when available.

`skill.md` gives coding agents a compact project overview, reading order, important routes, verification commands, and content contribution rules.

See the [root README](../../README.md) and [architecture notes](../../docs/contributing/architecture.md).
