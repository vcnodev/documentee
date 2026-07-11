// Template: api-first
export default {
  site: {
    name: "Acme Docs",
    description: "API-first documentation for builders integrating Acme payments.",
  },
  content: { directory: "docs" },
  navigation: [
    { group: "Get Started", pages: ["docs/index", "docs/get-started/quickstart"] },
    { group: "API Reference", openapi: "core" },
  ],
  openapi: {
    specs: [{ id: "core", name: "Core API", source: "./api/openapi.yaml", routeBase: "/api-reference" }],
  },
  search: { provider: "none" },
  theme: { preset: "api", primaryColor: "#2563eb", darkMode: true },
};
