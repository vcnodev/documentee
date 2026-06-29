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
});
