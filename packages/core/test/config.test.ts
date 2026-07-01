import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
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
      customCss: ".custom { color: red; }",
      darkMode: false,
    });
  });

  it("loads named theme presets", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-config-"));
    await writeFile(
      join(root, "docs.json"),
      JSON.stringify({
        name: "Acme Docs",
        theme: {
          preset: "mint",
        },
      }),
    );

    const config = await loadConfig(root);

    expect(config.theme.preset).toBe("mint");
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
          { id: "v1", content: { directory: "docs/v1" } },
          { id: "v2", label: "Version 2", routePrefix: "/v2", content: { directory: "docs/v2" }, default: true },
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
        content: { directory: "docs/v1" },
        default: false,
      },
      {
        id: "v2",
        label: "Version 2",
        routePrefix: "/v2",
        content: { directory: "docs/v2" },
        default: true,
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
});
