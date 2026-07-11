import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SiteManifest } from "../src/manifest.js";
import { assertHtmlBudget, renderRoute, renderStaticSite } from "../src/static-renderer.js";

const defaultSeo = {
  sitemap: true,
  robots: { enabled: true, rules: [{ userAgent: "*", allow: "/" }] },
  twitterCard: "summary_large_image" as const,
};

const themePresetExpectations = [
  {
    preset: "neutral",
    light: { primary: "#18181b", accent: "#52525b", background: "#ffffff", code: "#f4f4f5" },
    dark: { background: "#111113", text: "#f4f4f5", border: "#3f3f46", code: "#18181b" },
  },
  {
    preset: "mint",
    light: { primary: "#0f766e", accent: "#14b8a6", background: "#f8fffc", code: "#ecfdf5" },
    dark: { background: "#061f1a", text: "#eafff8", border: "#1f4d43", code: "#082f29" },
  },
  {
    preset: "slate",
    light: { primary: "#334155", accent: "#2563eb", background: "#f8fafc", code: "#f1f5f9" },
    dark: { background: "#0f172a", text: "#f8fafc", border: "#334155", code: "#111827" },
  },
  {
    preset: "highContrast",
    light: { primary: "#000000", accent: "#1d4ed8", background: "#ffffff", code: "#f3f4f6" },
    dark: { background: "#000000", text: "#ffffff", border: "#ffffff", code: "#111111" },
  },
  {
    preset: "classic",
    light: { primary: "#7f1d1d", accent: "#1f4f46", background: "#fffdfa", code: "#f6f0e8" },
    dark: { background: "#211916", text: "#fff7ed", border: "#6b5046", code: "#2b211d" },
  },
  {
    preset: "terminal",
    light: { primary: "#047857", accent: "#ca8a04", background: "#fbfdf8", code: "#eef8ee" },
    dark: { background: "#050806", text: "#d1fae5", border: "#14532d", code: "#07120b" },
  },
  {
    preset: "startup",
    light: { primary: "#e11d48", accent: "#2563eb", background: "#fff8f7", code: "#fff1f2" },
    dark: { background: "#1f1020", text: "#fff1f5", border: "#5b2744", code: "#2a1429" },
  },
  {
    preset: "enterprise",
    light: { primary: "#1d4ed8", accent: "#0f766e", background: "#f7fbff", code: "#edf4ff" },
    dark: { background: "#081424", text: "#eff6ff", border: "#29415f", code: "#0c1b2e" },
  },
  {
    preset: "api",
    light: { primary: "#0e7490", accent: "#7c3aed", background: "#f7fdff", code: "#ecfeff" },
    dark: { background: "#061923", text: "#ecfeff", border: "#164e63", code: "#082532" },
  },
  {
    preset: "minimal",
    light: { primary: "#111827", accent: "#6b7280", background: "#ffffff", code: "#f9fafb" },
    dark: { background: "#0a0a0a", text: "#fafafa", border: "#2a2a2a", code: "#141414" },
  },
] as const;

