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
    expect(pages[0].seo).toEqual({});
    expect(pages[0].sourceRelativePath).toBe("get-started/quickstart.mdx");
    expect(pages[0].sourceProjectPath).toBe("docs/get-started/quickstart.mdx");
    expect(new Date(pages[0].lastUpdated).toString()).not.toBe("Invalid Date");
    expect(pages[0].html).toContain("<h1>Hello</h1>");
    expect(pages[0].html).toContain("<strong>Acme</strong>");
  });

  it("excludes Markdown and MDX files by patterns relative to the content directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-content-"));
    await mkdir(join(root, "docs", "public"), { recursive: true });
    await mkdir(join(root, "docs", "superpowers"), { recursive: true });
    await writeFile(join(root, "docs", "index.mdx"), "---\ntitle: Home\n---\n# Home\n");
    await writeFile(join(root, "docs", "public", "page.md"), "---\ntitle: Public\n---\n# Public\n");
    await writeFile(join(root, "docs", "superpowers", "private.mdx"), "---\ntitle: Private\n---\n# Private\n");

    const pages = await loadContentPages(root, { directory: "docs", exclude: ["superpowers/**"] });

    expect(pages.map((page) => page.route)).toEqual(["/", "/public/page"]);
    expect(pages.map((page) => page.title)).not.toContain("Private");
  });

  it("omits project-relative source metadata for content outside the project root", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-content-root-"));
    const externalRoot = await mkdtemp(join(tmpdir(), "documentee-content-external-"));
    await mkdir(join(externalRoot, "docs"), { recursive: true });
    await writeFile(join(externalRoot, "docs", "outside.mdx"), "---\ntitle: Outside\n---\n# Outside\n");

    const pages = await loadContentPages(root, { directory: join(externalRoot, "docs") });

    expect(pages).toHaveLength(1);
    expect(pages[0].sourceRelativePath).toBe("outside.mdx");
    expect(pages[0].sourceProjectPath).toBeUndefined();
  });

  it("loads SEO frontmatter fields", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-content-"));
    await mkdir(join(root, "docs"), { recursive: true });
    await writeFile(
      join(root, "docs", "quickstart.mdx"),
      `---
title: Quickstart
description: Start using Acme.
canonical: https://docs.acme.test/start
robots: noindex,nofollow
image: /quickstart-og.png
socialTitle: Start with Acme
socialDescription: Send your first request.
---

# Hello
`,
    );

    const [page] = await loadContentPages(root, { directory: "docs" });

    expect(page.seo).toEqual({
      canonical: "https://docs.acme.test/start",
      robots: "noindex,nofollow",
      image: "/quickstart-og.png",
      socialTitle: "Start with Acme",
      socialDescription: "Send your first request.",
    });
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

<Badge text="Stable" tone="success" />

<CardGroup cols="2">
<Card title="Guide" href="/guide">Read the guide.</Card>
</CardGroup>

<AccordionGroup>
<Accordion title="Question">Answer.</Accordion>
</AccordionGroup>

<ParamField path="body.id" type="string" required>Identifier.</ParamField>

<ResponseField name="message" type="object">Message object.</ResponseField>

<Frame caption="Preview">
<img src="/preview.png" alt="Preview">
</Frame>
`,
    );

    const [page] = await loadContentPages(root, { directory: "docs" });

    expect(page.html).toContain('class="doc-callout doc-callout-warning"');
    expect(page.html).toContain("<strong>Install</strong>");
    expect(page.html).toContain('class="doc-tabs"');
    expect(page.html).toContain('class="doc-code-group"');
    expect(page.html).toContain('class="doc-badge doc-badge-success"');
    expect(page.html).toContain('class="doc-card-group doc-card-group-2"');
    expect(page.html).toContain('class="doc-accordion-group"');
    expect(page.html).toContain('class="doc-field doc-field-param"');
    expect(page.html).toContain('class="doc-field doc-field-response"');
    expect(page.html).toContain('class="doc-frame"');
  });
});
