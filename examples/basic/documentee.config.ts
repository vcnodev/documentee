export default {
  site: {
    name: "Acme Docs",
    url: "https://docs.acme.test",
    description: "Developer documentation for the Acme API",
  },
  content: {
    directory: "docs",
  },
  navigation: [
    { group: "Get Started", pages: ["docs/index", "docs/get-started/quickstart", "docs/components"] },
    { group: "API Reference", openapi: "core" },
  ],
  openapi: {
    specs: [
      {
        id: "core",
        name: "Core API",
        source: "./api/openapi.yaml",
        routeBase: "/api-reference",
        playground: {
          enabled: true,
          baseUrl: "https://api.acme.test",
          auth: "bearer",
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
    darkMode: true,
  },
};
