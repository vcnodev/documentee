import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { generateMcpCommand } from "../src/commands/generate-mcp.js";
import { initCommand } from "../src/commands/init.js";
import { runCli } from "../src/index.js";

describe("generateMcpCommand", () => {
  it("generates a deterministic read-only MCP server from the docs manifest", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "documentee-mcp-"));
    const projectRoot = join(workspace, "docs");
    const outDir = join(workspace, ".documentee-mcp");

    await initCommand(projectRoot);
    await generateMcpCommand(projectRoot, outDir);

    expect(await exists(join(outDir, "package.json"))).toBe(true);
    expect(await exists(join(outDir, "server.mjs"))).toBe(true);
    expect(await exists(join(outDir, "llms.json"))).toBe(true);
    expect(await exists(join(outDir, "README.md"))).toBe(true);

    const packageJson = JSON.parse(await readFile(join(outDir, "package.json"), "utf8"));
    expect(packageJson).toMatchObject({
      name: "documentee-mcp-server",
      type: "module",
      scripts: { start: "node server.mjs" },
    });
    expect(packageJson.dependencies).toMatchObject({
      "@modelcontextprotocol/sdk": expect.any(String),
      zod: expect.any(String),
    });

    const server = await readFile(join(outDir, "server.mjs"), "utf8");
    expect(server).toContain('name: "documentee-mcp-server"');
    expect(server).toMatch(/server\.registerTool\(\s*"search_docs"/);
    expect(server).toMatch(/server\.registerTool\(\s*"read_doc"/);
    expect(server).toMatch(/server\.registerTool\(\s*"list_api_operations"/);
    expect(server).toMatch(/server\.registerTool\(\s*"read_api_operation"/);
    expect(server.match(/readOnlyHint: true/g)?.length).toBe(4);

    const llmsJson = JSON.parse(await readFile(join(outDir, "llms.json"), "utf8"));
    expect(llmsJson.site.name).toBe("Acme Docs");
    expect(llmsJson.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: "/", contentType: "guide", chunks: expect.any(Array) }),
        expect.objectContaining({ route: "/api-reference/list-messages", contentType: "api-operation" }),
      ]),
    );
    expect(llmsJson.routes.some((route: { chunks: unknown[] }) => route.chunks.length > 0)).toBe(true);

    const readme = await readFile(join(outDir, "README.md"), "utf8");
    expect(readme).toContain("search_docs(query)");
    expect(readme).toContain("read_api_operation(method, path)");
  });

  it("routes generate-mcp through the CLI", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "documentee-mcp-cli-"));
    const projectRoot = join(workspace, "docs");
    const outDir = join(workspace, "mcp");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await initCommand(projectRoot);

    try {
      await runCli(["generate-mcp", projectRoot, "--out", outDir]);
      expect(await exists(join(outDir, "server.mjs"))).toBe(true);
      expect(log).toHaveBeenCalledWith(expect.stringContaining("Generated Documentee MCP server"));
    } finally {
      log.mockRestore();
    }
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
