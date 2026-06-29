import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SiteManifest } from "@documentee/core";

export async function writeNextExamples(manifest: SiteManifest, outDir: string): Promise<void> {
  await mkdir(join(outDir, "app", "[...slug]"), { recursive: true });
  await mkdir(join(outDir, "pages"), { recursive: true });
  await writeFile(join(outDir, "documentee-manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(join(outDir, "app", "[...slug]", "page.tsx"), appRouterPage());
  await writeFile(join(outDir, "pages", "[...slug].tsx"), pagesRouterPage());
  await writeFile(join(outDir, "package.json"), JSON.stringify(packageJson(), null, 2));
}

function packageJson(): Record<string, unknown> {
  return {
    type: "module",
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
    },
    dependencies: {
      next: "^15.0.0",
      react: "^19.1.0",
      "react-dom": "^19.1.0",
      "@documentee/react": "workspace:*",
    },
  };
}

function appRouterPage(): string {
  return `import manifest from "../../documentee-manifest.json";
import { renderDocumenteePageHtml } from "@documentee/react";

export const dynamic = "force-static";

export function generateStaticParams() {
  return manifest.routes
    .filter((route) => route.route !== "/")
    .map((route) => ({ slug: route.route.replace(/^\\/+/, "").split("/") }));
}

export default function Page({ params }: { params?: { slug?: string[] } }) {
  const routePath = params?.slug?.length ? \`/\${params.slug.join("/")}\` : "/";
  const route = manifest.routes.find((candidate) => candidate.route === routePath) ?? manifest.routes[0];
  return <div dangerouslySetInnerHTML={{ __html: renderDocumenteePageHtml(manifest as any, route as any, { htmlBudgetBytes: 120000 }) }} />;
}
`;
}

function pagesRouterPage(): string {
  return `import manifest from "../documentee-manifest.json";
import { renderDocumenteePageHtml } from "@documentee/react";

export async function getStaticPaths() {
  return {
    paths: manifest.routes.map((route) => ({ params: { slug: route.route === "/" ? [] : route.route.replace(/^\\/+/, "").split("/") } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params?: { slug?: string[] } }) {
  const routePath = params?.slug?.length ? \`/\${params.slug.join("/")}\` : "/";
  const route = manifest.routes.find((candidate) => candidate.route === routePath) ?? manifest.routes[0];
  return { props: { html: renderDocumenteePageHtml(manifest as any, route as any, { htmlBudgetBytes: 120000 }) } };
}

export default function Page({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
`;
}
