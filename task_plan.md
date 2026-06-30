# Task Plan: Documentee Initial Implementation

## Goal
Build Documentee's initial OSS docs-generator implementation from the research goals: OpenAPI-first static core, renderer-agnostic model, and documented extended small-HTML/no-Documentee-client-JS Next.js path.

## Phases
| Phase | Status | Description |
|---|---|---|
| 1 | complete | Re-scope existing research plan to the current concise recommendation request |
| 2 | complete | Research reference products, OSS alternatives, and OpenAPI tooling |
| 3 | complete | Synthesize IA, authoring conventions, config, MDX, OpenAPI workflow, examples, migration, and starter templates |
| 4 | complete | Return concise findings and recommendations with source links |
| 5 | complete | Write consolidated Markdown research document and self-review |
| 6 | complete | Add extended React and Next.js no-JS SSR HTML renderer goal |
| 7 | complete | Write implementation plan for the first complete working milestone |
| 8 | complete | Execute the implementation plan with TDD |
| 9 | complete | Verify tests, build, CLI smoke flow, and no unfinished markers |
| 10 | complete | Continue steps 2-8: publishing, dev server, OpenAPI rendering, search, Astro, Next no-JS spike, validation |
| 11 | complete | Continue next steps 1-9: git baseline, package READMEs, Astro project output, MDX components, API UI, Next examples, deploy templates, migrations, contributor docs |
| 12 | complete | Complete richer MDX components beyond Callout, Steps, Tabs, and CodeGroup |

## Decisions
- Product direction: open-source docs generator, not hosted SaaS for v1.
- Source content: must include OpenAPI spec support.
- Workspace is planning-stage only; no app scaffolding in this pass.
- Consolidated research document path: `documentee-research.md`.
- Extended goal: basic React support and Next.js App Router / Pages Router server-rendered HTML mode with no Documentee client JavaScript.
- First implementation milestone: working static generator foundation, not the full hosted/commercial platform.
- Continuation goal: complete implementation steps 2-8 from the user's requested next steps.
- Next-steps goal: close the listed items 1-9 from the user's latest request.
- Richer MDX components goal: add static no-client-JS authoring primitives for cards, accordions, fields, frames, icons, and badges.

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| `git status` failed because workspace is not a git repository | Initial repo check | Treat workspace as planning directory; no git commits expected |
| `pnpm install` exited with `ERR_PNPM_IGNORED_BUILDS` for esbuild | Initial dependency install | Add explicit pnpm build approval for esbuild and reinstall non-interactively |
| `create-documentee` typecheck failed because `initCommand` was not exported | Full verification | Exported CLI command functions from `@documentee/cli` |
| CLI validate/build resolved `examples/basic` from `packages/cli` under pnpm filter | CLI smoke verification | Resolve CLI path arguments against `INIT_CWD` when present |
| Example build initially raced with a new search package build while run in parallel | Pagefind integration check | Reran the example build after package build completed; final verification runs sequentially |
