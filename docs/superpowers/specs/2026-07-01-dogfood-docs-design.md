# Dogfood Docs Design

## Goal

Build Documentee's own documentation site with Documentee using the repository `docs/` directory as the source content.

## Requirements

- Add a root `documentee.config.ts` for the repository docs site.
- Put first-class user documentation directly inside `docs/`.
- Include a real Documentee API/config reference that reflects current config and CLI behavior.
- Include AI-agent-ready documentation so agents can build and maintain docs by reading the docs.
- Keep existing contributing and planning documents available as deeper pages rather than moving or deleting them.
- Validate the dogfood site through the real config, manifest, and validation pipeline.
- Preserve the existing `examples/basic` project as a separate sample site.

## Information Architecture

Top-level docs:

- `/`: overview and orientation.
- `/get-started/quickstart`: build a small docs site.
- `/configuration`: common config walkthrough.
- `/api-reference/config`: field-by-field Documentee config reference.
- `/api-reference/cli`: CLI command reference.
- `/api-reference/openapi`: OpenAPI and API reference behavior.
- `/components`: supported MDX/static component reference.
- `/ai-agents`: agent entrypoint.
- `/ai-agents/doc-builder-guide`: operational guide for agents that update docs.

Existing docs under `docs/contributing` and `docs/superpowers` remain routable. The root navigation only highlights the primary user docs and links agents to the contributing docs where useful.

## Agent Readiness

The AI-agent docs must include:

- Where to start reading.
- Which files define repo rules: `AGENTS.md`, package READMEs, and contributing docs.
- How to change docs safely: update navigation, update config reference when config changes, run validation/build commands, and keep AI-readable outputs in mind.
- Commands agents should run before claiming completion.
- Links to `/configuration`, `/api-reference/config`, `/api-reference/cli`, `/contributing/architecture`, `/contributing/testing`, and `/contributing/small-html-no-client-js`.

## Testing

Add tests that:

- Load the root `documentee.config.ts`.
- Build the root manifest from `docs/`.
- Verify primary dogfood routes exist.
- Verify manifest validation has no diagnostics.
- Verify the config reference mentions current important fields such as `theme.preset`, `openapi.specs`, `versions`, `search.provider`, `seo`, `redirects`, and `playground`.
- Verify AI-agent docs contain required agent guidance and links.

## Verification

Completion requires:

- Focused dogfood docs tests pass.
- Full required repo verification passes.
- `documentee build . --out dist-docs` succeeds.
- Generated `dist-docs/index.html` and `dist-docs/ai-agents/index.html` exist.
