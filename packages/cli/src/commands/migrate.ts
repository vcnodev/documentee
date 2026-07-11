import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

export type MigrationSource = "mintlify" | "docusaurus" | "nextra" | "scalar" | "redocly";

export async function migrateCommand(sourceType: MigrationSource, sourceRoot: string, targetRoot: string): Promise<void> {
  const report = createMigrationReport(sourceType, targetRoot);
  if (sourceType === "mintlify") {
    await migrateMintlify(sourceRoot, targetRoot, report);
    await writeMigrationReport(report);
    return;
  }
  if (sourceType === "docusaurus") {
    await migrateDocusaurus(sourceRoot, targetRoot, report);
    await writeMigrationReport(report);
    return;
  }
  if (sourceType === "nextra") {
    await migrateNextra(sourceRoot, targetRoot, report);
    await writeMigrationReport(report);
    return;
  }
  if (sourceType === "scalar") {
    await migrateScalar(sourceRoot, targetRoot, report);
    await writeMigrationReport(report);
    return;
  }
  if (sourceType === "redocly") {
    await migrateRedocly(sourceRoot, targetRoot, report);
    await writeMigrationReport(report);
    return;
  }
  throw new Error(`Unsupported migration source: ${sourceType}`);
}

type MigrationReport = {
  sourceType: MigrationSource;
  targetRoot: string;
  convertedFiles: string[];
  unsupportedComponents: Array<{ file: string; component: string }>;
  pendingLinks: Array<{ file: string; filePath: string; link: string }>;
  brokenLinks: Array<{ file: string; link: string }>;
};

const supportedMigratedComponents = new Set([
  "Accordion",
  "AccordionGroup",
  "Badge",
  "Callout",
  "Card",
  "CardGroup",
  "Changelog",
  "CliCommand",
  "CodeGroup",
  "Column",
  "Columns",
  "EndpointCard",
  "Feature",
  "FeatureGrid",
  "File",
  "FileTree",
  "Folder",
  "Frame",
  "Icon",
  "Mermaid",
  "OpenApiOperation",
  "PackageInstall",
  "ParamField",
  "RequestExample",
  "ResponseExample",
  "ResponseField",
  "Step",
  "Steps",
  "Tab",
  "Tabs",
  "Update",
]);

function createMigrationReport(sourceType: MigrationSource, targetRoot: string): MigrationReport {
  return {
    sourceType,
    targetRoot,
    convertedFiles: [],
    unsupportedComponents: [],
    pendingLinks: [],
    brokenLinks: [],
  };
}

async function migrateMintlify(sourceRoot: string, targetRoot: string, report: MigrationReport): Promise<void> {
  const docsJson = JSON.parse(await readFile(join(sourceRoot, "docs.json"), "utf8"));
  await mkdir(targetRoot, { recursive: true });
  await copyDocsIfExists(join(sourceRoot, "docs"), join(targetRoot, "docs"), report);
  await copyIfExists(join(sourceRoot, "api"), join(targetRoot, "api"));
  await writeDocumenteeConfig(targetRoot, {
    siteName: docsJson.name ?? "Mintlify Docs",
    description: docsJson.description ?? "",
    navigation: docsJson.navigation ?? [],
    openapi: docsJson.openapi ?? { specs: [] },
    redirects: docsJson.redirects ?? [],
    search: normalizeSearchConfig(docsJson.search),
    seo: docsJson.seo,
    theme: normalizeThemeConfig(docsJson.theme ?? docsJson.colors),
  });
}

async function migrateDocusaurus(sourceRoot: string, targetRoot: string, report: MigrationReport): Promise<void> {
  const sidebars = JSON.parse(await readFile(join(sourceRoot, "sidebars.json"), "utf8"));
  const docusaurusConfig = await readJsonIfExists(join(sourceRoot, "docusaurus.config.json"));
  const pages = Object.values(sidebars).flatMap((value) => Array.isArray(value) ? value : []).filter((value): value is string => typeof value === "string");
  await mkdir(targetRoot, { recursive: true });
  await copyDocsIfExists(join(sourceRoot, "docs"), join(targetRoot, "docs"), report);
  await writeDocumenteeConfig(targetRoot, {
    siteName: stringValue(docusaurusConfig?.title) ?? stringValue(docusaurusConfig?.themeConfig?.navbar?.title) ?? "Docusaurus Docs",
    description: stringValue(docusaurusConfig?.tagline) ?? "",
    navigation: [{ group: "Docs", pages: pages.map((page) => `docs/${page}`) }],
    openapi: { specs: [] },
    redirects: [],
    search: { provider: "none" },
    seo: {},
    theme: { darkMode: docusaurusConfig?.themeConfig?.colorMode?.defaultMode !== "light" },
  });
}

