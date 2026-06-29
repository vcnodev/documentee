import { join } from "node:path";
import { close, createIndex } from "pagefind";

export interface PagefindBuildResult {
  outputPath: string;
  pageCount: number;
}

export async function buildPagefindIndex(siteDir: string): Promise<PagefindBuildResult> {
  const response = await createIndex();
  if (response.errors.length > 0 || !response.index) {
    throw new Error(`Failed to create Pagefind index: ${response.errors.join(", ")}`);
  }

  try {
    const indexed = await response.index.addDirectory({ path: siteDir, glob: "**/*.html" });
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
