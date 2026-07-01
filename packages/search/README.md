# @documentee/search

Static search integration for Documentee.

The package wraps Pagefind and writes search assets after static HTML generation when `search.provider` is `pagefind`.

The core renderer also emits `/search/` for Pagefind-enabled sites. That page includes a static no-JS index of generated pages and loads `/_pagefind/pagefind-ui.js` only on `/search/`. Ordinary docs pages do not load Pagefind UI assets.

Search output is an explicit static-build asset. It is not part of strict no-client-JS renderer tests unless a site opts into Pagefind.

See the [root README](../../README.md) and [small HTML policy](../../docs/contributing/small-html-no-client-js.md).
