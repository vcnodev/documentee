import { once } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { devCommand } from "../src/commands/dev.js";
import { initCommand } from "../src/commands/init.js";

describe("devCommand", () => {
  it("serves generated HTML from a docs project", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "documentee-dev-"));
    const projectRoot = join(workspace, "docs");
    await initCommand(projectRoot);

    const server = await devCommand(projectRoot, { port: 0 });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP server address");

      const response = await fetch(`http://127.0.0.1:${address.port}/`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain("<h1>Acme Docs</h1>");
      expect(html).toContain("API Reference");
    } finally {
      server.close();
      await once(server, "close");
    }
  });
});
