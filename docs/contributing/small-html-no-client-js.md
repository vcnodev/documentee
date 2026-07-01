# Small HTML And No Documentee Client JS

The Next.js and React renderer work is not just about removing JavaScript. A no-client-JS mode can still be slow if it sends huge HTML payloads.

Policy:

- Do not ship Documentee client-side JavaScript in strict server-rendered mode.
- Loading Pagefind UI on `/search/` is allowed only when `search.provider` is `pagefind`; ordinary docs pages must not load Pagefind scripts.
- Do not inline full OpenAPI schema graphs into every operation page.
- Split large references into operation, schema, example, and search-result routes.
- Keep route-level HTML payload budgets in tests.
- Prefer stable links between small pages over one large all-in-one API document.
- Test real generated Next.js App Router and Pages Router fixture apps, then audit generated source and server-rendered Documentee HTML snapshots for client JavaScript regressions.

The practical goal is small HTML with no Documentee client JavaScript.