describe("static renderer", () => {
  it("writes index.html files for routes", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "documentee-render-"));
    await mkdir(outDir, { recursive: true });
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "Welcome",
          html: "<h1>Home</h1>",
          markdown: "# Home",
        },
      ],
    };

    await renderStaticSite(manifest, { outDir });

    const html = await readFile(join(outDir, "index.html"), "utf8");
    expect(html).toContain("<h1>Home</h1>");
    expect(html).toContain("Acme");
  });

  it("renders SEO metadata in HTML pages", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", url: "https://docs.acme.test", description: "Docs" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: {
          titleTemplate: "%s | Acme",
          image: "/og.png",
          twitterCard: "summary_large_image",
          sitemap: true,
          robots: { enabled: true, rules: [{ userAgent: "*", allow: "/" }] },
        },
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/quickstart",
          title: "Quickstart",
          description: "Start quickly.",
          seo: { robots: "noindex", image: "/quickstart.png" },
          html: "<h1>Quickstart</h1>",
          markdown: "# Quickstart",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("<title>Quickstart | Acme</title>");
    expect(html).toContain('<link rel="canonical" href="https://docs.acme.test/quickstart/">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<meta property="og:image" content="https://docs.acme.test/quickstart.png">');
  });

  it("renders configured theme tokens as CSS variables and custom CSS", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
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
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("--doc-primary: #2563eb;");
    expect(html).toContain("--doc-accent: #0f766e;");
    expect(html).toContain("--doc-nav-width: 300px;");
    expect(html).toContain("font-family: var(--doc-font-family)");
    expect(html).toContain(".custom { color: red; }");
  });

  it("renders assistant UI and script only when assistant config is enabled", () => {
    const route = {
      kind: "page" as const,
      route: "/quickstart",
      title: "Quickstart",
      description: "Start fast.",
      html: "<h1>Quickstart</h1>",
      markdown: "# Quickstart",
    };
    const baseManifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [route],
    };

    const disabledHtml = renderRoute(baseManifest, route);
    expect(disabledHtml).not.toContain("data-documentee-assistant");
    expect(disabledHtml).not.toContain("doc-assistant");

    const html = renderRoute(
      {
        ...baseManifest,
        config: {
          ...baseManifest.config,
          assistant: { enabled: true, endpoint: "/api/docs-assistant" },
        },
      },
      route,
    );

    expect(html).toContain('class="doc-assistant"');
    expect(html).toContain('data-documentee-assistant');
    expect(html).toContain('data-assistant-endpoint="/api/docs-assistant"');
    expect(html).toContain('data-assistant-route="/quickstart"');
    expect(html).toContain('script data-documentee-assistant');
    expect(html).toContain("fetch(endpoint");
  });

  it("renders feedback UI and script only when feedback config is enabled", () => {
    const route = {
      kind: "page" as const,
      route: "/quickstart",
      title: "Quickstart",
      description: "Start fast.",
      html: "<h1>Quickstart</h1>",
      markdown: "# Quickstart",
    };
    const baseManifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [route],
    };

    const disabledHtml = renderRoute(baseManifest, route);
    expect(disabledHtml).not.toContain("data-documentee-feedback");
    expect(disabledHtml).not.toContain("doc-feedback");

    const html = renderRoute(
      {
        ...baseManifest,
        config: {
          ...baseManifest.config,
          feedback: { enabled: true, endpoint: "https://example.com/docs-feedback" },
        },
      },
      route,
    );

    expect(html).toContain('class="doc-feedback"');
    expect(html).toContain('data-documentee-feedback');
    expect(html).toContain('data-feedback-endpoint="https://example.com/docs-feedback"');
    expect(html).toContain('data-feedback-route="/quickstart"');
    expect(html).toContain('data-feedback-title="Quickstart"');
    expect(html).toContain('name="comment"');
    expect(html).toContain('value="helpful"');
    expect(html).toContain('value="not_helpful"');
    expect(html).toContain('script data-documentee-feedback');
    expect(html).toContain("fetch(endpoint");
    expect(html).toContain("vote");
    expect(html).toContain("comment");
  });

  it("renders analytics script only when analytics config is set", () => {
    const route = {
      kind: "page" as const,
      route: "/quickstart",
      title: "Quickstart",
      description: "Start fast.",
      html: "<h1>Quickstart</h1>",
      markdown: "# Quickstart",
    };
    const baseManifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [route],
    };

    const disabledHtml = renderRoute(baseManifest, route);
    expect(disabledHtml).not.toContain("data-documentee-analytics");
    expect(disabledHtml).not.toContain("analytics.example.com");

    const html = renderRoute(
      {
        ...baseManifest,
        config: {
          ...baseManifest.config,
          analytics: { provider: "custom", scriptSrc: "https://analytics.example.com/script.js" },
        },
      },
      route,
    );

    expect(html).toContain('<script data-documentee-analytics src="https://analytics.example.com/script.js" defer></script>');
  });

  it("renders html lang, dir, and locale switcher for localized routes", () => {
    const route = {
      kind: "page" as const,
      route: "/ar",
      title: "الرئيسية",
      description: "",
      html: "<h1>الرئيسية</h1>",
      markdown: "# الرئيسية",
      sourceRelativePath: "index.mdx",
      locale: { code: "ar", label: "العربية", dir: "rtl" as const, default: false, routePrefix: "/ar" },
    };
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        i18n: {
          defaultLocale: "en",
          prefixDefaultLocale: false,
          locales: [
            { code: "en", label: "English", dir: "ltr" },
            { code: "ar", label: "العربية", dir: "rtl" },
          ],
        },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      locales: [
        { code: "en", label: "English", dir: "ltr", default: true, routePrefix: "/" },
        { code: "ar", label: "العربية", dir: "rtl", default: false, routePrefix: "/ar" },
      ],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "# Home",
          sourceRelativePath: "index.mdx",
          locale: { code: "en", label: "English", dir: "ltr", default: true, routePrefix: "/" },
        },
        route,
      ],
    };

    const html = renderRoute(manifest, route);

    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('class="locale-switcher"');
    expect(html).toContain('<a href="/">English</a>');
    expect(html).toContain('<a class="is-active" href="/ar/">العربية</a>');
  });

  it.each(themePresetExpectations)("renders $preset theme preset tokens as CSS variables", ({ preset, light, dark }) => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: {
          preset,
          darkMode: true,
        },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain(`--doc-primary: ${light.primary};`);
    expect(html).toContain(`--doc-accent: ${light.accent};`);
    expect(html).toContain(`--doc-background: ${light.background};`);
    expect(html).toContain(`--doc-code-background: ${light.code};`);
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toMatch(new RegExp(`@media \\(prefers-color-scheme: dark\\) \\{[\\s\\S]*--doc-background: ${dark.background};`));
    expect(html).toMatch(new RegExp(`@media \\(prefers-color-scheme: dark\\) \\{[\\s\\S]*--doc-text: ${dark.text};`));
    expect(html).toMatch(new RegExp(`@media \\(prefers-color-scheme: dark\\) \\{[\\s\\S]*--doc-border: ${dark.border};`));
    expect(html).toMatch(new RegExp(`@media \\(prefers-color-scheme: dark\\) \\{[\\s\\S]*--doc-code-background: ${dark.code};`));
  });

  it("lets custom theme tokens override preset tokens", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: {
          preset: "slate",
          primaryColor: "#db2777",
          navWidth: "320px",
          darkMode: false,
        },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("--doc-primary: #db2777;");
    expect(html).toContain("--doc-accent: #2563eb;");
    expect(html).toContain("--doc-nav-width: 320px;");
    expect(html).toContain(":root { color-scheme: light;");
  });

  it("renders a polished static shell with route-aware navigation and search entry", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [
          { group: "Guides", pages: ["docs/index", "docs/get-started/quickstart"] },
        ],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "pagefind" },
        theme: { darkMode: true },
        layout: {
          nav: "sidebar",
          toc: "right",
          footer: true,
          breadcrumbs: true,
          editUrl: "https://github.com/acme/docs/edit/main",
          announcement: "New static shell available.",
        },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
        {
          kind: "page",
          route: "/get-started/quickstart",
          title: "Quickstart",
          description: "",
          html: "<h1>Quickstart</h1>",
          markdown: "",
          sourcePath: "/repo/docs/get-started/quickstart.mdx",
          sourceRelativePath: "get-started/quickstart.mdx",
          sourceProjectPath: "docs/get-started/quickstart.mdx",
          lastUpdated: "2026-07-05T10:20:30.000Z",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[1]);

    expect(html).toContain('class="doc-shell doc-app-shell"');
    expect(html).toContain('class="doc-sidebar"');
    expect(html).toContain('class="doc-content-frame"');
    expect(html).toContain('class="doc-footer"');
    expect(html).toContain('class="doc-announcement"');
    expect(html).toContain("New static shell available.");
    expect(html).toContain('class="doc-edit-link" href="https://github.com/acme/docs/edit/main/docs/get-started/quickstart.mdx"');
    expect(html).toContain("Last updated: July 5, 2026");
    expect(html).toContain('class="doc-mobile-header"');
    expect(html).toContain('class="doc-mobile-menu"');
    expect(html).toContain('aria-label="Mobile navigation"');
    expect(html).toContain('class="doc-topbar"');
    expect(html).toContain('class="doc-search-link" href="/search/"');
    expect(html).toContain('class="nav-link is-active" href="/get-started/quickstart/"');
    expect(html).toContain(".doc-content h1");
    expect(html).toContain("@media (max-width: 820px)");
    expect(html).toContain(".doc-mobile-header {");
    expect(html).not.toContain("pagefind-ui.js");
  });

  it("does not render edit or last-updated metadata for generated routes without source metadata", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: {
          nav: "sidebar",
          toc: "right",
          footer: true,
          breadcrumbs: true,
          editUrl: "https://github.com/acme/docs/edit/main",
        },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "api-portal",
          route: "/api-reference",
          title: "API Reference",
          description: "Generated API portal.",
          html: "",
          markdown: "",
          apiPortal: { route: "/api-reference", title: "API Reference", specs: [] },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain('class="doc-footer"');
    expect(html).not.toContain("doc-edit-link");
    expect(html).not.toContain("Last updated: Not provided");
  });

  it("respects layout flags for breadcrumbs, TOC, and footer", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [
          { group: "Guides", pages: ["docs/index", "docs/reference"] },
        ],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "hidden", footer: false, breadcrumbs: false },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
        {
          kind: "page",
          route: "/reference",
          title: "Reference",
          description: "",
          html: "<h1>Reference</h1><h2>Options</h2><p>Reference docs.</p>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[1]);

    expect(html).toContain('class="doc-topbar"');
    expect(html).not.toContain('class="doc-breadcrumbs"');
    expect(html).not.toContain('class="doc-on-this-page"');
    expect(html).not.toContain('class="doc-page-toc"');
    expect(html).not.toContain('class="doc-footer"');
    expect(html).not.toContain('class="doc-page-nav"');
  });

  it("renders inline TOC without the right-side page TOC", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "inline", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/reference",
          title: "Reference",
          description: "",
          html: "<h1>Reference</h1><h2>Options</h2><h3>Theme</h3>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain('class="doc-on-this-page doc-on-this-page-inline"');
    expect(html).toContain('href="#options"');
    expect(html).not.toContain('class="doc-page-toc"');
    expect(html).toContain(".doc-on-this-page-inline { display: block;");
  });

  it("adds heading anchors and on-this-page navigation for long page content", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/configuration",
          title: "Configuration",
          description: "",
          html: "<h1>Configuration</h1><h2>Theme</h2><p>Theme docs.</p><h2>OpenAPI Specs</h2><h3>Playground</h3>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain('<h2 id="theme">');
    expect(html).toContain('href="#theme"');
    expect(html).toContain('aria-label="Link to Theme"');
    expect(html).toContain('<h2 id="openapi-specs">');
    expect(html).toContain('<h3 id="playground">');
    expect(html).toContain('class="doc-on-this-page"');
    expect(html).toContain('aria-label="On this page"');
    expect(html).toContain('class="doc-page-toc"');
    expect(html).toContain('href="#openapi-specs"');
    expect(html).toContain(".doc-content :where(h2, h3) {");
  });

  it("does not add heading anchors or TOC entries for linked card headings", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: '<h1>Home</h1><a class="doc-card" href="/quickstart/"><div><h3>Quickstart</h3><p>Start here.</p></div></a><h2>Overview</h2><p>Welcome.</p>',
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);
    const tocHtml = html.match(/<nav class="doc-page-toc" aria-label="On this page">[\s\S]*?<\/nav>/)?.[0] ?? "";

    expect(html).toContain('<a class="doc-card" href="/quickstart/"><div><h3>Quickstart</h3><p>Start here.</p></div></a>');
    expect(html).not.toContain('<h3 id="quickstart">');
    expect(html).toContain('<h2 id="overview"><a class="doc-heading-anchor" href="#overview" aria-label="Link to Overview">#</a>Overview</h2>');
    expect(tocHtml).toContain('href="#overview"');
    expect(tocHtml).toContain(">Overview</a>");
    expect(tocHtml).not.toContain("Quickstart");
  });

  it("adds anchors to normal headings after cards with void elements", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: '<h1>Home</h1><a class="doc-card" href="/quickstart/"><img src="/icon.png"><h3>Quickstart</h3></a><h2>Overview</h2>',
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);
    const tocHtml = html.match(/<nav class="doc-page-toc" aria-label="On this page">[\s\S]*?<\/nav>/)?.[0] ?? "";

    expect(html).toContain('<a class="doc-card" href="/quickstart/"><img src="/icon.png"><h3>Quickstart</h3></a>');
    expect(html).toContain('<h2 id="overview"><a class="doc-heading-anchor" href="#overview" aria-label="Link to Overview">#</a>Overview</h2>');
    expect(tocHtml).toContain('href="#overview"');
    expect(tocHtml).toContain(">Overview</a>");
    expect(tocHtml).not.toContain("Quickstart");
  });

  it("adds copy actions for rendered code blocks only when code exists", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/quickstart",
          title: "Quickstart",
          description: "",
          html: '<h1>Quickstart</h1><pre><code class="language-sh">pnpm add documentee</code></pre>',
          markdown: "",
        },
        {
          kind: "page",
          route: "/plain",
          title: "Plain",
          description: "",
          html: "<h1>Plain</h1><p>No code here.</p>",
          markdown: "",
        },
      ],
    };

    const codeHtml = renderRoute(manifest, manifest.routes[0]);
    const plainHtml = renderRoute(manifest, manifest.routes[1]);

    expect(codeHtml).toContain('class="doc-code-copy"');
    expect(codeHtml).toContain('button type="button" class="doc-copy-button" data-copy-code');
    expect(codeHtml).toContain('data-documentee-copy');
    expect(codeHtml).toContain('navigator.clipboard.writeText');
    expect(plainHtml).not.toContain('data-documentee-copy');
  });

  it("renders breadcrumbs and previous-next navigation from configured navigation", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [
          { group: "Start", pages: ["docs/index", "docs/get-started/quickstart", "docs/configuration"] },
          { group: "Reference", pages: ["docs/api-reference/config"] },
        ],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        { kind: "page", route: "/", title: "Home", description: "", html: "<h1>Home</h1>", markdown: "" },
        { kind: "page", route: "/get-started/quickstart", title: "Quickstart", description: "", html: "<h1>Quickstart</h1>", markdown: "" },
        { kind: "page", route: "/configuration", title: "Configuration", description: "", html: "<h1>Configuration</h1>", markdown: "" },
        { kind: "page", route: "/api-reference/config", title: "Config Reference", description: "", html: "<h1>Config Reference</h1>", markdown: "" },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[1]);

    expect(html).toContain('class="doc-breadcrumbs"');
    expect(html).toContain('href="/">Home</a>');
    expect(html).toContain("<span>Start</span>");
    expect(html).toContain("<span>Quickstart</span>");
    expect(html).toContain('class="doc-page-nav"');
    expect(html).toContain('class="doc-page-nav-prev" href="/"');
    expect(html).toContain('class="doc-page-nav-next" href="/configuration/"');
  });

  it("deduplicates generated heading ids", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/reference",
          title: "Reference",
          description: "",
          html: "<h1>Reference</h1><h2>Parameters</h2><h2>Parameters</h2>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain('<h2 id="parameters">');
    expect(html).toContain('<h2 id="parameters-2">');
    expect(html).toContain('href="#parameters-2"');
  });

  it("writes sitemap, robots, and redirect artifacts", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "documentee-seo-"));
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", url: "https://docs.acme.test", description: "Docs" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: {
          twitterCard: "summary_large_image",
          sitemap: true,
          robots: { enabled: true, rules: [{ userAgent: "*", allow: "/" }] },
        },
        redirects: [{ from: "/old", to: "/quickstart", status: 301 }],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/quickstart",
          title: "Quickstart",
          description: "Start quickly.",
          seo: {},
          html: "<h1>Quickstart</h1>",
          markdown: "# Quickstart",
        },
      ],
    };

    await renderStaticSite(manifest, { outDir });

    expect(await readFile(join(outDir, "sitemap.xml"), "utf8")).toContain("https://docs.acme.test/quickstart/");
    expect(await readFile(join(outDir, "robots.txt"), "utf8")).toContain("Sitemap: https://docs.acme.test/sitemap.xml");
    expect(await readFile(join(outDir, "_redirects"), "utf8")).toBe("/old /quickstart 301\n");
    expect(await readFile(join(outDir, "vercel.json"), "utf8")).toContain('"source": "/old"');
    expect(await readFile(join(outDir, "old", "index.html"), "utf8")).toContain("Redirecting");
  });

  it("fails when HTML exceeds the route budget", () => {
    expect(() => assertHtmlBudget("<p>too large</p>", 3, "/large")).toThrow(
      "/large HTML payload",
    );
  });

  it("renders compact API operation details without schema internals", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "api-operation",
          route: "/api-reference/update-message",
          title: "PATCH /messages/{id}",
          description: "Update a message",
          html: "",
          markdown: "Update a message",
          operation: {
            specId: "core",
            method: "PATCH",
            path: "/messages/{id}",
            slug: "update-message",
            route: "/api-reference/update-message",
            summary: "Update a message",
            tags: ["Messages"],
            deprecated: false,
            beta: true,
            auth: ["bearerAuth"],
            parameters: [{ name: "id", location: "path", required: true }],
            requestBody: { required: false, mediaTypes: ["application/json"], schemaRefs: ["UpdateMessageRequest"] },
            responses: [{ status: "200", description: "Updated", mediaTypes: ["application/json"], schemaRefs: ["Message"] }],
            codeSamples: [{ lang: "curl", source: "curl https://api.acme.test/messages/id" }],
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("Authentication");
    expect(html).toContain("bearerAuth");
    expect(html).toContain("Parameters");
    expect(html).toContain("Request Body");
    expect(html).toContain("Responses");
    expect(html).toContain("UpdateMessageRequest");
    expect(html).toContain('href="/schemas/core/Message/"');
    expect(html).toContain("Beta");
    expect(html).toContain("Code Samples");
    expect(html).toContain("curl https://api.acme.test/messages/id");
    expect(html).not.toContain("properties");
  });

  it("renders rich API schema explorers for request and response payloads", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "api-operation",
          route: "/api-reference/create-message",
          title: "POST /messages",
          description: "Create a message",
          html: "",
          markdown: "Create a message",
          operation: {
            specId: "core",
            method: "POST",
            path: "/messages",
            slug: "create-message",
            route: "/api-reference/create-message",
            summary: "Create a message",
            tags: ["Messages"],
            deprecated: false,
            beta: false,
            auth: [],
            parameters: [],
            requestBody: {
              required: true,
              mediaTypes: ["application/json"],
              schemaRefs: ["CreateMessageRequest"],
              examples: [{ name: "queued", summary: "Queued message", value: '{\n  "status": "queued"\n}' }],
              fields: [
                {
                  name: "status",
                  required: true,
                  description: "Current message status.",
                  schemaType: "string",
                  enumValues: ["queued", "sent", "failed"],
                  defaultValue: "queued",
                },
                {
                  name: "profile",
                  required: true,
                  description: "Sender profile.",
                  schemaType: "object",
                  fields: [
                    { name: "displayName", required: true, schemaType: "string", exampleValue: "Ada" },
                    { name: "timezone", required: false, schemaType: "string", nullable: true },
                  ],
                },
                {
                  name: "attachments",
                  required: false,
                  schemaType: "array",
                  items: { schemaRef: "Attachment", schemaType: "object" },
                },
                {
                  name: "target",
                  required: true,
                  schemaType: "oneOf",
                  oneOf: [
                    { schemaRef: "UserTarget", schemaType: "object" },
                    { schemaRef: "ChannelTarget", schemaType: "object" },
                  ],
                },
                {
                  name: "legacyId",
                  required: false,
                  schemaType: "string",
                  nullable: true,
                  deprecated: true,
                },
              ],
            },
            responses: [
              {
                status: "201",
                description: "Created",
                mediaTypes: ["application/json"],
                schemaRefs: ["Message"],
                examples: [{ value: '{\n  "id": "msg_123"\n}' }],
                fields: [
                  {
                    name: "Message",
                    required: false,
                    schemaRef: "Message",
                    schemaType: "allOf",
                    allOf: [
                      { schemaRef: "MessageBase", schemaType: "object" },
                      { schemaType: "object", fields: [{ name: "status", required: false, schemaType: "string", enumValues: ["queued"] }] },
                    ],
                  },
                ],
              },
            ],
            codeSamples: [],
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain('<details class="api-schema-field" open>');
    expect(html).toContain("<code>profile</code>");
    expect(html).toContain("Sender profile.");
    expect(html).toContain("Current message status.");
    expect(html).toContain("default: queued");
    expect(html).toContain("nullable");
    expect(html).toContain("deprecated");
    expect(html).toContain("example: Ada");
    expect(html).toContain("Array items");
    expect(html).toContain('href="/schemas/core/Attachment/"');
    expect(html).toContain("One of");
    expect(html).toContain("All of");
    expect(html).toContain("Queued message");
    expect(html).toContain("&quot;status&quot;: &quot;queued&quot;");
    expect(html).toContain("&quot;id&quot;: &quot;msg_123&quot;");
    expect(html).not.toContain("properties");
  });

  it("renders generated static API code samples with auth and request body", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "api-operation",
          route: "/api-reference/create-message",
          title: "POST /messages",
          description: "Create a message",
          html: "",
          markdown: "Create a message",
          operation: {
            specId: "core",
            method: "POST",
            path: "/messages",
            slug: "create-message",
            route: "/api-reference/create-message",
            summary: "Create a message",
            tags: ["Messages"],
            deprecated: false,
            beta: false,
            auth: ["bearerAuth"],
            parameters: [{ name: "preview", location: "query", required: false, schemaType: "boolean" }],
            requestBody: {
              required: true,
              mediaTypes: ["application/json"],
              schemaRefs: [],
              fields: [{ name: "status", required: true, schemaType: "string", enumValues: ["queued", "sent"] }],
            },
            responses: [{ status: "201", description: "Created", mediaTypes: ["application/json"], schemaRefs: [] }],
            codeSamples: [],
            serverUrl: "https://api.acme.test",
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("cURL");
    expect(html).toContain("curl -X POST");
    expect(html).toContain("Authorization: Bearer YOUR_TOKEN");
    expect(html).toContain("JavaScript");
    expect(html).toContain("fetch(");
    expect(html).toContain("Python");
    expect(html).toContain("requests.post");
    expect(html).toContain("Go");
    expect(html).toContain("http.NewRequest");
    expect(html).toContain("https://api.acme.test/messages?preview={preview}");
    expect(html).toContain("&quot;status&quot;: &quot;queued&quot;");
    expect(html).toContain('<details class="api-code-sample" open>');
  });

  it("renders schema detail routes separately", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "schema",
          route: "/schemas/core/Message",
          title: "Schema: Message",
          description: "Shared schema reference.",
          html: "",
          markdown: "",
          schema: {
            name: "Message",
            specId: "core",
            route: "/schemas/core/Message",
            schemaType: "object",
            fields: [
              { name: "id", required: true, schemaType: "string", description: "Message id." },
              { name: "status", required: false, schemaType: "string", enumValues: ["queued", "sent"] },
            ],
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("Schema: Message");
    expect(html).toContain("Shared schema reference");
    expect(html).toContain('<details class="api-schema-field" open>');
    expect(html).toContain("<code>id</code>");
    expect(html).toContain("Message id.");
    expect(html).toContain("queued");
  });

  it("renders an API portal with spec summaries", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      versions: [
        { id: "v1", label: "Version 1", routePrefix: "/v1", default: false, latest: false, deprecated: true },
        { id: "v2", label: "Version 2", routePrefix: "/v2", default: true, latest: true, deprecated: false },
      ],
      operations: [],
      routes: [
        {
          kind: "api-portal",
          route: "/api-reference",
          title: "API Reference",
          description: "API reference portal.",
          html: "",
          markdown: "",
          apiPortal: {
            route: "/api-reference",
            title: "API Reference",
            specs: [
              {
                id: "core-v1",
                name: "Core API v1",
                version: { id: "v1", label: "Version 1", routePrefix: "/v1", default: false, latest: false, deprecated: true },
                operationCount: 2,
                firstOperationRoute: "/v1/api-reference/core/list-messages",
              },
              {
                id: "admin-v2",
                name: "Admin API v2",
                version: { id: "v2", label: "Version 2", routePrefix: "/v2", default: true, latest: true, deprecated: false },
                operationCount: 1,
                firstOperationRoute: "/v2/api-reference/admin/list-users",
              },
            ],
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("Core API v1");
    expect(html).toContain("Admin API v2");
    expect(html).toContain("Version 1");
    expect(html).toContain("2 operations");
    expect(html).toContain('class="api-portal-card"');
    expect(html).toContain('class="api-portal-card-meta"');
    expect(html).toContain('href="/v1/api-reference/core/list-messages/"');
  });

  it("renders a polished SwingSwap-shaped API reference", () => {
    const searchOperation: SiteManifest["operations"][number] = {
      specId: "core",
      method: "GET",
      path: "/products/search",
      slug: "get-products-search",
      route: "/api-reference/get-products-search",
      summary: "Search products",
      description: "Search products with various filters and pagination",
      tags: ["Products"],
      deprecated: false,
      beta: false,
      auth: [],
      parameters: [
        { name: "query", location: "query", required: false, description: "Search text.", schemaRef: undefined, schemaType: "string" },
        { name: "category", location: "query", required: false, description: "Category slug.", schemaRef: undefined, schemaType: "string" },
        { name: "condition", location: "query", required: false, description: "Product condition.", schemaRef: undefined, schemaType: "string", enumValues: ["new", "used"] },
        { name: "minPrice", location: "query", required: false, description: "Minimum price.", schemaRef: undefined, schemaType: "number" },
        { name: "maxPrice", location: "query", required: false, description: "Maximum price.", schemaRef: undefined, schemaType: "number" },
      ],
      responses: [{ status: "200", description: "Products found", mediaTypes: ["application/json"], schemaRefs: [] }],
      codeSamples: [],
    };
    const uploadOperation: SiteManifest["operations"][number] = {
      specId: "core",
      method: "POST",
      path: "/products/upload",
      slug: "post-products-upload",
      route: "/api-reference/post-products-upload",
      summary: "Create product with file upload",
      description: "Create a new product with image file uploads",
      tags: ["Products"],
      deprecated: false,
      beta: false,
      auth: ["bearerAuth"],
      parameters: [],
      requestBody: {
        required: true,
        mediaTypes: ["multipart/form-data"],
        schemaRefs: ["ProductUploadRequest"],
        fields: [
          { name: "images", required: true, description: "Product images.", schemaType: "array", schemaFormat: "binary" },
          { name: "title", required: true, description: "Product title.", schemaType: "string" },
          { name: "price", required: false, description: "Asking price.", schemaType: "number", schemaFormat: "float" },
        ],
      },
      responses: [
        { status: "201", description: "Product created with images", mediaTypes: ["application/json"], schemaRefs: [] },
        { status: "400", description: "Bad Request - Validation error", mediaTypes: ["application/json"], schemaRefs: ["ErrorResponse"] },
        { status: "401", description: "Unauthorized - Authentication required", mediaTypes: ["application/json"], schemaRefs: ["ErrorResponse"] },
      ],
      codeSamples: [],
      playground: {
        enabled: true,
        baseUrl: "http://localhost:3000/api",
        auth: "bearer",
        apiKeyLocation: "header",
      },
    };
    const productExtras: SiteManifest["operations"] = Array.from({ length: 11 }, (_, index) => ({
      specId: "core",
      method: "GET",
      path: `/products/${index + 1}`,
      slug: `get-products-${index + 1}`,
      route: `/api-reference/get-products-${index + 1}`,
      summary: `Product endpoint ${index + 1}`,
      tags: ["Products"],
      deprecated: false,
      beta: false,
      auth: [],
      parameters: [],
      responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: [] }],
      codeSamples: [],
    }));
    const otherOperations: SiteManifest["operations"] = [
      ["Health", "GET", "/health"],
      ["Authentication", "POST", "/auth/login"],
      ["Addresses", "GET", "/addresses"],
      ["Offers", "POST", "/offers"],
      ["Swaps", "POST", "/swaps"],
      ["Chats", "GET", "/chats/my"],
    ].map(([tag, method, path]) => ({
      specId: "core",
      method,
      path,
      slug: `${method.toLowerCase()}-${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`,
      route: `/api-reference/${method.toLowerCase()}-${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`,
      summary: `${tag} endpoint`,
      tags: [tag],
      deprecated: false,
      beta: false,
      auth: [],
      parameters: [],
      responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: [] }],
      codeSamples: [],
    }));
    const operations = [searchOperation, uploadOperation, ...productExtras, ...otherOperations];
    const routes: SiteManifest["routes"] = [
      {
        kind: "api-portal",
        route: "/api-reference",
        title: "API Reference",
        description: "API reference portal.",
        html: "",
        markdown: "",
        apiPortal: {
          route: "/api-reference",
          title: "API Reference",
          specs: [{ id: "core", name: "SwingSwap Backend API", operationCount: operations.length, firstOperationRoute: searchOperation.route }],
        },
      },
      ...operations.map((operation) => ({
        kind: "api-operation" as const,
        route: operation.route,
        title: `${operation.method} ${operation.path}`,
        description: operation.summary ?? "",
        html: "",
        markdown: "",
        operation,
      })),
    ];
    const manifest: SiteManifest = {
      config: {
        site: { name: "SwingSwap Backend API", description: "Comprehensive API for SwingSwap." },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [{ group: "API Reference", pages: [], openapi: "core" }],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { preset: "highContrast", primaryColor: "#2563eb", darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations,
      routes,
    };

    const uploadHtml = renderRoute(manifest, routes.find((route) => route.route === uploadOperation.route)!);
    const searchHtml = renderRoute(manifest, routes.find((route) => route.route === searchOperation.route)!);
    const portalHtml = renderRoute(manifest, routes[0]);

    expect(uploadHtml).toContain('class="nav-subgroup"');
    expect(uploadHtml).toContain('class="api-nav-filter"');
    expect(uploadHtml).toContain('data-api-nav-filter');
    expect(uploadHtml).toContain('data-documentee-api-nav-filter');
    expect(uploadHtml).toContain("Products");
    expect(uploadHtml).toContain("13 endpoints");
    expect(uploadHtml).toContain('class="api-hero method-post"');
    expect(uploadHtml).toContain('class="api-operation-frame"');
    expect(uploadHtml).toContain('class="api-operation-main"');
    expect(uploadHtml).toContain('class="api-operation-rail"');
    expect(uploadHtml).toContain('class="api-overview-grid"');
    expect(uploadHtml).toContain('class="api-overview-item"');
    expect(uploadHtml).toContain('class="skip-link" href="#main"');
    expect(uploadHtml).toContain('<main id="main" class="doc-main">');
    expect(uploadHtml).toContain(":focus-visible");
    expect(uploadHtml).toContain("@media (prefers-color-scheme: dark)");
    expect(uploadHtml).toContain(".doc-mobile-header");
    expect(uploadHtml).toContain(".doc-sidebar { display: none;");
    expect(uploadHtml).not.toContain('href="#operation"');
    expect(uploadHtml).not.toContain('href="#details"');
    expect(uploadHtml).toContain("<details");
    expect(uploadHtml).toContain("<summary");
    expect(uploadHtml).toContain('class="api-section-heading"');
    expect(uploadHtml).toContain('class="api-rail-card"');
    expect(uploadHtml).toContain('class="api-request-card api-panel-card"');
    expect(uploadHtml).toContain("<h1>Create product with file upload</h1>");
    expect(uploadHtml).toContain('class="api-endpoint-command"');
    expect(searchHtml).toContain('class="api-param-card"');
    expect(searchHtml).toContain("Product condition.");
    expect(searchHtml).toContain("new");
    expect(uploadHtml).toContain("Form fields");
    expect(uploadHtml).toContain("images");
    expect(uploadHtml).toContain("file[]");
    expect(uploadHtml).not.toContain("api-operation</span>");
    expect(uploadHtml).toContain('class="api-response-card api-status-4xx"');
    expect(uploadHtml).toContain("--doc-success");
    expect(uploadHtml).toContain("--doc-danger");
    expect(portalHtml).toContain('class="api-portal-tags"');
    expect(portalHtml).toContain('class="api-portal-card-head"');
    expect(portalHtml).toContain('class="api-portal-card-action"');
    expect(portalHtml).toContain("7 tags");
    expect(portalHtml).toContain("Products");
  });

  it("renders search page fallback and Pagefind UI assets only on the search route", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "pagefind" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "Welcome",
          html: "<h1>Home</h1>",
          markdown: "",
        },
        {
          kind: "page",
          route: "/search",
          title: "Search",
          description: "Search Acme documentation.",
          html: "",
          markdown: "",
        },
        {
          kind: "api-operation",
          route: "/api-reference/list-messages",
          title: "GET /messages",
          description: "List messages",
          html: "",
          markdown: "",
          operation: {
            specId: "core",
            method: "GET",
            path: "/messages",
            slug: "list-messages",
            route: "/api-reference/list-messages",
            summary: "List messages",
            tags: ["Messages"],
            deprecated: false,
            beta: false,
            auth: [],
            parameters: [],
            responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: [] }],
            codeSamples: [],
          },
        },
      ],
    };

    const homeHtml = renderRoute(manifest, manifest.routes[0]);
    const searchHtml = renderRoute(manifest, manifest.routes[1]);

    expect(homeHtml).not.toContain("pagefind-ui.js");
    expect(searchHtml).toContain('id="search"');
    expect(searchHtml).toContain('class="search-hero"');
    expect(searchHtml).toContain('class="search-stat-grid"');
    expect(searchHtml).toContain("2 searchable pages");
    expect(searchHtml).toContain("1 API endpoint");
    expect(searchHtml).toContain('class="search-section-grid"');
    expect(searchHtml).toContain("API endpoints");
    expect(searchHtml).toContain('class="search-fallback-list"');
    expect(searchHtml).toContain('href="/api-reference/list-messages/"');
    expect(searchHtml).toContain('/_pagefind/pagefind-ui.css');
    expect(searchHtml).toContain('/_pagefind/pagefind-ui.js');
    expect(searchHtml).toContain("<noscript>");
  });

  it("renders a search modal trigger with static suggestions on Pagefind-enabled pages", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "pagefind" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "Welcome",
          html: "<h1>Home</h1>",
          markdown: "",
        },
        {
          kind: "page",
          route: "/get-started/quickstart",
          title: "Quickstart",
          description: "Start building.",
          html: "<h1>Quickstart</h1>",
          markdown: "",
        },
        {
          kind: "page",
          route: "/search",
          title: "Search",
          description: "Search Acme documentation.",
          html: "",
          markdown: "",
        },
        {
          kind: "api-operation",
          route: "/api-reference/search-products",
          title: "GET /products/search",
          description: "Search products",
          html: "",
          markdown: "",
          operation: {
            specId: "core",
            method: "GET",
            path: "/products/search",
            slug: "search-products",
            route: "/api-reference/search-products",
            summary: "Search products",
            tags: ["Products"],
            deprecated: false,
            beta: false,
            auth: [],
            parameters: [],
            responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: [] }],
            codeSamples: [],
          },
        },
      ],
    };

    const homeHtml = renderRoute(manifest, manifest.routes[0]);

    expect(homeHtml).toContain('data-search-open');
    expect(homeHtml).toContain('aria-controls="documentee-search-dialog"');
    expect(homeHtml).toContain('class="doc-search-shortcut"');
    expect(homeHtml).toContain("<kbd>Ctrl</kbd><kbd>K</kbd>");
    expect(homeHtml).toContain('<dialog id="documentee-search-dialog"');
    expect(homeHtml).toContain('class="search-modal"');
    expect(homeHtml).toContain('class="search-suggestion-group"');
    expect(homeHtml).toContain('data-search-group');
    expect(homeHtml).toContain("Guides");
    expect(homeHtml).toContain("API endpoints");
    expect(homeHtml).toContain('href="/api-reference/search-products/"');
    expect(homeHtml).toContain('href="/get-started/quickstart/"');
    expect(homeHtml).toContain("Search products");
    expect(homeHtml).toContain('href="/search/"');
    expect(homeHtml).toContain("data-documentee-search-modal");
    expect(homeHtml).toContain("data-search-shortcut-hint");
    expect(homeHtml).not.toContain("pagefind-ui.js");
  });

  it("renders a static version switcher when versions are configured", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      versions: [
        { id: "v1", label: "Version 1", routePrefix: "/v1", default: false, latest: false, deprecated: true },
        { id: "v2", label: "Version 2", routePrefix: "/v2", default: true, latest: true, deprecated: false },
      ],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/",
          title: "Home",
          description: "",
          html: "<h1>Home</h1>",
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("version-switcher");
    expect(html).toContain('href="/v1/"');
    expect(html).toContain('href="/v2/"');
    expect(html).toContain("Version 2");
    expect(html).toContain("version-badge-latest");
    expect(html).toContain("Latest");
    expect(html).toContain("version-badge-deprecated");
    expect(html).toContain("Deprecated");
  });

  it("includes default styles for richer MDX components", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "page",
          route: "/components",
          title: "Components",
          description: "",
          html: '<div class="doc-card-group"><article class="doc-card">Card</article></div>',
          markdown: "",
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain(".doc-card-group");
    expect(html).toContain(".doc-card-group-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }");
    expect(html).toContain(".doc-card-group-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }");
    expect(html).toContain(".doc-accordion");
    expect(html).toContain(".doc-field");
    expect(html).toContain(".doc-frame");
    expect(html).toContain(".doc-package-install");
    expect(html).toContain(".doc-cli-command");
    expect(html).toContain(".doc-mermaid");
    expect(html).toContain(".doc-changelog");
    expect(html).toContain(".doc-columns");
    expect(html).toContain(".doc-feature-grid");
    expect(html).toContain(".doc-endpoint-card");
    expect(html).toContain(".doc-openapi-operation");
  });

  it("renders browser API playground UI and script for enabled operations", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "api-operation",
          route: "/api-reference/create-message",
          title: "POST /messages/{id}",
          description: "Create a message",
          html: "",
          markdown: "",
          operation: {
            specId: "core",
            method: "POST",
            path: "/messages/{id}",
            slug: "create-message",
            route: "/api-reference/create-message",
            summary: "Create a message",
            tags: ["Messages"],
            deprecated: false,
            beta: false,
            auth: ["bearerAuth"],
            parameters: [
              { name: "id", location: "path", required: true },
              { name: "preview", location: "query", required: false },
              { name: "x-trace-id", location: "header", required: false },
            ],
            requestBody: { required: true, mediaTypes: ["application/json"], schemaRefs: [] },
            responses: [{ status: "201", description: "Created", mediaTypes: ["application/json"], schemaRefs: [] }],
            codeSamples: [],
            playground: {
              enabled: true,
              baseUrl: "https://api.acme.test",
              auth: "bearer",
              apiKeyLocation: "header",
              environments: [
                { name: "Production", baseUrl: "https://api.acme.test" },
                { name: "Sandbox", baseUrl: "https://sandbox.acme.test" },
              ],
            },
            serverUrls: [
              { url: "https://api.acme.test", description: "Production" },
              { url: "https://sandbox.acme.test", description: "Sandbox" },
            ],
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).toContain("Try It");
    expect(html).toContain("data-documentee-playground");
    expect(html).toContain('data-method="POST"');
    expect(html).toContain('data-path="/messages/{id}"');
    expect(html).toContain('name="id"');
    expect(html).toContain('name="preview"');
    expect(html).toContain('name="x-trace-id"');
    expect(html).toContain('name="documenteeAuth"');
    expect(html).toContain('name="mediaType"');
    expect(html).toContain('name="body"');
    expect(html).toContain("Browser requests depend on this API's CORS policy");
    expect(html).toContain('name="baseUrl" type="url"');
    expect(html).toContain('name="environment"');
    expect(html).toContain('data-base-url="https://sandbox.acme.test"');
    expect(html).toContain("Production");
    expect(html).toContain("Sandbox");
    expect(html).toContain("Request Preview");
    expect(html).toContain("data-playground-preview");
    expect(html).toContain("Response Headers");
    expect(html).toContain("data-playground-response-headers");
    expect(html).toContain("data-playground-response-body");
    expect(html).toContain(".api-playground input, .api-playground select, .api-playground textarea");
    expect(html).toContain("background: color-mix(in srgb, var(--doc-background) 92%, var(--doc-border));");
    expect(html).toContain(".api-playground button:hover");
    expect(html).toContain(".api-playground-preview");
    expect(html).toContain("<script>");
    expect(html).toContain("fetch");
    expect(html).not.toContain("localStorage");
    expect(html).not.toContain("sessionStorage");
  });

  it("omits browser API playground UI and script when disabled", () => {
    const manifest: SiteManifest = {
      config: {
        site: { name: "Acme", description: "" },
        content: { directory: "docs", exclude: [] },
        versions: [],
        navigation: [],
        openapi: { specs: [] },
        seo: defaultSeo,
        redirects: [],
        search: { provider: "none" },
        theme: { darkMode: true },
        layout: { nav: "sidebar", toc: "right", footer: true, breadcrumbs: true },
      },
      pages: [],
      operations: [],
      routes: [
        {
          kind: "api-operation",
          route: "/api-reference/list-messages",
          title: "GET /messages",
          description: "List messages",
          html: "",
          markdown: "",
          operation: {
            specId: "core",
            method: "GET",
            path: "/messages",
            slug: "list-messages",
            route: "/api-reference/list-messages",
            summary: "List messages",
            tags: ["Messages"],
            deprecated: false,
            beta: false,
            auth: [],
            parameters: [],
            responses: [{ status: "200", description: "OK", mediaTypes: ["application/json"], schemaRefs: [] }],
            codeSamples: [],
          },
        },
      ],
    };

    const html = renderRoute(manifest, manifest.routes[0]);

    expect(html).not.toContain("data-documentee-playground");
    expect(html).not.toContain("<script>");
  });
});
