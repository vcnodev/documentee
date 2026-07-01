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

  it("normalizes Docusaurus MDX components during migration", async () => {
    const source = await mkdtemp(join(tmpdir(), "documentee-docusaurus-"));
    const target = await mkdtemp(join(tmpdir(), "documentee-migrated-"));
    await mkdir(join(source, "docs"), { recursive: true });
    await writeFile(join(source, "sidebars.json"), JSON.stringify({ tutorialSidebar: ["intro"] }));
    await writeFile(
      join(source, "docs", "intro.mdx"),
      `import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Intro

:::tip
Use the API carefully.
:::

<Tabs>
  <TabItem value="curl" label="cURL">
curl https://api.acme.test
  </TabItem>
</Tabs>
`,
    );

    await migrateCommand("docusaurus", source, target);
    const output = await readFile(join(target, "docs", "intro.mdx"), "utf8");

    expect(output).not.toContain("import Tabs");
    expect(output).toContain('<Callout type="tip">');
    expect(output).toContain("Use the API carefully.");
    expect(output).toContain('<Tab title="cURL">');
    expect(output).not.toContain("TabItem");
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

  it("normalizes Nextra cards during migration", async () => {
    const source = await mkdtemp(join(tmpdir(), "documentee-nextra-"));
    const target = await mkdtemp(join(tmpdir(), "documentee-migrated-"));
    await mkdir(join(source, "pages"), { recursive: true });
    await writeFile(join(source, "pages", "_meta.json"), JSON.stringify({ intro: "Intro" }));
    await writeFile(
      join(source, "pages", "intro.mdx"),
      `import { Cards, Card } from 'nextra/components';

# Intro

<Cards>
  <Card title="Quickstart" href="/quickstart">
    Start here.
  </Card>
</Cards>
`,
    );

    await migrateCommand("nextra", source, target);
    const output = await readFile(join(target, "docs", "intro.mdx"), "utf8");

    expect(output).not.toContain("import { Cards");
    expect(output).toContain("<CardGroup>");
    expect(output).toContain('<Card title="Quickstart" href="/quickstart">');
    expect(output).toContain("Start here.");
  });
});
