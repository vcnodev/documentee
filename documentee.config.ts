export default {
  site: {
    name: "Documentee",
    url: "https://documentee.dev",
    description: "Open-source static documentation for humans and AI agents.",
  },
  content: {
    directory: "docs",
    exclude: ["superpowers/**"],
  },
  navigation: [
    { group: "Start", pages: ["docs/index", "docs/get-started/quickstart", "docs/get-started/use-documentee", "docs/configuration"] },
    { group: "Reference", pages: ["docs/api-reference/config", "docs/api-reference/cli", "docs/api-reference/openapi", "docs/components"] },
    { group: "AI Agents", pages: ["docs/ai-agents/index", "docs/ai-agents/doc-builder-guide"] },
    {
      group: "Comparisons",
      pages: [
        "docs/comparisons/mintlify",
        "docs/comparisons/docusaurus",
        "docs/comparisons/nextra",
        "docs/comparisons/scalar",
      ],
    },
    { group: "Showcase", pages: ["docs/showcase/static-api-docs", "docs/showcase/ai-ready-docs"] },
    { group: "Contributing", pages: ["docs/contributing/architecture", "docs/contributing/testing", "docs/contributing/small-html-no-client-js"] },
  ],
  search: {
    provider: "pagefind",
  },
  seo: {
    titleTemplate: "%s | Documentee",
    twitterCard: "summary_large_image",
    sitemap: true,
    robots: {
      enabled: true,
      rules: [{ userAgent: "*", allow: "/" }],
    },
  },
  theme: {
    designSystem: "minimal-technical",
    overrides: {
      primaryColor: "#2563eb",
      navWidth: "300px",
      radius: "8px",
    },
    darkMode: true,
  },
};
