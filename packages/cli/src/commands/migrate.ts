import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

export type MigrationSource = "mintlify" | "docusaurus" | "nextra";

export async function migrateCommand(sourceType: MigrationSource, sourceRoot: string, targetRoot: string): Promise<void> {
  if (sourceType === "mintlify") {
    await migrateMintlify(sourceRoot, targetRoot);
    return;
  }
  if (sourceType === "docusaurus") {
    await migrateDocusaurus(sourceRoot, targetRoot);
    return;
  }
  if (sourceType === "nextra") {
    await migrateNextra(sourceRoot, targetRoot);
    return;
  }
  throw new Error(`Unsupported migration source: ${sourceType}`);
}

async function migrateMintlify(sourceRoot: string, targetRoot: string): Promise<void> {
  const docsJson = JSON.parse(await readFile(join(sourceRoot, "docs.json"), "utf8"));
  await mkdir(targetRoot, { recursive: true });
  await copyDocsIfExists(join(sourceRoot, "docs"), join(targetRoot, "docs"));
  await copyIfExists(join(sourceRoot, "api"), join(targetRoot, "api"));
  await writeDocumenteeConfig(targetRoot, {
    siteName: docsJson.name ?? "Mintlify Docs",
    navigation: docsJson.navigation ?? [],
    openapi: docsJson.openapi ?? { specs: [] },
  });
}

async function migrateDocusaurus(sourceRoot: string, targetRoot: string): Promise<void> {
  const sidebars = JSON.parse(await readFile(join(sourceRoot, "sidebars.json"), "utf8"));
  const pages = Object.values(sidebars).flatMap((value) => Array.isArray(value) ? value : []).filter((value): value is string => typeof value === "string");
  await mkdir(targetRoot, { recursive: true });
  await copyDocsIfExists(join(sourceRoot, "docs"), join(targetRoot, "docs"));
  await writeDocumenteeConfig(targetRoot, {
    siteName: "Docusaurus Docs",
    navigation: [{ group: "Docs", pages: pages.map((page) => `docs/${page}`) }],
    openapi: { specs: [] },
  });
}

async function migrateNextra(sourceRoot: string, targetRoot: string): Promise<void> {
  const meta = JSON.parse(await readFile(join(sourceRoot, "pages", "_meta.json"), "utf8"));
  const pages = Object.keys(meta).filter((key) => !key.startsWith("_"));
  await mkdir(targetRoot, { recursive: true });
  await copyDocsIfExists(join(sourceRoot, "pages"), join(targetRoot, "docs"));
  await writeDocumenteeConfig(targetRoot, {
    siteName: "Nextra Docs",
    navigation: [{ group: "Docs", pages: pages.map((page) => `docs/${page}`) }],
    openapi: { specs: [] },
  });
}

async function writeDocumenteeConfig(targetRoot: string, input: {
  siteName: string;
  navigation: unknown;
  openapi: unknown;
}): Promise<void> {
  await writeFile(
    join(targetRoot, "documentee.config.ts"),
    `export default ${JSON.stringify({
      site: { name: input.siteName, description: "" },
      content: { directory: "docs" },
      navigation: input.navigation,
      openapi: input.openapi,
      search: { provider: "none" },
      theme: { darkMode: true },
    }, null, 2)};\n`,
  );
}

async function copyIfExists(source: string, target: string): Promise<void> {
  try {
    await cp(source, target, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function copyDocsIfExists(source: string, target: string): Promise<void> {
  try {
    await copyDocs(source, target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function copyDocs(source: string, target: string): Promise<void> {
  const info = await stat(source);
  if (info.isDirectory()) {
    await mkdir(target, { recursive: true });
    for (const entry of await readdir(source)) {
      await copyDocs(join(source, entry), join(target, entry));
    }
    return;
  }

  await mkdir(join(target, ".."), { recursive: true });
  const extension = extname(source).toLowerCase();
  if (extension === ".md" || extension === ".mdx") {
    await writeFile(target, normalizeMigratedMdx(await readFile(source, "utf8")));
    return;
  }

  await cp(source, target);
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

function attributeValue(source: string, name: string): string | undefined {
  const pattern = new RegExp(`${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`);
  const match = source.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}
