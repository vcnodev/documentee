import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("contributor docs", () => {
  it("documents architecture, testing, package boundaries, and small HTML policy", async () => {
    const docs = [
      "docs/contributing/architecture.md",
      "docs/contributing/testing.md",
      "docs/contributing/package-boundaries.md",
      "docs/contributing/small-html-no-client-js.md",
    ];

    for (const doc of docs) {
      await expect(stat(join(process.cwd(), doc))).resolves.toBeTruthy();
    }

    expect(await readFile(join(process.cwd(), "docs/contributing/architecture.md"), "utf8")).toContain("renderer-agnostic");
    expect(await readFile(join(process.cwd(), "docs/contributing/testing.md"), "utf8")).toContain("pnpm test");
    expect(await readFile(join(process.cwd(), "docs/contributing/package-boundaries.md"), "utf8")).toContain("dist");
    expect(await readFile(join(process.cwd(), "docs/contributing/small-html-no-client-js.md"), "utf8")).toContain("HTML payload");
  });
});
