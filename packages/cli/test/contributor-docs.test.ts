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

  it("documents feature commands and repository coding rules", async () => {
    await expect(stat(join(process.cwd(), "AGENTS.md"))).resolves.toBeTruthy();

    const rootReadme = await readFile(join(process.cwd(), "README.md"), "utf8");
    const agents = await readFile(join(process.cwd(), "AGENTS.md"), "utf8");
    const testing = await readFile(join(process.cwd(), "docs/contributing/testing.md"), "utf8");
    const architecture = await readFile(join(process.cwd(), "docs/contributing/architecture.md"), "utf8");
    const cliReadme = await readFile(join(process.cwd(), "packages/cli/README.md"), "utf8");
    const coreReadme = await readFile(join(process.cwd(), "packages/core/README.md"), "utf8");
    const openApiReadme = await readFile(join(process.cwd(), "packages/openapi/README.md"), "utf8");

    expect(rootReadme).toContain("documentee preview");
    expect(rootReadme).toContain("[Repository Rules](AGENTS.md)");
    expect(rootReadme).toContain("[CLI](packages/cli/README.md)");
    expect(cliReadme).toContain("documentee preview");
    expect(coreReadme).toContain("theme");
    expect(openApiReadme).toContain("OpenAPI 3.0");
    expect(agents).toContain("Behavior changes require tests");
    expect(agents).toContain("User-facing changes require docs");
    expect(testing).toContain("User-facing changes require docs");
    expect(architecture).toContain("preview");
  });
});
