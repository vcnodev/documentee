# Small HTML And No Documentee Client JS

The Next.js and React renderer work is not just about removing JavaScript. A no-client-JS mode can still be slow if it sends huge HTML payloads.

Policy:

- Do not ship Documentee client-side JavaScript in strict server-rendered mode.
- Do not inline full OpenAPI schema graphs into every operation page.
- Split large references into operation, schema, example, and search-result routes.
- Keep route-level HTML payload budgets in tests.
- Prefer stable links between small pages over one large all-in-one API document.

The practical goal is small HTML with no Documentee client JavaScript.
