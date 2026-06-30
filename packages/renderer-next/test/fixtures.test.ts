import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditNextFixtureSource,
  auditRenderedDocumenteeHtml,
  createNoClientJsFixtureManifest,
  maybeRunNextFixtureBuild,
  writeNextNoClientJsFixtureApps,
} from "../src/fixtures.js";

describe("Next no-client-JS fixture apps", () => {
  it("creates a manifest with guide, API operation, and schema routes", () => {
    const manifest = createNoClientJsFixtureManifest();

    expect(manifest.routes.map((route) => route.route)).toEqual([
      "/",
      "/api-reference/list-messages",
      "/schemas/Message",
    ]);
    expect(manifest.routes.find((route) => route.kind === "api-operation")?.operation?.playground).toBeUndefined();
  });

  it("writes real App Router and Pages Router fixture app directories", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "documentee-next-fixture-"));
    const manifest = createNoClientJsFixtureManifest();

    await writeNextNoClientJsFixtureApps(manifest, outDir);

    expect(await exists(join(outDir, "app-router", "app", "layout.tsx"))).toBe(true);
    expect(await exists(join(outDir, "app-router", "app", "[...slug]", "page.tsx"))).toBe(true);
    expect(await exists(join(outDir, "app-router", "next.config.mjs"))).toBe(true);
    expect(await exists(join(outDir, "app-router", "tsconfig.json"))).toBe(true);
    expect(await exists(join(outDir, "pages-router", "pages", "[[...slug]].tsx"))).toBe(true);
    expect(await exists(join(outDir, "pages-router", "next.config.mjs"))).toBe(true);
    expect(await exists(join(outDir, "pages-router", "tsconfig.json"))).toBe(true);

    const appPage = await readFile(join(outDir, "app-router", "app", "[...slug]", "page.tsx"), "utf8");
    const pagesPage = await readFile(join(outDir, "pages-router", "pages", "[[...slug]].tsx"), "utf8");

    expect(appPage).toContain("generateStaticParams");
    expect(appPage).toContain("renderDocumenteePageHtml");
    expect(pagesPage).toContain("getStaticProps");
    expect(pagesPage).toContain("renderDocumenteePageHtml");
  });

  it("audits generated source files for client-side Documentee markers", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "documentee-next-fixture-"));
    const manifest = createNoClientJsFixtureManifest();

    await writeNextNoClientJsFixtureApps(manifest, outDir);

    const result = await auditNextFixtureSource(outDir);

    expect(result.checkedFiles).toEqual(expect.arrayContaining([
      join(outDir, "app-router", "app", "[...slug]", "page.tsx"),
      join(outDir, "pages-router", "pages", "[[...slug]].tsx"),
    ]));
    expect(result.violations).toEqual([]);
  });

  it("audits server-rendered Documentee HTML snapshots and budgets", () => {
    const manifest = createNoClientJsFixtureManifest();
    const result = auditRenderedDocumenteeHtml(manifest);

    expect(result.violations).toEqual([]);
    expect(result.snapshots.map((snapshot) => snapshot.route)).toEqual([
      "/",
      "/api-reference/list-messages",
      "/schemas/Message",
    ]);
    expect(result.snapshots.every((snapshot) => snapshot.bytes < snapshot.budgetBytes)).toBe(true);
  });

  it("skips optional Next build smoke when the environment flag is disabled", async () => {
    const result = await maybeRunNextFixtureBuild("/tmp/not-used");

    expect(result).toEqual({
      ran: false,
      skipped: true,
      reason: "Set DOCUMENTEE_RUN_NEXT_FIXTURE_BUILD=1 to run Next fixture builds.",
    });
  });
});

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
