# Documentee Next Steps 1-9 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Close the next nine Documentee project steps: git baseline, package docs, Astro renderer output, MDX component support, richer OpenAPI UI, concrete Next examples, deployment templates, migration commands, and contributor docs.

**Architecture:** Keep the renderer-agnostic manifest as the center. Add pragmatic baseline implementations that can be tested in-process: generated Astro project files, MDX-like component transforms, richer compact API pages, generated Next examples with no Documentee client scripts, static deployment templates, and migration utilities.

**Tech Stack:** TypeScript, Node.js ESM, Vitest, pnpm workspaces, generated Astro/Next project files, Markdown/MDX-like transforms, Git.

---

## Tasks

- [x] Initialize git and create a baseline commit with relevant source files.
- [x] Add package-level READMEs for all publishable packages.
- [x] Expand `@documentee/renderer-astro` from route metadata to generated Astro project files.
- [x] Add MDX component transforms for `Callout`, `Steps`, `Tabs`, and `CodeGroup`.
- [x] Improve OpenAPI UI with grouped API navigation, schema pages, examples, badges, and code samples.
- [x] Add concrete Next App Router and Pages Router example generation with small-HTML/no Documentee client JS checks.
- [x] Add deployment templates for GitHub Pages, Vercel, Netlify, and Cloudflare Pages.
- [x] Add migration commands for Mintlify, Docusaurus, and Nextra.
- [x] Add contributor docs for architecture, testing, package boundaries, and small-HTML/no-client-JS policy.
- [x] Run full verification and commit the completed batch.
