import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defineConfig, loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("accepts authored config with schema-defaulted fields omitted", () => {
    const config = defineConfig({
      site: { name: "Acme Docs" },
      content: { directory: "docs" },
      versions: [{ id: "v1", content: { directory: "docs/v1" } }],
    });

    expect(config.site.name).toBe("Acme Docs");
    expect(config.content.directory).toBe("docs");
  });

  it("loads docs.json and normalizes defaults", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        navigation: [{ group: "Get Started", pages: ["docs/get-started/quickstart"] }],
        openapi: { specs: [{ id: "core", source: "./api/openapi.yaml", routeBase: "/api-reference" }] },
      }),
    );

    const config = await loadConfig(root);

    expect(config.site.name).toBe("Acme Docs");
    expect(config.content.directory).toBe("docs");
    expect(config.content.exclude).toEqual([]);
    expect(config.openapi.specs[0].id).toBe("core");
    expect(config.openapi.specs[0].playground).toEqual({
      enabled: false,
      auth: "none",
      apiKeyLocation: "header",
    });
    expect(config.seo).toEqual({
      sitemap: true,
      robots: {
        enabled: true,
        rules: [{ userAgent: "*", allow: "/" }],
      },
      twitterCard: "summary_large_image",
    });
    expect(config.redirects).toEqual([]);
    expect(config.search.provider).toBe("none");
    expect(config.layout).toEqual({
      nav: "sidebar",
      toc: "right",
      footer: true,
      breadcrumbs: true,
    });
  });

  it("loads docs.json layout settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        layout: {
          nav: "hybrid",
          toc: "inline",
          footer: false,
          breadcrumbs: false,
          editUrl: "https://github.com/acme/docs/edit/main",
          announcement: "v1.0 is available",
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.layout).toEqual({
      nav: "hybrid",
      toc: "inline",
      footer: false,
      breadcrumbs: false,
      editUrl: "https://github.com/acme/docs/edit/main",
      announcement: "v1.0 is available",
    });
  });

  it("loads opt-in assistant settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        assistant: {
          enabled: true,
          endpoint: "/api/docs-assistant",
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.assistant).toEqual({
      enabled: true,
      endpoint: "/api/docs-assistant",
    });
  });

  it("loads opt-in feedback settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        feedback: {
          enabled: true,
          endpoint: "https://example.com/docs-feedback",
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.feedback).toEqual({
      enabled: true,
      endpoint: "https://example.com/docs-feedback",
    });
  });

  it("loads custom analytics settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        analytics: {
          provider: "custom",
          scriptSrc: "https://analytics.example.com/script.js",
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.analytics).toEqual({
      provider: "custom",
      scriptSrc: "https://analytics.example.com/script.js",
    });
  });

  it("loads i18n locales with defaults", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        i18n: {
          defaultLocale: "en",
          locales: [
            { code: "en", label: "English" },
            { code: "fr", label: "Français" },
            { code: "ar", label: "العربية", dir: "rtl" },
          ],
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.i18n).toEqual({
      defaultLocale: "en",
      prefixDefaultLocale: false,
      locales: [
        { code: "en", label: "English", dir: "ltr" },
        { code: "fr", label: "Français", dir: "ltr" },
        { code: "ar", label: "العربية", dir: "rtl" },
      ],
    });
  });

  it("rejects i18n configs when the default locale is missing from locales", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        i18n: {
          defaultLocale: "en",
          locales: [{ code: "fr", label: "Français" }],
        },
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow(/defaultLocale|locales|i18n/i);
  });

  it("rejects unsafe assistant endpoints", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        assistant: {
          enabled: true,
          endpoint: "javascript:alert(1)",
        },
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow(/assistant|endpoint|http|path/i);
  });

  it("rejects unsafe feedback endpoints", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        feedback: {
          enabled: true,
          endpoint: "javascript:alert(1)",
        },
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow(/feedback|endpoint|http|path/i);
  });

  it("rejects unsafe analytics script URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        analytics: {
          provider: "custom",
          scriptSrc: "javascript:alert(1)",
        },
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow(/analytics|scriptSrc|http|path/i);
  });

  it("rejects unsupported docs.json layout nav values", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        layout: { nav: "rail" },
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow(/sidebar|topbar|hybrid|Invalid enum value/);
  });

  it("rejects unsupported docs.json layout toc values", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        layout: { toc: "floating" },
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow(/right|inline|hidden|Invalid enum value/);
  });

  it("rejects non-http layout edit URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        layout: { editUrl: "javascript:alert(1)" },
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow(/http|https|editUrl/i);
  });

  it("rejects malformed layout edit URLs as config validation errors", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        layout: { editUrl: "not a url" },
      }),
    );

    await expect(loadConfig(root)).rejects.toMatchObject({ name: "ZodError" });
    await expect(loadConfig(root)).rejects.toThrow(/editUrl|url/i);
  });

  it("loads SEO and redirect settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        url: "https://docs.acme.test",
        seo: {
          titleTemplate: "%s | Acme",
          image: "/og.png",
          twitterCard: "summary",
          sitemap: false,
          robots: {
            enabled: true,
            rules: [{ userAgent: "*", disallow: "/internal" }],
          },
        },
        redirects: [{ from: "/old", to: "/new", status: 308 }],
      }),
    );

    const config = await loadConfig(root);

    expect(config.site.url).toBe("https://docs.acme.test");
    expect(config.seo).toEqual({
      titleTemplate: "%s | Acme",
      image: "/og.png",
      twitterCard: "summary",
      sitemap: false,
      robots: {
        enabled: true,
        rules: [{ userAgent: "*", disallow: "/internal" }],
      },
    });
    expect(config.redirects).toEqual([{ from: "/old", to: "/new", status: 308 }]);
  });

  it("loads OpenAPI playground settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        openapi: {
          specs: [
            {
              id: "core",
              source: "./api/openapi.yaml",
              routeBase: "/api-reference",
              playground: {
                enabled: true,
                baseUrl: "https://api.acme.test",
                auth: "apiKey",
                apiKeyName: "x-api-key",
                apiKeyLocation: "header",
                environments: [
                  { name: "Production", baseUrl: "https://api.acme.test" },
                  { name: "Sandbox", baseUrl: "https://sandbox.acme.test" },
                ],
              },
            },
          ],
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.openapi.specs[0].playground).toEqual({
      enabled: true,
      baseUrl: "https://api.acme.test",
      auth: "apiKey",
      apiKeyName: "x-api-key",
      apiKeyLocation: "header",
      environments: [
        { name: "Production", baseUrl: "https://api.acme.test" },
        { name: "Sandbox", baseUrl: "https://sandbox.acme.test" },
      ],
    });
  });

  it("loads deeper theme customization settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        theme: {
          primaryColor: "#2563eb",
          accentColor: "#0f766e",
          backgroundColor: "#ffffff",
          textColor: "#18181b",
          mutedTextColor: "#52525b",
          borderColor: "#d4d4d8",
          codeBackgroundColor: "#f4f4f5",
          fontFamily: "Inter",
          codeFontFamily: "ui-monospace",
          radius: "10px",
          navWidth: "300px",
          contentWidth: "1040px",
          densitySpace: "10px",
          methodGetColor: "#22c55e",
          customCss: ".custom { color: red; }",
          darkMode: false,
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.theme).toMatchObject({
      primaryColor: "#2563eb",
      accentColor: "#0f766e",
      backgroundColor: "#ffffff",
      textColor: "#18181b",
      mutedTextColor: "#52525b",
      borderColor: "#d4d4d8",
      codeBackgroundColor: "#f4f4f5",
      fontFamily: "Inter",
      codeFontFamily: "ui-monospace",
      radius: "10px",
      navWidth: "300px",
      contentWidth: "1040px",
      densitySpace: "10px",
      methodGetColor: "#22c55e",
      customCss: ".custom { color: red; }",
      darkMode: false,
    });
  });

  it.each([
    "neutral",
    "mint",
    "slate",
    "highContrast",
    "classic",
    "terminal",
    "startup",
    "enterprise",
    "api",
    "minimal",
  ])("loads %s theme preset", async (preset) => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        theme: {
          preset,
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.theme.preset).toBe(preset);
  });

  it.each([
    "minimal-technical",
    "modern-glass",
    "api-ide",
    "enterprise-knowledge",
    "premium-editorial",
    "sci-fi-console",
    "api-observatory",
    "knowledge-graph",
  ])("loads %s design system", async (designSystem) => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        theme: {
          designSystem,
          overrides: {
            primaryColor: "#db2777",
            navWidth: "340px",
          },
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.theme.designSystem).toBe(designSystem);
    expect(config.theme.overrides).toMatchObject({
      primaryColor: "#db2777",
      navWidth: "340px",
    });
  });

  it("rejects unknown design systems", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        theme: {
          designSystem: "ocean-lab",
        },
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow("Invalid enum value");
  });

  it("rejects unknown theme presets", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        theme: {
          preset: "ocean",
        },
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow("Invalid enum value");
  });

  it("maps docs.json colors.primary into theme primaryColor", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        colors: { primary: "#14b8a6" },
      }),
    );

    const config = await loadConfig(root);

    expect(config.theme.primaryColor).toBe("#14b8a6");
    expect(config.theme.darkMode).toBe(true);
  });

  it("loads versioned docs and OpenAPI spec version ownership", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        versions: [
          { id: "v1", content: { directory: "docs/v1", exclude: ["internal/**"] } },
          { id: "v2", label: "Version 2", routePrefix: "/v2", content: { directory: "docs/v2" }, default: true, latest: true },
          { id: "v0", label: "Legacy", routePrefix: "/legacy", content: { directory: "docs/v0" }, deprecated: true },
        ],
        openapi: {
          specs: [{ id: "core-v2", source: "./api/core-v2.yaml", version: "v2" }],
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.versions).toEqual([
      {
        id: "v1",
        label: "v1",
        routePrefix: "/v1",
        content: { directory: "docs/v1", exclude: ["internal/**"] },
        default: false,
        latest: false,
        deprecated: false,
      },
      {
        id: "v2",
        label: "Version 2",
        routePrefix: "/v2",
        content: { directory: "docs/v2", exclude: [] },
        default: true,
        latest: true,
        deprecated: false,
      },
      {
        id: "v0",
        label: "Legacy",
        routePrefix: "/legacy",
        content: { directory: "docs/v0", exclude: [] },
        default: false,
        latest: false,
        deprecated: true,
      },
    ]);
    expect(config.openapi.specs[0].version).toBe("v2");
  });

  it("rejects duplicate OpenAPI spec ids", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        openapi: {
          specs: [
            { id: "core", source: "./api/a.yaml", routeBase: "/a" },
            { id: "core", source: "./api/b.yaml", routeBase: "/b" }
          ]
        }
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow("Duplicate OpenAPI spec id: core");
  });

  it("rejects duplicate version ids", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        versions: [
          { id: "v1", content: { directory: "docs/v1" } },
          { id: "v1", content: { directory: "docs/v1-copy" } },
        ],
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow("Duplicate version id: v1");
  });

  it("rejects duplicate version route prefixes", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        versions: [
          { id: "v1", routePrefix: "/archive", content: { directory: "docs/v1" } },
          { id: "v2", routePrefix: "/archive", content: { directory: "docs/v2" } },
        ],
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow("Duplicate version route prefix: /archive");
  });

  it("rejects multiple default versions", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        versions: [
          { id: "v1", content: { directory: "docs/v1" }, default: true },
          { id: "v2", content: { directory: "docs/v2" }, default: true },
        ],
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow("Only one version can be marked as default");
  });

  it("rejects multiple latest versions", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        versions: [
          { id: "v1", content: { directory: "docs/v1" }, latest: true },
          { id: "v2", content: { directory: "docs/v2" }, latest: true },
        ],
      }),
    );

    await expect(loadConfig(root)).rejects.toThrow("Only one version can be marked as latest");
  });

  it("loads optional TypeScript plugins", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "documentee.config.ts"),
      `
        export default {
          site: { name: "Acme Docs" },
          plugins: [
            {
              name: "html-marker",
              transformHtml(html) {
                return html;
              }
            }
          ]
        };
      `,
    );

    const config = await loadConfig(root);

    expect(config.plugins?.[0]?.name).toBe("html-marker");
  });

  it("rejects plugins without a name", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "documentee.config.ts"),
      `
        export default {
          site: { name: "Acme Docs" },
          plugins: [{ transformHtml(html) { return html; } }]
        };
      `,
    );

    await expect(loadConfig(root)).rejects.toThrow("plugins entries must include a name");
  });
});
