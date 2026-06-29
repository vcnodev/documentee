import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContentPages } from "../src/content.js";

describe("loadContentPages", () => {
  it("loads MDX pages with frontmatter, routes, and rendered HTML", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-content-"));
    await mkdir(join(root, "docs", "get-started"), { recursive: true });
    await writeFile(
      join(root, "docs", "get-started", "quickstart.mdx"),
      `---
title: Quickstart
description: Start using Acme.
---

# Hello

Welcome to **Acme**.
`,
    );

    const pages = await loadContentPages(root, { directory: "docs" });

    expect(pages).toHaveLength(1);
    expect(pages[0].route).toBe("/get-started/quickstart");
    expect(pages[0].title).toBe("Quickstart");
    expect(pages[0].description).toBe("Start using Acme.");
    expect(pages[0].html).toContain("<h1>Hello</h1>");
    expect(pages[0].html).toContain("<strong>Acme</strong>");
  });

  it("renders supported MDX-style components into static HTML", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-content-"));
    await mkdir(join(root, "docs"), { recursive: true });
    await writeFile(
      join(root, "docs", "components.mdx"),
      `---
title: Components
---

<Callout type="warning">
Check your API key.
</Callout>

<Steps>
<Step title="Install">Run pnpm install.</Step>
<Step title="Build">Run pnpm build.</Step>
</Steps>

<Tabs>
<Tab title="curl">curl https://api.acme.test</Tab>
<Tab title="js">fetch("/api")</Tab>
</Tabs>

<CodeGroup>
\`\`\`bash
pnpm test
\`\`\`
</CodeGroup>
`,
    );

    const [page] = await loadContentPages(root, { directory: "docs" });

    expect(page.html).toContain('class="doc-callout doc-callout-warning"');
    expect(page.html).toContain("<strong>Install</strong>");
    expect(page.html).toContain('class="doc-tabs"');
    expect(page.html).toContain('class="doc-code-group"');
  });
});
