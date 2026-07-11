// Template: product-docs
export default {
  site: {
    name: "Orbit Product Docs",
    description: "Product documentation for teams launching and operating workspaces in Orbit.",
  },
  content: { directory: "docs" },
  navigation: [
    { group: "Start", pages: ["docs/index"] },
    { group: "Workflows", pages: ["docs/guides/projects"] },
    { group: "Release Notes", pages: ["docs/changelog"] },
  ],
  openapi: { specs: [] },
  search: { provider: "none" },
  theme: { preset: "startup", primaryColor: "#0f766e", darkMode: true },
};
