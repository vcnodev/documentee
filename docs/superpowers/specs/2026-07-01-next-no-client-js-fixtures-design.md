# Next.js No-Client-JS Fixture Regression Design

## Goal

Strengthen Documentee's Next.js no-client-JS regression coverage by testing generated App Router and Pages Router fixture apps instead of only checking adapter metadata and isolated source strings.

## Scope

This milestone adds a fixture-app harness to `@documentee/renderer-next`.

Included:

- A reusable manifest fixture with guide, API, schema, and SEO data.
- Generated App Router fixture app files.
- Generated Pages Router fixture app files.
- Shared no-client-JS audit logic.
- Server-rendered HTML snapshot checks using `@documentee/react`.
- Tests that verify fixture files and rendered route HTML stay free of Documentee client JavaScript.
- Route-level HTML payload budget checks.
- An optional full `next build` smoke path that can run when a compatible Next.js dependency is installed.

Excluded:

- Requiring Next.js as a normal workspace dependency.
- Browser automation.
- Hosted deployment tests.
- Strict guarantee that Next.js itself emits no framework runtime assets. The milestone enforces no Documentee client JavaScript and small Documentee-rendered HTML.

## Fixture Apps

The harness writes two real fixture app directories:

```text
app-router/
  app/
    layout.tsx
    [...slug]/page.tsx
  documentee-manifest.json
  next.config.mjs
  package.json
  tsconfig.json

pages-router/
  pages/
    [[...slug]].tsx
  documentee-manifest.json
  next.config.mjs
  package.json
  tsconfig.json
```

The app package metadata uses local workspace dependencies for `@documentee/react`, `next`, `react`, and `react-dom`.

## Audit Rules

The default regression suite checks generated source files and server-rendered Documentee HTML snapshots.

Generated source files must not contain:

- `"use client"`
- `useEffect(`
- `useState(`
- `onClick=`
- `onSubmit=`
- `<script`
- `documentee-playground`

Rendered Documentee HTML snapshots must not contain:

- `"use client"`
- `<script`
- `_next/static/chunks`
- `documentee-playground`
- inline event handlers matching ` on[A-Z]`

Rendered HTML must stay under route-level budgets:

- Guide pages: 40 KB
- API operation pages: 120 KB
- Schema pages: 80 KB

## Optional Next Build

The test suite includes an opt-in smoke test path controlled by:

```bash
DOCUMENTEE_RUN_NEXT_FIXTURE_BUILD=1
```

When this flag is set and a local `next` binary is available, the test may run `next build` inside the generated fixture apps and inspect emitted output. When unavailable, the optional step is skipped. The default CI path remains deterministic and does not require Next.

## Acceptance

The goal is complete when:

- App Router and Pages Router fixture app directories are generated in tests.
- The fixture apps include realistic Next files, package metadata, and the shared manifest.
- Tests audit generated source files and server-rendered HTML snapshots.
- Tests cover guide, API operation, and schema route budgets.
- The existing generated example tests remain green.
- Full verification passes.
