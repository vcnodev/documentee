import type { SiteManifest } from "@documentee/core";

export function renderLlmsTxt(manifest: SiteManifest): string {
  const lines = [
    `# ${manifest.config.site.name}`,
    "",
    manifest.config.site.description,
    "",
    "## Docs",
    ...manifest.routes
      .filter((route) => route.kind === "page")
      .map((route) => `- [${route.title}](${route.route})${route.description ? `: ${route.description}` : ""}`),
    "",
    "## API Specifications",
    ...manifest.config.openapi.specs.map((spec) => `- OpenAPI spec \`${spec.id}\`: \`${spec.source}\``),
    "",
  ];

  return `${lines.filter((line, index) => line !== undefined && !(line === "" && lines[index - 1] === "")).join("\n")}\n`;
}

export function renderLlmsFullTxt(manifest: SiteManifest): string {
  const pageSections = manifest.routes
    .filter((route) => route.kind === "page")
    .map((route) => [`## ${route.title}`, "", route.description, "", route.markdown].filter(Boolean).join("\n"));

  const operationSections = manifest.operations.map((operation) =>
    [
      `## ${operation.method} ${operation.path}`,
      "",
      operation.summary,
      "",
      operation.description,
      "",
      `Route: ${operation.route}`,
    ].filter(Boolean).join("\n"),
  );

  return [
    `# ${manifest.config.site.name}`,
    "",
    manifest.config.site.description,
    "",
    ...pageSections,
    "",
    "# API Reference",
    "",
    ...operationSections,
    "",
  ].filter(Boolean).join("\n");
}
