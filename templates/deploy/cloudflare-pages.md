# Cloudflare Pages

Use these settings for a Documentee static deployment:

- Build command: `pnpm --filter @documentee/cli documentee build . --out dist`
- Build output directory: `dist`
- Node.js version: `22`
- Package manager: `pnpm`

Documentee emits static HTML, `llms.txt`, `llms-full.txt`, and optional Pagefind assets, so no server runtime is required for the static build.
