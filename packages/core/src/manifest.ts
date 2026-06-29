import { resolve } from "node:path";
import { loadOpenApiSpec, normalizeOperations, type ApiOperation } from "@documentee/openapi";
import type { DocumenteeConfig } from "./config.js";
import type { ContentPage } from "./content.js";
import { loadContentPages } from "./content.js";

export type RouteKind = "page" | "api-operation";

export interface SiteRoute {
  kind: RouteKind;
  route: string;
  title: string;
  description: string;
  html: string;
  markdown: string;
  operation?: ApiOperation;
}

export interface SiteManifest {
  config: DocumenteeConfig;
  pages: ContentPage[];
  operations: ApiOperation[];
  routes: SiteRoute[];
}

export async function buildManifest(projectRoot: string, config: DocumenteeConfig): Promise<SiteManifest> {
  const pages = await loadContentPages(projectRoot, config.content);
  const operations: ApiOperation[] = [];

  for (const specConfig of config.openapi.specs) {
    const spec = await loadOpenApiSpec(resolve(projectRoot, specConfig.source));
    operations.push(...normalizeOperations(specConfig.id, specConfig.routeBase, spec));
  }

  const routes: SiteRoute[] = [
    ...pages.map((page): SiteRoute => ({
      kind: "page",
      route: page.route,
      title: page.title,
      description: page.description,
      html: page.html,
      markdown: page.markdown,
    })),
    ...operations.map((operation): SiteRoute => ({
      kind: "api-operation",
      route: operation.route,
      title: `${operation.method} ${operation.path}`,
      description: operation.summary ?? operation.description ?? "",
      html: "",
      markdown: operation.description ?? operation.summary ?? "",
      operation,
    })),
  ].sort((a, b) => a.route.localeCompare(b.route));

  return { config, pages, operations, routes };
}
