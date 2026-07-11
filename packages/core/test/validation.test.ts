import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { buildManifest } from "../src/manifest.js";
import { validateManifest } from "../src/validation.js";

describe("validateManifest", () => {
  it("reports missing navigation pages and broken internal links", async () => {
    const root = await createProject({
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [{ group: "Get Started", pages: ["docs/missing"] }],
        openapi: { specs: [] },
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: {
        "docs/index.mdx": "---\ntitle: Home\n---\n# Home\n[Missing](/missing-page)\n",
      },
    });

    const config = await loadConfig(root);
    const manifest = await buildManifest(root, config);
    const diagnostics = validateManifest(manifest);

    expect(diagnostics).toContain("Navigation page target does not exist: docs/missing");
    expect(diagnostics).toContain("Broken internal link on /: /missing-page");
  });

  it("reports duplicate routes", async () => {
    const root = await createProject({
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference" }] },
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: {},
      openapi: `openapi: 3.1.0
info:
  title: Acme
  version: 1.0.0
paths:
  /a:
    get:
      operationId: same
      responses:
        "200":
          description: OK
  /b:
    get:
      operationId: same
      responses:
        "200":
          description: OK
`,
    });

    const config = await loadConfig(root);
    const manifest = await buildManifest(root, config);
    const diagnostics = validateManifest(manifest);

    expect(diagnostics).toContain("Duplicate route: /api-reference/same");
  });

  it("reports redirect source conflicts with generated routes", async () => {
    const root = await createProject({
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [],
        openapi: { specs: [] },
        redirects: [{ from: "/old", to: "/", status: 301 }],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: {
        "docs/old.mdx": "---\ntitle: Old\n---\n# Old\n",
      },
    });

    const config = await loadConfig(root);
    const manifest = await buildManifest(root, config);
    const diagnostics = validateManifest(manifest);

    expect(diagnostics).toContain("Redirect source conflicts with generated route: /old");
  });

  it("reports missing OpenAPI navigation targets", async () => {
    const root = await createProject({
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        navigation: [{ group: "Missing API", openapi: "missing" }],
        openapi: { specs: [] },
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: {
        "docs/index.mdx": "---\ntitle: Home\n---\n# Home\n",
      },
    });

    const config = await loadConfig(root);
    const manifest = await buildManifest(root, config);
    const diagnostics = validateManifest(manifest);

    expect(diagnostics).toContain("Navigation OpenAPI target does not exist: missing");
  });

  it("reports OpenAPI specs that reference missing versions", async () => {
    const root = await createProject({
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        versions: [{ id: "v1", content: { directory: "docs/v1" } }],
        navigation: [],
        openapi: { specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference", version: "v3" }] },
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: {
        "docs/index.mdx": "---\ntitle: Home\n---\n# Home\n",
        "docs/v1/index.mdx": "---\ntitle: V1\n---\n# V1\n",
      },
      openapi: `openapi: 3.1.0
info:
  title: Acme
  version: 1.0.0
paths:
  /messages:
    get:
      operationId: listMessages
      responses:
        "200":
          description: OK
`,
    });

    const config = await loadConfig(root);
    const manifest = await buildManifest(root, config);
    const diagnostics = validateManifest(manifest);

    expect(diagnostics).toContain("OpenAPI spec core references missing version: v3");
  });

  it("reports missing default locale content when i18n is configured", async () => {
    const root = await createProject({
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs" },
        i18n: {
          defaultLocale: "en",
          locales: [
            { code: "en", label: "English" },
            { code: "fr", label: "Français" },
          ],
        },
        navigation: [],
        openapi: { specs: [] },
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: {
        "docs/fr/index.mdx": "---\ntitle: Accueil\n---\n# Accueil\n",
      },
    });

    const config = await loadConfig(root);
    const manifest = await buildManifest(root, config);
    const diagnostics = validateManifest(manifest);

    expect(diagnostics).toContain("Missing default locale content for i18n.defaultLocale: en");
  });
});

async function createProject(input: {
  config: unknown;
  pages: Record<string, string>;
  openapi?: string;
}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "documentee-validation-"));
  await writeFile(join(root, "documentee.config.ts"), `export default ${JSON.stringify(input.config, null, 2)};\n`);

  for (const [path, content] of Object.entries(input.pages)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), content);
  }

  if (input.openapi) {
    await mkdir(join(root, "api"), { recursive: true });
    await writeFile(join(root, "api", "openapi.yaml"), input.openapi);
  }

  return root;
}
