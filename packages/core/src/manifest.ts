import { isAbsolute, relative, resolve } from "node:path";
import { loadOpenApiSpec, normalizeOperations, type ApiOperation } from "@documentee/openapi";
import type { DocumenteeConfig } from "./config.js";
import type { ContentPage, PageSeo } from "./content.js";
import { loadContentPages } from "./content.js";

export type RouteKind = "page" | "api-operation" | "schema" | "api-portal" | "search";

export interface VersionReference {
  id: string;
  label: string;
  routePrefix: string;
  default: boolean;
}

type NormalizedVersion = VersionReference & {
  content: DocumenteeConfig["content"];
};

export interface SchemaReference {
  name: string;
  specId: string;
  route?: string;
}

export interface ApiPortalSpecSummary {
  id: string;
  name: string;
  version?: VersionReference;
  operationCount: number;
  firstOperationRoute?: string;
}

export interface ApiPortalReference {
  route: string;
  title: string;
  specs: ApiPortalSpecSummary[];
}

export interface SiteRoute {
  kind: RouteKind;
  route: string;
  title: string;
  description: string;
  html: string;
  markdown: string;
  seo?: PageSeo;
  version?: VersionReference;
  operation?: ApiOperation;
  schema?: SchemaReference;
  apiPortal?: ApiPortalReference;
}

export interface SiteManifest {
  config: DocumenteeConfig;
  pages: ContentPage[];
  versions?: VersionReference[];
  operations: ApiOperation[];
  routes: SiteRoute[];
}

export async function buildManifest(projectRoot: string, config: DocumenteeConfig): Promise<SiteManifest> {
  const versions = normalizeVersions(config);
  const publicVersions = versions.map((version) => publicVersion(version));
  const versionById = new Map(publicVersions.map((version) => [version.id, version]));
  const basePages = filterBasePages(
    await loadContentPages(projectRoot, config.content),
    projectRoot,
    versions,
  );
  const pages: ContentPage[] = [...basePages];
  const pageRoutes: SiteRoute[] = basePages.map((page) => pageRoute(page));
  const operations: ApiOperation[] = [];
  const operationRoutes: SiteRoute[] = [];

  for (const specConfig of config.openapi.specs) {
    const version = specConfig.version ? versionById.get(specConfig.version) : undefined;
    const routeBase = version ? joinRoutes(version.routePrefix, specConfig.routeBase) : specConfig.routeBase;
    const spec = await loadOpenApiSpec(resolve(projectRoot, specConfig.source));
    const specOperations = normalizeOperations(specConfig.id, routeBase, spec, {
      playground: specConfig.playground,
    });
    operations.push(...specOperations);
    operationRoutes.push(...specOperations.map((operation): SiteRoute => ({
      kind: "api-operation",
      route: operation.route,
      title: `${operation.method} ${operation.path}`,
      description: operation.summary ?? operation.description ?? "",
      html: "",
      markdown: operation.description ?? operation.summary ?? "",
      version,
      operation,
    })));
  }

  for (const version of versions) {
    const routeVersion = versionById.get(version.id);
    const versionPages = (await loadContentPages(projectRoot, version.content)).map((page) => ({
      ...page,
      route: joinRoutes(version.routePrefix, page.route),
    }));
    pages.push(...versionPages);
    pageRoutes.push(...versionPages.map((page) => pageRoute(page, routeVersion)));
  }

  const routes: SiteRoute[] = [
    ...pageRoutes,
    ...searchRoute(config),
    ...apiPortalRoute(config, operations, versionById),
    ...operationRoutes,
    ...schemaReferences(operations).map((schema): SiteRoute => ({
      kind: "schema",
      route: schema.route,
      title: `Schema: ${schema.name}`,
      description: "Shared schema reference.",
      html: "",
      markdown: "",
      schema,
    })),
  ].sort((a, b) => a.route.localeCompare(b.route));

  return { config, pages, versions: publicVersions, operations, routes };
}

function searchRoute(config: DocumenteeConfig): SiteRoute[] {
  if (config.search.provider !== "pagefind") return [];

  return [{
    kind: "search",
    route: "/search",
    title: "Search",
    description: `Search ${config.site.name} documentation.`,
    html: "",
    markdown: "",
  }];
}

function schemaReferences(operations: ApiOperation[]): Array<SchemaReference & { route: string }> {
  const refs = new Map<string, SchemaReference & { route: string }>();
  for (const operation of operations) {
    for (const name of [
      ...(operation.requestBody?.schemaRefs ?? []),
      ...operation.responses.flatMap((response) => response.schemaRefs),
    ]) {
      refs.set(`${operation.specId}:${name}`, {
        specId: operation.specId,
        name,
        route: joinRoutes("/schemas", operation.specId, name),
      });
    }
  }
  return [...refs.values()].sort((a, b) => a.route.localeCompare(b.route));
}

function normalizeVersions(config: DocumenteeConfig): NormalizedVersion[] {
  return (config.versions ?? []).map((version) => ({
    id: version.id,
    label: version.label,
    routePrefix: version.routePrefix,
    content: version.content,
    default: version.default,
  }));
}

function publicVersion(version: NormalizedVersion): VersionReference {
  return {
    id: version.id,
    label: version.label,
    routePrefix: version.routePrefix,
    default: version.default,
  };
}

function pageRoute(page: ContentPage, version?: VersionReference): SiteRoute {
  return {
    kind: "page",
    route: page.route,
    title: page.title,
    description: page.description,
    html: page.html,
    markdown: page.markdown,
    seo: page.seo,
    version,
  };
}

function apiPortalRoute(
  config: DocumenteeConfig,
  operations: ApiOperation[],
  versionById: Map<string, VersionReference>,
): SiteRoute[] {
  if (config.openapi.specs.length === 0) return [];

  const specs = config.openapi.specs.map((spec): ApiPortalSpecSummary => {
    const specOperations = operations.filter((operation) => operation.specId === spec.id);
    return {
      id: spec.id,
      name: spec.name ?? spec.id,
      version: spec.version ? versionById.get(spec.version) : undefined,
      operationCount: specOperations.length,
      firstOperationRoute: specOperations[0]?.route,
    };
  });

  const apiPortal: ApiPortalReference = {
    route: "/api-reference",
    title: "API Reference",
    specs,
  };

  return [{
    kind: "api-portal",
    route: apiPortal.route,
    title: apiPortal.title,
    description: "API reference portal.",
    html: "",
    markdown: "",
    apiPortal,
  }];
}

function filterBasePages(
  pages: ContentPage[],
  projectRoot: string,
  versions: NormalizedVersion[],
): ContentPage[] {
  const versionRoots = versions
    .map((version) => version.content.directory)
    .map((directory) => resolve(projectRoot, directory));

  if (versionRoots.length === 0) return pages;

  return pages.filter((page) => !versionRoots.some((root) => isInside(page.sourcePath, root)));
}

function isInside(filePath: string, directory: string): boolean {
  const path = relative(directory, filePath);
  return path !== "" && !path.startsWith("..") && !isAbsolute(path);
}

function joinRoutes(...parts: string[]): string {
  const segments = parts.flatMap((part) => part.split("/").filter(Boolean));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}
