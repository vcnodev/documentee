import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCommand } from "../src/commands/build.js";
import { initCommand } from "../src/commands/init.js";
import { validateCommand } from "../src/commands/validate.js";
import { runCli } from "../src/index.js";

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
    expect(await readFile(join(outDir, "skill.md"), "utf8")).toContain("# Acme Docs Agent Skill");
    const llmsJson = JSON.parse(await readFile(join(outDir, "llms.json"), "utf8"));
    expect(llmsJson.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: "/", contentType: "guide" }),
        expect.objectContaining({ route: "/api-reference/list-messages", contentType: "api-operation" }),
      ]),
    );
  });

  it("initializes each starter template into a buildable docs project", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "documentee-cli-templates-"));

    for (const template of ["api-first", "product-docs", "enterprise-docs"] as const) {
      const projectRoot = join(workspace, template);
      const outDir = join(workspace, `${template}-dist`);

      await initCommand(projectRoot, { template });
      await validateCommand(projectRoot);
      await buildCommand(projectRoot, outDir);

      expect(await exists(join(outDir, "index.html"))).toBe(true);
      expect(await readFile(join(projectRoot, "documentee.config.ts"), "utf8")).toContain(template);
      expect(await readFile(join(outDir, "llms.txt"), "utf8")).toContain("#");
    }
  });

  it("supports init --template in the current directory", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "documentee-cli-init-template-"));
    const originalInitCwd = process.env.INIT_CWD;
    process.env.INIT_CWD = workspace;

    try {
      await runCli(["init", "--template", "product-docs"]);
    } finally {
      if (originalInitCwd === undefined) {
        delete process.env.INIT_CWD;
      } else {
        process.env.INIT_CWD = originalInitCwd;
      }
    }

    expect(await readFile(join(workspace, "documentee.config.ts"), "utf8")).toContain("product-docs");
    expect(await readFile(join(workspace, "docs", "guides", "projects.mdx"), "utf8")).toContain("# Projects");
  });

  it("requires a project path unless a template is selected for the current directory", async () => {
    await expect(runCli(["init"])).rejects.toThrow("Usage: documentee init");
  });

  it("keeps source template directories in the repository", async () => {
    for (const template of ["api-first", "product-docs", "enterprise-docs"]) {
      expect(await exists(join(process.cwd(), "templates", template, "documentee.config.ts"))).toBe(true);
      expect(await exists(join(process.cwd(), "templates", template, "docs", "index.mdx"))).toBe(true);
    }
  });

  it("removes stale files from previous builds", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "documentee-cli-clean-"));
    const projectRoot = join(workspace, "docs");
    const outDir = join(workspace, "dist");
    const stalePath = join(outDir, "superpowers", "private", "index.html");

    await initCommand(projectRoot);
    await mkdir(join(outDir, "superpowers", "private"), { recursive: true });
    await writeFile(stalePath, "<h1>stale private page</h1>");

    await buildCommand(projectRoot, outDir);

    expect(await exists(join(outDir, "index.html"))).toBe(true);
    expect(await exists(stalePath)).toBe(false);
  });

  it("rejects dangerous build output directories before cleaning", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "documentee-cli-safe-out-"));
    const projectRoot = join(workspace, "docs");

    await initCommand(projectRoot);

    await expect(buildCommand(projectRoot, projectRoot)).rejects.toThrow("Refusing to clean unsafe output directory");
    await expect(buildCommand(projectRoot, workspace)).rejects.toThrow("Refusing to clean unsafe output directory");
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
