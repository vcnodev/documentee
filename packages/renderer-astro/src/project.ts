import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SiteManifest } from "@documentee/core";

export async function writeAstroProject(manifest: SiteManifest, outDir: string): Promise<void> {
  await mkdir(join(outDir, "src", "pages"), { recursive: true });
  await mkdir(join(outDir, "src", "styles"), { recursive: true });

  await writeFile(join(outDir, "package.json"), JSON.stringify(packageJson(manifest), null, 2));
  await writeFile(join(outDir, "astro.config.mjs"), astroConfig());
  await writeFile(join(outDir, "src", "documentee-manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(join(outDir, "src", "styles", "documentee.css"), cssTheme());
  await writeFile(join(outDir, "src", "pages", "[...slug].astro"), astroPage());
}

function packageJson(manifest: SiteManifest): Record<string, unknown> {
  return {
    name: `${manifest.config.site.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "documentee"}-astro`,
    type: "module",
    scripts: {
      dev: "astro dev",
      build: "astro build",
      preview: "astro preview",
    },
    dependencies: {
      astro: "^5.0.0",
    },
  };
}

function astroConfig(): string {
  return `import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
});
`;
}

function astroPage(): string {
  return `---
import manifest from "../documentee-manifest.json";
import "../styles/documentee.css";

export function getStaticPaths() {
  return manifest.routes.map((route) => ({
    params: { slug: route.route === "/" ? undefined : route.route.replace(/^\\/+/, "") },
    props: { route },
  }));
}

const { route } = Astro.props;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{route.title} | {manifest.config.site.name}</title>
    <meta name="description" content={route.description} />
  </head>
  <body>
    <aside>
      <strong>{manifest.config.site.name}</strong>
      {manifest.routes.map((item) => <a href={item.route === "/" ? "/" : \`\${item.route}/\`}>{item.title}</a>)}
    </aside>
    <main set:html={route.html}></main>
  </body>
</html>
`;
}

function cssTheme(): string {
  return `:root {
  color-scheme: light dark;
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
  --ink: #161513;
  --muted: #6f6a61;
  --line: #ded8cc;
  --paper: #fbfaf7;
  --accent: #2563eb;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(220px, 280px) 1fr;
  background: var(--paper);
  color: var(--ink);
}

aside {
  padding: 28px;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

aside a {
  color: var(--muted);
  text-decoration: none;
}

aside a:hover {
  color: var(--accent);
}

main {
  max-width: 880px;
  padding: 48px;
}
`;
}
