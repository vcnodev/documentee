import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { SiteManifest } from "@documentee/core";
import { renderDocumenteePageHtml } from "@documentee/react";

export interface FixtureSourceAuditResult {
  checkedFiles: string[];
  violations: string[];
}

export interface FixtureHtmlSnapshot {
  route: string;
  bytes: number;
  budgetBytes: number;
}

export interface FixtureHtmlAuditResult {
  snapshots: FixtureHtmlSnapshot[];
  violations: string[];
}

export interface OptionalNextBuildResult {
  ran: boolean;
  skipped: boolean;
  reason?: string;
  exitCode?: number;
}

const SOURCE_MARKERS = [
  '"use client"',
  "'use client'",
  "useEffect(",
  "useState(",
  "onClick=",
  "onSubmit=",
  "<script",
  "documentee-playground",
];

const HTML_MARKERS = [
  '"use client"',
  "'use client'",
  "<script",
  "_next/static/chunks",
  "documentee-playground",
];

export function createNoClientJsFixtureManifest(): SiteManifest {
  return {
    config: {
      site: { name: "Acme Docs", url: "https://docs.acme.test", description: "Docs for Acme" },
      content: { directory: "docs" },
      navigation: [],
      openapi: { specs: [] },
      seo: {
        sitemap: true,
        robots: { enabled: true, rules: [{ userAgent: "*", allow: "/" }] },
        twitterCard: "summary_large_image",
      },
      redirects: [],
      search: { provider: "none" },
      theme: { darkMode: true },
    },
    pages: [],
    operations: [
      {
        specId: "core",
        method: "GET",
        path: "/messages",
        slug: "list-messages",
        route: "/api-reference/list-messages",
        summary: "List messages",
        tags: ["Messages"],
        deprecated: false,
        beta: false,
        auth: [],
        parameters: [],
        responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: ["Message"] }],
        codeSamples: [{ lang: "curl", source: "curl https://api.acme.test/messages" }],
      },
    ],
    routes: [
      {
        kind: "page",
        route: "/",
        title: "Home",
        description: "Welcome",
        html: "<h1>Home</h1><p>Welcome to Acme Docs.</p>",
        markdown: "# Home\n\nWelcome to Acme Docs.",
        seo: {},
      },
      {
        kind: "api-operation",
        route: "/api-reference/list-messages",
        title: "GET /messages",
        description: "List messages",
        html: "",
        markdown: "List messages",
        operation: {
          specId: "core",
          method: "GET",
          path: "/messages",
          slug: "list-messages",
          route: "/api-reference/list-messages",
          summary: "List messages",
          tags: ["Messages"],
          deprecated: false,
          beta: false,
          auth: [],
          parameters: [],
          responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: ["Message"] }],
          codeSamples: [{ lang: "curl", source: "curl https://api.acme.test/messages" }],
        },
      },
      {
        kind: "schema",
        route: "/schemas/Message",
        title: "Schema: Message",
        description: "Shared schema reference.",
        html: "",
        markdown: "",
        schema: { name: "Message", specId: "core" },
      },
    ],
  };
}

export async function writeNextNoClientJsFixtureApps(manifest: SiteManifest, outDir: string): Promise<void> {
  await writeAppRouterFixture(manifest, join(outDir, "app-router"));
  await writePagesRouterFixture(manifest, join(outDir, "pages-router"));
}

export async function auditNextFixtureSource(outDir: string): Promise<FixtureSourceAuditResult> {
  const checkedFiles = [
    join(outDir, "app-router", "app", "layout.tsx"),
    join(outDir, "app-router", "app", "[...slug]", "page.tsx"),
    join(outDir, "pages-router", "pages", "[[...slug]].tsx"),
  ];
  const violations: string[] = [];

  for (const filePath of checkedFiles) {
    const source = await readFile(filePath, "utf8");
    for (const marker of SOURCE_MARKERS) {
      if (source.includes(marker)) {
        violations.push(`${filePath} contains ${marker}`);
      }
    }
  }

  return { checkedFiles, violations };
}

export function auditRenderedDocumenteeHtml(manifest: SiteManifest): FixtureHtmlAuditResult {
  const snapshots: FixtureHtmlSnapshot[] = [];
  const violations: string[] = [];

  for (const route of manifest.routes) {
    const budgetBytes = budgetForRoute(route.kind);
    const html = renderDocumenteePageHtml(manifest, route, { htmlBudgetBytes: budgetBytes });
    const bytes = Buffer.byteLength(html, "utf8");
    snapshots.push({ route: route.route, bytes, budgetBytes });

    for (const marker of HTML_MARKERS) {
      if (html.includes(marker)) {
        violations.push(`${route.route} rendered HTML contains ${marker}`);
      }
    }
    if (/\son[A-Z][A-Za-z]*=/.test(html)) {
      violations.push(`${route.route} rendered HTML contains inline event handler`);
    }
    if (bytes > budgetBytes) {
      violations.push(`${route.route} rendered HTML is ${bytes} bytes, over budget ${budgetBytes}`);
    }
  }

  return { snapshots, violations };
}

export async function maybeRunNextFixtureBuild(appDir: string): Promise<OptionalNextBuildResult> {
  if (process.env.DOCUMENTEE_RUN_NEXT_FIXTURE_BUILD !== "1") {
    return {
      ran: false,
      skipped: true,
      reason: "Set DOCUMENTEE_RUN_NEXT_FIXTURE_BUILD=1 to run Next fixture builds.",
    };
  }

  const exitCode = await runCommand("pnpm", ["exec", "next", "build"], appDir);
  return {
    ran: true,
    skipped: false,
    exitCode,
  };
}

function runCommand(command: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: "ignore" });
    child.on("error", () => resolve(127));
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function budgetForRoute(kind: string): number {
  if (kind === "api-operation") return 120_000;
  if (kind === "schema") return 80_000;
  return 40_000;
}

async function writeAppRouterFixture(manifest: SiteManifest, appDir: string): Promise<void> {
  await mkdir(join(appDir, "app", "[...slug]"), { recursive: true });
  await writeCommonFiles(manifest, appDir);
  await writeFile(join(appDir, "app", "layout.tsx"), appLayout());
  await writeFile(join(appDir, "app", "[...slug]", "page.tsx"), appRouterPage());
}

async function writePagesRouterFixture(manifest: SiteManifest, appDir: string): Promise<void> {
  await mkdir(join(appDir, "pages"), { recursive: true });
  await writeCommonFiles(manifest, appDir);
  await writeFile(join(appDir, "pages", "[[...slug]].tsx"), pagesRouterPage());
}

async function writeCommonFiles(manifest: SiteManifest, appDir: string): Promise<void> {
  await writeFile(join(appDir, "documentee-manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(join(appDir, "next.config.mjs"), "export default { output: 'export' };\n");
  await writeFile(join(appDir, "tsconfig.json"), JSON.stringify(tsconfig(), null, 2));
  await writeFile(join(appDir, "package.json"), JSON.stringify(packageJson(), null, 2));
}

function packageJson(): Record<string, unknown> {
  return {
    private: true,
    type: "module",
    scripts: {
      build: "next build",
    },
    dependencies: {
      "@documentee/react": "workspace:*",
      next: "^15.0.0",
      react: "^19.1.0",
      "react-dom": "^19.1.0",
    },
  };
}

function tsconfig(): Record<string, unknown> {
  return {
    compilerOptions: {
      target: "ES2022",
      lib: ["dom", "dom.iterable", "es2022"],
      allowJs: false,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  };
}

function appLayout(): string {
  return `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
`;
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
