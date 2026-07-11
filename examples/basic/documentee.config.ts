export default {
  site: {
    name: "Acme Docs",
    url: "https://docs.acme.test",
    description: "Developer documentation for the Acme API",
  },
  content: {
    directory: "docs",
  },
  versions: [
    {
      id: "v1",
      label: "Version 1",
      routePrefix: "/v1",
      content: { directory: "docs/v1" },
      latest: true,
      default: true,
    },
  ],
  i18n: {
    defaultLocale: "en",
    locales: [
      { code: "en", label: "English" },
      { code: "fr", label: "Français" },
      { code: "ar", label: "العربية", dir: "rtl" },
    ],
  },
  navigation: [
    { group: "Get Started", pages: ["docs/index", "docs/get-started/quickstart", "docs/components"] },
    { group: "Versions", pages: ["/v1"] },
    { group: "API Reference", openapi: "core" },
    { group: "Admin API", openapi: "admin" },
  ],
  openapi: {
    specs: [
      {
        id: "core",
        name: "Core API",
        source: "./api/openapi.yaml",
        routeBase: "/api-reference/core",
        version: "v1",
        playground: {
          enabled: true,
          baseUrl: "https://api.acme.test",
          auth: "bearer",
          environments: [
            { name: "Production", baseUrl: "https://api.acme.test" },
            { name: "Sandbox", baseUrl: "https://sandbox.acme.test" },
          ],
        },
      },
      {
        id: "admin",
        name: "Admin API",
        source: "./api/admin-openapi.yaml",
        routeBase: "/api-reference/admin",
        playground: {
          enabled: false,
          auth: "none",
        },
      },
    ],
  },
  search: {
    provider: "pagefind",
  },
  seo: {
    titleTemplate: "%s | Acme Docs",
    image: "/og.png",
    twitterCard: "summary_large_image",
    sitemap: true,
    robots: {
      enabled: true,
      rules: [{ userAgent: "*", allow: "/" }],
    },
  },
  redirects: [
    { from: "/start", to: "/get-started/quickstart", status: 301 },
  ],
  theme: {
    preset: "mint",
    primaryColor: "#2563eb",
    navWidth: "300px",
    radius: "8px",
    darkMode: true,
  },
};