async function migrateNextra(sourceRoot: string, targetRoot: string, report: MigrationReport): Promise<void> {
  const meta = JSON.parse(await readFile(join(sourceRoot, "pages", "_meta.json"), "utf8"));
  const pages = Object.keys(meta).filter((key) => !key.startsWith("_"));
  await mkdir(targetRoot, { recursive: true });
  await copyDocsIfExists(join(sourceRoot, "pages"), join(targetRoot, "docs"), report);
  await writeDocumenteeConfig(targetRoot, {
    siteName: "Nextra Docs",
    description: "",
    navigation: [{ group: "Docs", pages: pages.map((page) => `docs/${page}`) }],
    openapi: { specs: [] },
    redirects: [],
    search: { provider: "none" },
    seo: {},
    theme: { darkMode: true },
  });
}

async function migrateScalar(sourceRoot: string, targetRoot: string, report: MigrationReport): Promise<void> {
  const scalarConfig = await readJsonIfExists(join(sourceRoot, "scalar.config.json")) ?? {};
  await mkdir(targetRoot, { recursive: true });
  await copyDocsIfExists(join(sourceRoot, "docs"), join(targetRoot, "docs"), report);
  await copyIfExists(join(sourceRoot, "reference"), join(targetRoot, "reference"));
  await copyIfExists(join(sourceRoot, "api"), join(targetRoot, "api"));
  await writeDocumenteeConfig(targetRoot, {
    siteName: stringValue(scalarConfig.title) ?? "Scalar Docs",
    description: stringValue(scalarConfig.description) ?? "",
    navigation: [{ group: "Docs", pages: ["docs/intro"] }],
    openapi: openApiFromScalar(scalarConfig),
    redirects: [],
    search: normalizeSearchConfig(scalarConfig.search),
    seo: {},
    theme: normalizeThemeConfig(scalarConfig.theme),
  });
}

async function migrateRedocly(sourceRoot: string, targetRoot: string, report: MigrationReport): Promise<void> {
  const redoclySource = await readFile(join(sourceRoot, "redocly.yaml"), "utf8");
  await mkdir(targetRoot, { recursive: true });
  await copyDocsIfExists(join(sourceRoot, "docs"), join(targetRoot, "docs"), report);
  await copyIfExists(join(sourceRoot, "openapi"), join(targetRoot, "openapi"));
  await copyIfExists(join(sourceRoot, "api"), join(targetRoot, "api"));
  await writeDocumenteeConfig(targetRoot, {
    siteName: yamlScalar(redoclySource, "seo.title") ?? "Redocly Docs",
    description: yamlScalar(redoclySource, "seo.description") ?? "",
    navigation: [{ group: "Docs", pages: ["docs/intro"] }],
    openapi: openApiFromRedocly(redoclySource),
    redirects: redirectsFromRedocly(redoclySource),
    search: { provider: yamlScalar(redoclySource, "search.engine") === "pagefind" ? "pagefind" : "none" },
    seo: {
      titleTemplate: yamlScalar(redoclySource, "seo.title") ? `%s | ${yamlScalar(redoclySource, "seo.title")}` : undefined,
    },
    theme: { primaryColor: yamlScalar(redoclySource, "theme.openapi.theme.colors.primary.main"), darkMode: true },
  });
}

async function writeDocumenteeConfig(targetRoot: string, input: {
  siteName: string;
  description: string;
  navigation: unknown;
  openapi: unknown;
  redirects: unknown;
  search: unknown;
  seo: unknown;
  theme: unknown;
}): Promise<void> {
  await writeFile(
    join(targetRoot, "documentee.config.ts"),
    `export default ${JSON.stringify({
      site: { name: input.siteName, description: input.description },
      content: { directory: "docs" },
      navigation: input.navigation,
      openapi: input.openapi,
      redirects: input.redirects,
      search: input.search,
      seo: input.seo,
      theme: input.theme,
    }, null, 2)};\n`,
  );
}

