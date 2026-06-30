import { resolve } from "node:path";
import { loadOpenApiSpec, normalizeOperations, type ApiOperation } from "@documentee/openapi";
import type { DocumenteeConfig } from "./config.js";
import type { ContentPage, PageSeo } from "./content.js";
import { loadContentPages } from "./content.js";

export type RouteKind = "page" | "api-operation" | "schema";

export interface SchemaReference {
  name: string;
  specId: string;
}

export interface SiteRoute {
  kind: RouteKind;
  route: string;
  title: string;
  description: string;
  html: string;
  markdown: string;
  seo?: PageSeo;
  operation?: ApiOperation;
  schema?: SchemaReference;
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
    operations.push(...normalizeOperations(specConfig.id, specConfig.routeBase, spec, {
      playground: specConfig.playground,
    }));
  }

  const routes: SiteRoute[] = [
    ...pages.map((page): SiteRoute => ({
      kind: "page",
      route: page.route,
      title: page.title,
      description: page.description,
      html: page.html,
      markdown: page.markdown,
      seo: page.seo,
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
    ...schemaReferences(operations).map((schema): SiteRoute => ({
      kind: "schema",
      route: `/schemas/${schema.name}`,
      title: `Schema: ${schema.name}`,
      description: "Shared schema reference.",
      html: "",
      markdown: "",
      schema,
    })),
  ].sort((a, b) => a.route.localeCompare(b.route));

  return { config, pages, operations, routes };
}

function schemaReferences(operations: ApiOperation[]): SchemaReference[] {
  const refs = new Map<string, SchemaReference>();
  for (const operation of operations) {
    for (const name of [
      ...(operation.requestBody?.schemaRefs ?? []),
      ...operation.responses.flatMap((response) => response.schemaRefs),
    ]) {
      refs.set(`${operation.specId}:${name}`, { specId: operation.specId, name });
    }
  }
  return [...refs.values()].sort((a, b) => a.name.localeCompare(b.name));
}
