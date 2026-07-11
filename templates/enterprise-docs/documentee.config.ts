// Template: enterprise-docs
export default {
  site: {
    name: "Atlas Enterprise Docs",
    description: "Enterprise documentation for security, administration, compliance, and platform APIs.",
  },
  content: { directory: "docs" },
  navigation: [
    { group: "Overview", pages: ["docs/index", "docs/security"] },
    { group: "Admin API", openapi: "admin" },
  ],
  openapi: {
    specs: [{ id: "admin", name: "Admin API", source: "./api/admin-openapi.yaml", routeBase: "/admin-api" }],
  },
  search: { provider: "none" },
  theme: { preset: "enterprise", primaryColor: "#475569", darkMode: true },
};
