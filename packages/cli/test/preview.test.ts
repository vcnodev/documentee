import { once } from "node:events";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initCommand } from "../src/commands/init.js";
import { previewCommand } from "../src/commands/preview.js";

describe("previewCommand", () => {
  it("builds and serves static output files", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "documentee-preview-"));
    const projectRoot = join(workspace, "docs");
    const outDir = join(workspace, "dist");
    await initCommand(projectRoot);

    const server = await previewCommand(projectRoot, { outDir, port: 0 });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP server address");

      const baseUrl = `http://127.0.0.1:${address.port}`;
      const home = await fetch(`${baseUrl}/`);
      const homeHtml = await home.text();
      const quickstart = await fetch(`${baseUrl}/get-started/quickstart/`);
      const llms = await fetch(`${baseUrl}/llms.txt`);
      const missing = await fetch(`${baseUrl}/missing`);

      expect(home.status).toBe(200);
      expect(homeHtml).toContain("<h1>Acme Docs</h1>");
      expect(quickstart.status).toBe(200);
      expect(await quickstart.text()).toContain("<h1>Quickstart</h1>");
      expect(llms.status).toBe(200);
      expect(await llms.text()).toContain("Acme Docs");
      expect(missing.status).toBe(404);
    } finally {
      server.close();
      await once(server, "close");
    }
  });

  it("serves static output through the configured site base path", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "documentee-preview-"));
    const projectRoot = join(workspace, "docs");
    const outDir = join(workspace, "dist");
    await initCommand(projectRoot);
    await writeFile(
      join(projectRoot, "documentee.config.ts"),
      `export default {
  site: {
    name: "Acme Docs",
    basePath: "/docs",
    description: "API-first documentation for builders integrating Acme payments.",
  },
  content: { directory: "docs" },
  navigation: [{ group: "Get Started", pages: ["docs/index", "docs/get-started/quickstart"] }],
  search: { provider: "none" },
};
`,
    );

    const server = await previewCommand(projectRoot, { outDir, port: 0 });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP server address");

      const baseUrl = `http://127.0.0.1:${address.port}`;
      const home = await fetch(`${baseUrl}/docs/`);
      const homeHtml = await home.text();
      const quickstart = await fetch(`${baseUrl}/docs/get-started/quickstart/`);

      expect(home.status).toBe(200);
      expect(homeHtml).toContain('href="/docs/get-started/quickstart/"');
      expect(quickstart.status).toBe(200);
      expect(await quickstart.text()).toContain("<h1>Quickstart</h1>");
    } finally {
      server.close();
      await once(server, "close");
    }
  });
});
