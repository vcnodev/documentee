export default {
  site: {
    name: "Acme Docs",
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
      },
    ],
  },
  search: {
    provider: "pagefind",
  },
  theme: {
    darkMode: true,
  },
};
