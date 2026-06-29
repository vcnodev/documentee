import { mkdir, stat, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPagefindIndex } from "../src/pagefind.js";

describe("buildPagefindIndex", () => {
  it("writes Pagefind artifacts for static HTML output", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-pagefind-"));
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "index.html"), "<html><body><main><h1>Searchable Docs</h1></main></body></html>");

    const result = await buildPagefindIndex(root);

    expect(result.outputPath).toBe(join(root, "_pagefind"));
    expect(await exists(join(root, "_pagefind", "pagefind.js"))).toBe(true);
  });
});

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
