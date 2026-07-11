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
      description: "Mintlify source docs.",
      colors: { primary: "#10b981" },
      navigation: [{ group: "Start", pages: ["docs/intro"] }],
      openapi: { specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference" }] },
      redirects: [{ from: "/old", to: "/intro" }],
      seo: { titleTemplate: "%s | Mint Docs" },
      search: { provider: "pagefind" },
    }));
    await writeFile(join(source, "docs", "intro.mdx"), "# Intro\n");

    await migrateCommand("mintlify", source, target);

    const config = await readFile(join(target, "documentee.config.ts"), "utf8");
    expect(config).toContain("Mint Docs");
    expect(config).toContain("Mintlify source docs.");
    expect(config).toContain("#10b981");
    expect(config).toContain("\"redirects\"");
    expect(config).toContain("\"titleTemplate\": \"%s | Mint Docs\"");
    expect(config).toContain("\"provider\": \"pagefind\"");
    expect(await readFile(join(target, "docs", "intro.mdx"), "utf8")).toContain("# Intro");
    expect(await readFile(join(target, "migration-report.md"), "utf8")).toContain("docs/intro.mdx");
  });

  it("migrates Docusaurus sidebars into Documentee config", async () => {
    const source = await mkdtemp(join(tmpdir(), "documentee-docusaurus-"));
    const target = await mkdtemp(join(tmpdir(), "documentee-migrated-"));
    await mkdir(join(source, "docs"), { recursive: true });
    await writeFile(join(source, "sidebars.json"), JSON.stringify({ tutorialSidebar: ["intro"] }));
    await writeFile(join(source, "docusaurus.config.json"), JSON.stringify({
      title: "Docusaurus Product Docs",
      tagline: "Build things.",
      themeConfig: { colorMode: { defaultMode: "dark" }, navbar: { title: "Product Docs" } },
      presets: [["classic", { docs: { sidebarPath: "./sidebars.json" } }]],
    }));
    await writeFile(join(source, "docs", "intro.md"), "# Intro\n");

    await migrateCommand("docusaurus", source, target);

    const config = await readFile(join(target, "documentee.config.ts"), "utf8");
    expect(config).toContain("Docusaurus Product Docs");
    expect(config).toContain("Build things.");
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

  it("migrates Scalar docs into Documentee config", async () => {
    const source = await mkdtemp(join(tmpdir(), "documentee-scalar-"));
    const target = await mkdtemp(join(tmpdir(), "documentee-migrated-"));
    await mkdir(join(source, "docs"), { recursive: true });
    await mkdir(join(source, "reference"), { recursive: true });
    await writeFile(join(source, "scalar.config.json"), JSON.stringify({
      title: "Scalar API Docs",
      description: "Reference docs from Scalar.",
      theme: { color: "#6366f1" },
      spec: { url: "./reference/openapi.yaml" },
      search: true,
    }));
    await writeFile(join(source, "docs", "intro.mdx"), "# Intro\n");
    await writeFile(join(source, "reference", "openapi.yaml"), "openapi: 3.1.0\ninfo:\n  title: Scalar\n  version: 1.0.0\npaths: {}\n");

    await migrateCommand("scalar", source, target);

    const config = await readFile(join(target, "documentee.config.ts"), "utf8");
    expect(config).toContain("Scalar API Docs");
    expect(config).toContain("Reference docs from Scalar.");
    expect(config).toContain("#6366f1");
    expect(config).toContain("\"source\": \"./reference/openapi.yaml\"");
    expect(config).toContain("\"provider\": \"pagefind\"");
    expect(await readFile(join(target, "docs", "intro.mdx"), "utf8")).toContain("# Intro");
    expect(await readFile(join(target, "reference", "openapi.yaml"), "utf8")).toContain("openapi: 3.1.0");
  });

  it("migrates Redocly docs into Documentee config", async () => {
    const source = await mkdtemp(join(tmpdir(), "documentee-redocly-"));
    const target = await mkdtemp(join(tmpdir(), "documentee-migrated-"));
    await mkdir(join(source, "docs"), { recursive: true });
    await mkdir(join(source, "openapi"), { recursive: true });
    await writeFile(join(source, "redocly.yaml"), [
      "apis:",
      "  core:",
      "    root: ./openapi/core.yaml",
      "theme:",
      "  openapi:",
      "    theme:",
      "      colors:",
      "        primary:",
      "          main: '#ef4444'",
      "seo:",
      "  title: Redocly API Docs",
      "  description: API docs from Redocly.",
      "redirects:",
      "  - from: /old-api",
      "    to: /api-reference/core",
      "search:",
      "  engine: pagefind",
      "",
    ].join("\n"));
    await writeFile(join(source, "docs", "intro.md"), "# Intro\n");
    await writeFile(join(source, "openapi", "core.yaml"), "openapi: 3.1.0\ninfo:\n  title: Core\n  version: 1.0.0\npaths: {}\n");

    await migrateCommand("redocly", source, target);

    const config = await readFile(join(target, "documentee.config.ts"), "utf8");
    expect(config).toContain("Redocly API Docs");
    expect(config).toContain("API docs from Redocly.");
    expect(config).toContain("#ef4444");
    expect(config).toContain("\"id\": \"core\"");
    expect(config).toContain("\"source\": \"./openapi/core.yaml\"");
    expect(config).toContain("\"from\": \"/old-api\"");
    expect(config).toContain("\"provider\": \"pagefind\"");
    expect(await readFile(join(target, "docs", "intro.md"), "utf8")).toContain("# Intro");
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

  it("writes a migration report with cleanup work", async () => {
    const source = await mkdtemp(join(tmpdir(), "documentee-docusaurus-"));
    const target = await mkdtemp(join(tmpdir(), "documentee-migrated-"));
    await mkdir(join(source, "docs"), { recursive: true });
    await writeFile(join(source, "sidebars.json"), JSON.stringify({ tutorialSidebar: ["intro"] }));
    await writeFile(
      join(source, "docs", "intro.mdx"),
      `# Intro

[Missing page](./missing)

<LegacyWidget mode="full" />
`,
    );

    await migrateCommand("docusaurus", source, target);

    const report = await readFile(join(target, "migration-report.md"), "utf8");
    expect(report).toContain("# Migration Report");
    expect(report).toContain("Source: docusaurus");
    expect(report).toContain("docs/intro.mdx");
    expect(report).toContain("LegacyWidget");
    expect(report).toContain("./missing");
    expect(report).toContain("Manual Follow-up Items");
  });
});
