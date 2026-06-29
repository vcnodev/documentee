import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrateCommand } from "../src/commands/migrate.js";

describe("migrateCommand", () => {
  it("migrates Mintlify docs.json into Documentee config", async () => {
    const source = await mkdtemp(join(tmpdir(), "documentee-mintlify-"));
    const target = await mkdtemp(join(tmpdir(), "documentee-migrated-"));
    await mkdir(join(source, "docs"), { recursive: true });
    await writeFile(join(source, "docs.json"), JSON.stringify({
      name: "Mint Docs",
      navigation: [{ group: "Start", pages: ["docs/intro"] }],
      openapi: { specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference" }] },
    }));
    await writeFile(join(source, "docs", "intro.mdx"), "# Intro\n");

    await migrateCommand("mintlify", source, target);

    expect(await readFile(join(target, "documentee.config.ts"), "utf8")).toContain("Mint Docs");
    expect(await readFile(join(target, "docs", "intro.mdx"), "utf8")).toContain("# Intro");
  });

  it("migrates Docusaurus sidebars into Documentee config", async () => {
    const source = await mkdtemp(join(tmpdir(), "documentee-docusaurus-"));
    const target = await mkdtemp(join(tmpdir(), "documentee-migrated-"));
    await mkdir(join(source, "docs"), { recursive: true });
    await writeFile(join(source, "sidebars.json"), JSON.stringify({ tutorialSidebar: ["intro"] }));
    await writeFile(join(source, "docs", "intro.md"), "# Intro\n");

    await migrateCommand("docusaurus", source, target);

    expect(await readFile(join(target, "documentee.config.ts"), "utf8")).toContain("Docusaurus Docs");
    expect(await readFile(join(target, "docs", "intro.md"), "utf8")).toContain("# Intro");
  });

  it("migrates Nextra meta into Documentee config", async () => {
    const source = await mkdtemp(join(tmpdir(), "documentee-nextra-"));
    const target = await mkdtemp(join(tmpdir(), "documentee-migrated-"));
    await mkdir(join(source, "pages"), { recursive: true });
    await writeFile(join(source, "pages", "_meta.json"), JSON.stringify({ intro: "Intro" }));
    await writeFile(join(source, "pages", "intro.mdx"), "# Intro\n");

    await migrateCommand("nextra", source, target);

    expect(await readFile(join(target, "documentee.config.ts"), "utf8")).toContain("Nextra Docs");
    expect(await readFile(join(target, "docs", "intro.mdx"), "utf8")).toContain("# Intro");
  });
});
