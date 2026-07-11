import { buildManifest, loadConfig, validateManifestWithPlugins, type SiteManifest, type SiteRoute } from "@documentee/core";

export type AuditFormat = "markdown" | "json";

export interface AuditOptions {
  format?: AuditFormat;
}

export interface AuditIssue {
  category: "links" | "metadata" | "structure" | "content" | "openapi" | "ai" | "search" | "seo" | "validation";
  severity: "error" | "warning";
  message: string;
  route?: string;
  source?: string;
}

interface AuditResult {
  summary: {
    total: number;
    errors: number;
    warnings: number;
  };
  issues: AuditIssue[];
}

const largePageBytes = 50_000;
const privatePathPattern = /(?:^|\/)(?:private|internal|draft|drafts)(?:\/|$)/i;

export async function auditCommand(projectRoot: string, options: AuditOptions = {}): Promise<string> {
  const config = await loadConfig(projectRoot);
  const manifest = await buildManifest(projectRoot, config);
  const issues = sortIssues([
    ...await validationIssues(manifest),
    ...metadataIssues(manifest),
    ...structureIssues(manifest),
    ...contentIssues(manifest),
    ...openApiIssues(manifest),
    ...aiIssues(manifest),
    ...searchIssues(manifest),
    ...seoIssues(manifest),
  ]);
  const result: AuditResult = {
    summary: {
      total: issues.length,
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
    },
    issues,
  };

  return options.format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderAuditMarkdown(result);
}

async function validationIssues(manifest: SiteManifest): Promise<AuditIssue[]> {
  return (await validateManifestWithPlugins(manifest)).map((message): AuditIssue => {
    const route = message.match(/ on ([^:]+):/)?.[1];
    return {
      category: message.startsWith("Broken internal link") ? "links" : "validation",
      severity: "error",
      message,
      ...(route ? { route } : {}),
    };
  });
}

function metadataIssues(manifest: SiteManifest): AuditIssue[] {
  return manifest.routes
    .filter((route) => route.kind === "page" || route.kind === "api-operation")
    .filter((route) => !route.description.trim())
    .map((route) => ({
      category: "metadata",
      severity: "warning",
      route: route.route,
      source: route.sourceProjectPath,
      message: `Missing description for ${route.route}`,
    }));
}

function structureIssues(manifest: SiteManifest): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const titleRoutes = new Map<string, SiteRoute[]>();

  for (const route of manifest.routes.filter((item) => item.kind === "page")) {
    if (!/<h1(?:\s|>)/i.test(route.html)) {
      issues.push({
        category: "structure",
        severity: "warning",
        route: route.route,
        source: route.sourceProjectPath,
        message: `Missing h1 on ${route.route}`,
      });
    }
    titleRoutes.set(route.title, [...(titleRoutes.get(route.title) ?? []), route]);
  }

  for (const [title, routes] of titleRoutes) {
    if (routes.length < 2) continue;
    issues.push({
      category: "structure",
      severity: "warning",
      message: `Duplicate title "${title}" on ${routes.map((route) => route.route).sort().join(", ")}`,
    });
  }

  return issues;
}

function contentIssues(manifest: SiteManifest): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const route of manifest.routes.filter((item) => item.kind === "page")) {
    if (route.sourceProjectPath && privatePathPattern.test(route.sourceProjectPath)) {
      issues.push({
        category: "content",
        severity: "error",
        route: route.route,
        source: route.sourceProjectPath,
        message: `Private content appears public: ${route.sourceProjectPath}`,
      });
    }

    if (Buffer.byteLength(route.markdown, "utf8") > largePageBytes) {
      issues.push({
        category: "content",
        severity: "warning",
        route: route.route,
        source: route.sourceProjectPath,
        message: `Page is too large: ${route.route}`,
      });
    }
  }

  return issues;
}

function openApiIssues(manifest: SiteManifest): AuditIssue[] {
  return manifest.operations
    .filter((operation) => {
      const hasRequestExample = (operation.requestBody?.examples?.length ?? 0) > 0;
      const hasResponseExample = operation.responses.some((response) => (response.examples?.length ?? 0) > 0);
      return !hasRequestExample && !hasResponseExample && operation.codeSamples.length === 0;
    })
    .map((operation) => ({
      category: "openapi",
      severity: "warning",
      route: operation.route,
      message: `Missing OpenAPI examples for \`${operation.method} ${operation.path}\``,
    }));
}

function aiIssues(manifest: SiteManifest): AuditIssue[] {
  return manifest.config.site.description.trim()
    ? []
    : [{
      category: "ai",
      severity: "warning",
      message: "Missing llms.txt site description metadata",
    }];
}

function searchIssues(manifest: SiteManifest): AuditIssue[] {
  if (manifest.config.search.provider !== "pagefind") return [];
  return manifest.routes.some((route) => route.route === "/search")
    ? []
    : [{
      category: "search",
      severity: "error",
      message: "Search route missing while search.provider is pagefind",
    }];
}

function seoIssues(manifest: SiteManifest): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (manifest.config.seo.sitemap && !manifest.config.site.url) {
    issues.push({
      category: "seo",
      severity: "warning",
      message: "Sitemap is enabled but site.url is missing",
    });
  }
  if (manifest.config.seo.robots.enabled && manifest.config.seo.sitemap && !manifest.config.site.url) {
    issues.push({
      category: "seo",
      severity: "warning",
      message: "Robots.txt cannot include a sitemap URL because site.url is missing",
    });
  }
  return issues;
}

function sortIssues(issues: AuditIssue[]): AuditIssue[] {
  const severityRank = { error: 0, warning: 1 };
  return [...issues].sort((a, b) =>
    severityRank[a.severity] - severityRank[b.severity] ||
    a.category.localeCompare(b.category) ||
    (a.route ?? "").localeCompare(b.route ?? "") ||
    a.message.localeCompare(b.message)
  );
}

function renderAuditMarkdown(result: AuditResult): string {
  return [
    "# Documentee Audit",
    "",
    "## Summary",
    `- Total issues: ${result.summary.total}`,
    `- Errors: ${result.summary.errors}`,
    `- Warnings: ${result.summary.warnings}`,
    "",
    renderIssueSection("Errors", result.issues.filter((issue) => issue.severity === "error")),
    renderIssueSection("Warnings", result.issues.filter((issue) => issue.severity === "warning")),
  ].join("\n");
}

function renderIssueSection(title: string, issues: AuditIssue[]): string {
  return [
    `## ${title}`,
    ...(issues.length > 0 ? issues.map((issue) => {
      const route = issue.route ? ` \`${issue.route}\`` : "";
      const source = issue.source ? ` (${issue.source})` : "";
      return `- [${issue.category}]${route}${source}: ${issue.message}`;
    }) : ["- None"]),
    "",
  ].join("\n");
}
