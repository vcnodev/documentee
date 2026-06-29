import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageDirs = ["core", "openapi", "llms", "cli", "search", "renderer-astro", "renderer-next", "react"];

describe("package boundaries", () => {
  it("exports built dist files instead of TypeScript source", async () => {
    for (const dir of packageDirs) {
      const pkg = JSON.parse(await readFile(join(process.cwd(), "packages", dir, "package.json"), "utf8"));

      expect(pkg.exports["."].import).toBe("./dist/src/index.js");
      expect(pkg.exports["."].types).toBe("./dist/src/index.d.ts");
      expect(pkg.files).toEqual(["dist", "README.md"]);
    }
  });

  it("CLI package points its bin at built JavaScript", async () => {
    const pkg = JSON.parse(await readFile(join(process.cwd(), "packages", "cli", "package.json"), "utf8"));

    expect(pkg.bin.documentee).toBe("./dist/src/index.js");
  });

  it("create package points its bin at built JavaScript", async () => {
    const pkg = JSON.parse(await readFile(join(process.cwd(), "packages", "create", "package.json"), "utf8"));

    expect(pkg.bin["create-documentee"]).toBe("./dist/src/index.js");
    expect(pkg.files).toEqual(["dist", "README.md"]);
  });

  it("all publishable packages include README files", async () => {
    for (const dir of [...packageDirs, "create"]) {
      await expect(stat(join(process.cwd(), "packages", dir, "README.md"))).resolves.toBeTruthy();
    }
  });
});
