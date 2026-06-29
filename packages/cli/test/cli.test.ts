import { mkdir, mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCommand } from "../src/commands/build.js";
import { initCommand } from "../src/commands/init.js";
import { validateCommand } from "../src/commands/validate.js";

describe("CLI commands", () => {
  it("initializes, validates, and builds a docs project", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "documentee-cli-"));
    const projectRoot = join(workspace, "docs");
    const outDir = join(workspace, "dist");

    await initCommand(projectRoot);
    await validateCommand(projectRoot);
    await buildCommand(projectRoot, outDir);

    expect(await exists(join(outDir, "index.html"))).toBe(true);
    expect(await exists(join(outDir, "api-reference", "list-messages", "index.html"))).toBe(true);
    expect(await readFile(join(outDir, "llms.txt"), "utf8")).toContain("Acme Docs");
    expect(await readFile(join(outDir, "llms-full.txt"), "utf8")).toContain("GET /messages");
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