async function readJsonIfExists(filePath: string): Promise<any | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function copyIfExists(source: string, target: string): Promise<void> {
  try {
    await cp(source, target, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function copyDocsIfExists(source: string, target: string, report: MigrationReport): Promise<void> {
  try {
    await copyDocs(source, target, report);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function copyDocs(source: string, target: string, report: MigrationReport): Promise<void> {
  const info = await stat(source);
  if (info.isDirectory()) {
    await mkdir(target, { recursive: true });
    for (const entry of await readdir(source)) {
      await copyDocs(join(source, entry), join(target, entry), report);
    }
    return;
  }

  await mkdir(join(target, ".."), { recursive: true });
  const extension = extname(source).toLowerCase();
  if (extension === ".md" || extension === ".mdx") {
    const output = normalizeMigratedMdx(await readFile(source, "utf8"));
    await writeFile(target, output);
    recordConvertedFile(report, target);
    recordUnsupportedComponents(report, target, output);
    recordLinks(report, target, output);
    return;
  }

  await cp(source, target);
}

async function writeMigrationReport(report: MigrationReport): Promise<void> {
  await finalizeBrokenLinks(report);
  const manualFollowUps = [
    "Review generated `documentee.config.ts` for navigation, theme, SEO, redirects, and OpenAPI accuracy.",
    "Run `pnpm docs:validate` after installing dependencies in the migrated project.",
    ...(report.unsupportedComponents.length > 0 ? ["Replace or re-implement unsupported components listed above."] : []),
    ...(report.brokenLinks.length > 0 ? ["Fix broken links listed above before publishing."] : []),
  ];

  const markdown = [
    "# Migration Report",
    "",
    `Source: ${report.sourceType}`,
    "",
    "## Files Converted",
    formatList(report.convertedFiles),
    "",
    "## Unsupported Components",
    formatList(report.unsupportedComponents.map((item) => `${item.file}: ${item.component}`)),
    "",
    "## Broken Links",
    formatList(report.brokenLinks.map((item) => `${item.file}: ${item.link}`)),
    "",
    "## Manual Follow-up Items",
    formatList(manualFollowUps),
    "",
  ].join("\n");

  await writeFile(join(report.targetRoot, "migration-report.md"), markdown);
}

function recordConvertedFile(report: MigrationReport, filePath: string): void {
  report.convertedFiles.push(reportRelativePath(report, filePath));
}

function recordUnsupportedComponents(report: MigrationReport, filePath: string, source: string): void {
  const file = reportRelativePath(report, filePath);
  const seen = new Set<string>();

  for (const match of source.matchAll(/<([A-Z][A-Za-z0-9_.:-]*)\b/g)) {
    const component = match[1].split(/[.:-]/).pop() ?? match[1];
    if (supportedMigratedComponents.has(component) || seen.has(component)) continue;
    seen.add(component);
    report.unsupportedComponents.push({ file, component });
  }
}

function recordLinks(report: MigrationReport, filePath: string, source: string): void {
  const file = reportRelativePath(report, filePath);
  for (const match of source.matchAll(/!?\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const link = cleanLink(match[1]);
    if (!link || shouldSkipLink(link)) continue;
    report.pendingLinks.push({ file, filePath, link });
  }
}

async function finalizeBrokenLinks(report: MigrationReport): Promise<void> {
  for (const link of report.pendingLinks) {
    if (await linkTargetExists(link.filePath, link.link)) continue;
    report.brokenLinks.push({ file: link.file, link: link.link });
  }
}

async function linkTargetExists(filePath: string, link: string): Promise<boolean> {
  const target = resolve(dirname(filePath), link);
  const candidates = extname(target)
    ? [target]
    : [target, `${target}.mdx`, `${target}.md`, join(target, "index.mdx"), join(target, "index.md")];

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return false;
}

function cleanLink(link: string): string {
  return link.replace(/[?#].*$/, "");
}

function shouldSkipLink(link: string): boolean {
  return link.startsWith("/") || link.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(link);
}

function reportRelativePath(report: MigrationReport, filePath: string): string {
  return relative(report.targetRoot, filePath).split("\\").join("/");
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function normalizeMigratedMdx(input: string): string {
  return input
    .replace(/^\s*(?:import|export)\s.+;?\s*$/gm, "")
    .replace(/^:::(\w+)\s*\n([\s\S]*?)\n:::/gm, (_match, type: string, body: string) => {
      return `<Callout type="${type}">\n${body.trim()}\n</Callout>`;
    })
    .replace(/<TabItem\b([^>]*)>/g, (_match, attrs: string) => {
      const label = attributeValue(attrs, "label") ?? attributeValue(attrs, "value") ?? "Tab";
      return `<Tab title="${label}">`;
    })
    .replace(/<\/TabItem>/g, "</Tab>")
    .replace(/<Cards\b[^>]*>/g, "<CardGroup>")
    .replace(/<\/Cards>/g, "</CardGroup>")
    .replace(/\n{3,}/g, "\n\n")
    .trimStart();
}

function normalizeSearchConfig(input: unknown): { provider: "none" | "pagefind" } {
  if (input === true) return { provider: "pagefind" };
  if (input && typeof input === "object" && "provider" in input) {
    return { provider: (input as { provider?: string }).provider === "pagefind" ? "pagefind" : "none" };
  }
  return { provider: "none" };
}

function normalizeThemeConfig(input: any): Record<string, unknown> {
  const color = stringValue(input?.primary) ?? stringValue(input?.primaryColor) ?? stringValue(input?.color);
  return {
    ...(color ? { primaryColor: color } : {}),
    darkMode: input?.darkMode !== false,
  };
}

function openApiFromScalar(input: any): { specs: Array<{ id: string; name: string; source: string; routeBase: string }> } {
  const source = stringValue(input?.spec?.url) ?? stringValue(input?.spec?.source) ?? "./openapi.yaml";
  return {
    specs: [{ id: "core", name: "Core API", source, routeBase: "/api-reference" }],
  };
}

function openApiFromRedocly(source: string): { specs: Array<{ id: string; name: string; source: string; routeBase: string }> } {
  const specs: Array<{ id: string; name: string; source: string; routeBase: string }> = [];
  let currentId: string | undefined;
  let inApis = false;

  for (const line of source.split("\n")) {
    if (line === "apis:") {
      inApis = true;
      continue;
    }
    if (!inApis) continue;
    if (line.trim() && leadingSpaces(line) === 0) break;

    const apiMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (apiMatch) {
      currentId = apiMatch[1];
      continue;
    }

    const rootMatch = line.match(/^    root:\s*(.+)$/);
    if (currentId && rootMatch) {
      specs.push({
        id: currentId,
        name: `${currentId} API`,
        source: stripYamlQuotes(rootMatch[1].trim()),
        routeBase: `/api-reference/${currentId}`,
      });
      currentId = undefined;
    }
  }
  return { specs };
}

function redirectsFromRedocly(source: string): Array<{ from: string; to: string; status: 301 }> {
  const redirects: Array<{ from: string; to: string; status: 301 }> = [];
  let inRedirects = false;
  let current: { from?: string; to?: string } | undefined;

  for (const line of source.split("\n")) {
    if (line === "redirects:") {
      inRedirects = true;
      continue;
    }
    if (!inRedirects) continue;
    if (line.trim() && leadingSpaces(line) === 0) break;

    const itemMatch = line.match(/^  -\s+from:\s*(.+)$/);
    if (itemMatch) {
      if (current?.from && current.to) {
        redirects.push({ from: current.from, to: current.to, status: 301 });
      }
      current = { from: stripYamlQuotes(itemMatch[1].trim()) };
      continue;
    }

    const toMatch = line.match(/^    to:\s*(.+)$/);
    if (current && toMatch) {
      current.to = stripYamlQuotes(toMatch[1].trim());
    }
  }

  if (current?.from && current.to) {
    redirects.push({ from: current.from, to: current.to, status: 301 });
  }
  return redirects;
}

function yamlScalar(source: string, path: string): string | undefined {
  const keys = path.split(".");
  const lines = source.split("\n");
  let indent = 0;
  let start = 0;

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const pattern = new RegExp(`^ {${indent}}${escapeRegExp(key)}:\\s*(.*)$`);
    let found = false;

    for (let lineIndex = start; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      if (lineIndex > start && line.trim() && leadingSpaces(line) < indent) break;
      const match = line.match(pattern);
      if (!match) continue;
      const value = match[1]?.trim();
      if (index === keys.length - 1) return value ? stripYamlQuotes(value) : undefined;
      indent += 2;
      start = lineIndex + 1;
      found = true;
      break;
    }

    if (!found) return undefined;
  }

  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stripYamlQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}

function leadingSpaces(value: string): number {
  return value.match(/^ */)?.[0].length ?? 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function attributeValue(source: string, name: string): string | undefined {
  const pattern = new RegExp(`${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`);
  const match = source.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}
