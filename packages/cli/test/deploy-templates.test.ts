import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("deployment templates", () => {
  it("includes templates for major static hosts", async () => {
    const root = process.cwd();
    const files = [
      "templates/deploy/github-pages.yml",
      "templates/deploy/vercel.json",
      "templates/deploy/netlify.toml",
      "templates/deploy/cloudflare-pages.md",
    ];

    for (const file of files) {
      await expect(stat(join(root, file))).resolves.toBeTruthy();
    }

    expect(await readFile(join(root, "templates/deploy/github-pages.yml"), "utf8")).toContain("documentee build");
    expect(await readFile(join(root, "templates/deploy/vercel.json"), "utf8")).toContain("dist");
    expect(await readFile(join(root, "templates/deploy/netlify.toml"), "utf8")).toContain("publish = \"dist\"");
    expect(await readFile(join(root, "templates/deploy/cloudflare-pages.md"), "utf8")).toContain("Cloudflare Pages");
  });
});
