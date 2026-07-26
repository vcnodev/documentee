import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { close, createIndex } from "pagefind";

export interface PagefindBuildResult {
  outputPath: string;
  pageCount: number;
}

export interface PagefindBuildOptions {
  basePath?: string;
}

export async function buildPagefindIndex(siteDir: string, options: PagefindBuildOptions = {}): Promise<PagefindBuildResult> {
  const response = await createIndex();
  if (response.errors.length > 0 || !response.index) {
    throw new Error(`Failed to create Pagefind index: ${response.errors.join(", ")}`);
  }

  try {
    const indexed = options.basePath
      ? await addFilesWithBasePath(response.index, siteDir, options.basePath)
      : await response.index.addDirectory({ path: siteDir, glob: "**/*.html" });
    if (indexed.errors.length > 0) {
      throw new Error(`Failed to index HTML with Pagefind: ${indexed.errors.join(", ")}`);
    }

    const output = await response.index.writeFiles({ outputPath: join(siteDir, "_pagefind") });
    if (output.errors.length > 0) {
      throw new Error(`Failed to write Pagefind files: ${output.errors.join(", ")}`);
    }

    return {
      outputPath: output.outputPath,
      pageCount: indexed.page_count,
    };
  } finally {
    await close();
  }
}

async function addFilesWithBasePath(index: NonNullable<Awaited<ReturnType<typeof createIndex>>["index"]>, siteDir: string, basePath: string) {
  const htmlFiles = await listHtmlFiles(siteDir);
  let pageCount = 0;
  const errors: string[] = [];

  for (const sourcePath of htmlFiles) {
    const response = await index.addHTMLFile({
      sourcePath,
      url: urlForHtmlFile(siteDir, sourcePath, basePath),
      content: await readFile(sourcePath, "utf8"),
    });
    errors.push(...response.errors);
    if (response.errors.length === 0) pageCount += 1;
  }

  if (errors.length > 0) {
    throw new Error(`Failed to index HTML with Pagefind: ${errors.join(", ")}`);
  }

  return { page_count: pageCount, errors };
}

async function listHtmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === "_pagefind") continue;
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listHtmlFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function urlForHtmlFile(siteDir: string, filePath: string, basePath: string): string {
  const normalizedBasePath = normalizeBasePath(basePath);
  const relativePath = filePath.slice(siteDir.length).replace(/^\/+|\\/g, "/").replace(/^\/+/, "");
  const route = relativePath === "index.html"
    ? "/"
    : relativePath.endsWith("/index.html")
      ? `/${relativePath.slice(0, -"index.html".length)}`
      : `/${relativePath}`;

  return route === "/" ? `${normalizedBasePath}/` : `${normalizedBasePath}${route}`;
}

function normalizeBasePath(basePath: string): string {
  const normalized = `/${basePath.replace(/^\/+|\/+$/g, "")}`;
  return normalized === "/" ? "" : normalized;
}
