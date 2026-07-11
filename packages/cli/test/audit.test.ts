import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { auditCommand } from "../src/commands/audit.js";
import { runCli } from "../src/index.js";

describe("auditCommand", () => {
  it("reports actionable documentation quality issues", async () => {
    const root = await createAuditFixture();

    const report = await auditCommand(root);

    expect(report).toContain("# Documentee Audit");
    expect(report).toContain("- Total issues:");
    expect(report).toContain("Broken internal link on /: /missing");
    expect(report).toContain("Missing description for /");
    expect(report).toContain("Missing h1 on /");
    expect(report).toContain("Duplicate title \"Duplicate\"");
    expect(report).toContain("Private content appears public: docs/private/secret.mdx");
    expect(report).toContain("Missing OpenAPI examples for `GET /messages`");
    expect(report).toContain("Missing llms.txt site description metadata");
    expect(report).toContain("Page is too large: /huge");
    expect(report).toContain("Sitemap is enabled but site.url is missing");
    expect(report).not.toContain("Search route missing");
  });

  it("returns stable JSON for CI", async () => {
    const root = await createAuditFixture();

    const json = await auditCommand(root, { format: "json" });
    const parsed = JSON.parse(json);

    expect(parsed.summary.total).toBeGreaterThan(0);
    expect(parsed.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "links",
          severity: "error",
          route: "/",
          message: "Broken internal link on /: /missing",
        }),
        expect.objectContaining({
          category: "openapi",
          severity: "warning",
          message: "Missing OpenAPI examples for `GET /messages`",
        }),
      ]),
    );
  });

  it("prints markdown or JSON from the CLI route", async () => {
    const root = await createAuditFixture();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      await runCli(["audit", root]);
      expect(log).toHaveBeenCalledWith(expect.stringContaining("# Documentee Audit"));

      await runCli(["audit", root, "--format", "json"]);
      expect(log).toHaveBeenCalledWith(expect.stringContaining("\"issues\""));
    } finally {
      log.mockRestore();
    }
  });
});

async function createAuditFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "documentee-audit-"));
  await mkdir(join(root, "docs", "private"), { recursive: true });
  await mkdir(join(root, "api"), { recursive: true });

  await writeFile(
    join(root, "documentee.config.ts"),
    `export default {
  site: { name: "Audit Docs" },
  content: { directory: "docs" },
  navigation: [{ group: "Docs", pages: ["docs/index", "docs/reference", "docs/private/secret", "docs/huge"] }],
  openapi: {
    specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference" }]
  },
  search: { provider: "pagefind" },
  seo: { sitemap: true, robots: { enabled: true, rules: [{ userAgent: "*", allow: "/" }] } },
  theme: { darkMode: true }
};`,
  );

  await writeFile(
    join(root, "docs", "index.mdx"),
    `---
title: Duplicate
---

No heading here. [Missing](/missing)
`,
  );

  await writeFile(
    join(root, "docs", "reference.mdx"),
    `---
title: Duplicate
description: Reference page.
---

# Reference
`,
  );

  await writeFile(
    join(root, "docs", "private", "secret.mdx"),
    `---
title: Secret
description: This should not be public.
---

# Secret
`,
  );

  await writeFile(
    join(root, "docs", "huge.mdx"),
    `---
title: Huge
description: Large page.
---

# Huge

${"Large content.\n\n".repeat(5000)}
`,
  );

  await writeFile(
    join(root, "api", "openapi.yaml"),
    `openapi: 3.1.0
info:
  title: Audit API
  version: 1.0.0
paths:
  /messages:
    get:
      operationId: listMessages
      summary: List messages
      responses:
        "200":
          description: OK
`,
  );

  return root;
}
