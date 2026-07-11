import { stat } from "node:fs/promises";
import { isAbsolute, join as joinPath, relative, resolve } from "node:path";
import { loadOpenApiSpec, normalizeOperations, type ApiOperation, type ApiSchemaField, type ApiSchemaSummary } from "@documentee/openapi";
import type { DocumenteeConfig } from "./config.js";
import type { ContentPage, PageSeo } from "./content.js";
import { loadContentPages } from "./content.js";
import { applyManifestPlugins } from "./plugins.js";

export type RouteKind = "page" | "api-operation" | "schema" | "api-portal" | "search";

export interface VersionReference {
  id: string;
  label: string;
  routePrefix: string;
  default: boolean;
  latest: boolean;
  deprecated: boolean;
}

export interface LocaleReference {
  code: string;
  label: string;
  dir: "ltr" | "rtl";
  routePrefix: string;
  default: boolean;
}

type NormalizedVersion = VersionReference & {
  content: DocumenteeConfig["content"];
};

export interface SchemaReference extends ApiSchemaSummary {
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
  sourcePath?: string;
  sourceRelativePath?: string;
  sourceProjectPath?: string;
  lastUpdated?: string;
  seo?: PageSeo;
  canonicalRoute?: string;
  version?: VersionReference;
  operation?: ApiOperation;
  schema?: SchemaReference;
  apiPortal?: ApiPortalReference;
  locale?: LocaleReference;
}

export interface SiteManifest {
  config: DocumenteeConfig;
  pages: ContentPage[];
  versions?: VersionReference[];
  locales?: LocaleReference[];
  operations: ApiOperation[];
  routes: SiteRoute[];
}

export async function buildManifest(projectRoot: string, config: DocumenteeConfig): Promise<SiteManifest> {
  const versions = normalizeVersions(config);
  const locales = normalizeLocales(config);
  const defaultLocale = locales.find((locale) => locale.default);
  const publicVersions = versions.map((version) => publicVersion(version));
  const versionById = new Map(publicVersions.map((version) => [version.id, version]));
  const basePages = filterBasePages(
    await loadContentPages(projectRoot, config.content),
    projectRoot,
    config.content.directory,
    versions,
    locales,
  );
  const pages: ContentPage[] = [...basePages];
  const pageRoutes: SiteRoute[] = basePages.map((page) => pageRoute(page, undefined, defaultLocale));
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
      canonicalRoute: canonicalRouteForVersion(operation.route, version),
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

  for (const locale of locales.filter((item) => !item.default)) {
    const localeContent = {
      directory: joinPath(config.content.directory, locale.code),
      exclude: config.content.exclude,
    };
    if (!(await directoryExists(resolve(projectRoot, localeContent.directory)))) continue;
    const localePages = (await loadContentPages(projectRoot, localeContent)).map((page) => ({
      ...page,
      route: joinRoutes(locale.routePrefix, page.route),
    }));
    pages.push(...localePages);
    pageRoutes.push(...localePages.map((page) => pageRoute(page, undefined, locale)));
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

  return applyManifestPlugins({ config, pages, versions: publicVersions, locales: locales.length > 0 ? locales : undefined, operations, routes });
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
    for (const name of operation.requestBody?.schemaRefs ?? []) {
      refs.set(`${operation.specId}:${name}`, {
        specId: operation.specId,
        name,
        route: joinRoutes("/schemas", operation.specId, name),
        schemaType: "object",
        ...(operation.requestBody?.fields ? { fields: operation.requestBody.fields } : {}),
      });
    }

    for (const response of operation.responses) {
      for (const name of response.schemaRefs) {
        refs.set(`${operation.specId}:${name}`, {
          specId: operation.specId,
          name,
          route: joinRoutes("/schemas", operation.specId, name),
          ...schemaSummaryForRef(name, response.fields),
        });
      }
    }
  }
  return [...refs.values()].sort((a, b) => a.route.localeCompare(b.route));
}

function schemaSummaryForRef(name: string, fields: ApiSchemaField[] | undefined): ApiSchemaSummary {
  const direct = fields?.find((field) => field.schemaRef === name || field.name === name);
  if (direct) {
    const { name: _name, required: _required, ...summary } = direct;
    return summary;
  }
  return fields && fields.length > 0 ? { schemaType: "object", fields } : {};
}

function normalizeVersions(config: DocumenteeConfig): NormalizedVersion[] {
  return (config.versions ?? []).map((version) => ({
    id: version.id,
    label: version.label,
    routePrefix: version.routePrefix,
    content: version.content,
    default: version.default,
    latest: version.latest,
    deprecated: version.deprecated,
  }));
}

function normalizeLocales(config: DocumenteeConfig): LocaleReference[] {
  const i18n = config.i18n;
  if (!i18n) return [];

  return i18n.locales.map((locale) => {
    const isDefault = locale.code === i18n.defaultLocale;
    return {
      code: locale.code,
      label: locale.label,
      dir: locale.dir,
      default: isDefault,
      routePrefix: isDefault && !i18n.prefixDefaultLocale ? "/" : `/${locale.code}`,
    };
  });
}

function publicVersion(version: NormalizedVersion): VersionReference {
  return {
    id: version.id,
    label: version.label,
    routePrefix: version.routePrefix,
    default: version.default,
    latest: version.latest,
    deprecated: version.deprecated,
  };
}

function pageRoute(page: ContentPage, version?: VersionReference, locale?: LocaleReference): SiteRoute {
  return {
    kind: "page",
    route: page.route,
    title: page.title,
    description: page.description,
    html: page.html,
    markdown: page.markdown,
    sourcePath: page.sourcePath,
    sourceRelativePath: page.sourceRelativePath,
    sourceProjectPath: page.sourceProjectPath,
    lastUpdated: page.lastUpdated,
    seo: page.seo,
    canonicalRoute: canonicalRouteForVersion(page.route, version),
    version,
    locale,
  };
}

function canonicalRouteForVersion(route: string, version: VersionReference | undefined): string | undefined {
  if (!version?.latest) return undefined;
  if (version.routePrefix === "/") return route;
  if (route === version.routePrefix) return "/";

  const prefix = `${version.routePrefix}/`;
  if (!route.startsWith(prefix)) return undefined;

  return joinRoutes(route.slice(prefix.length));
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
  contentDirectory: string,
  versions: NormalizedVersion[],
  locales: LocaleReference[] = [],
): ContentPage[] {
  const filteredRoots = [
    ...versions.map((version) => version.content.directory),
    ...locales.filter((locale) => !locale.default).map((locale) => joinPath(contentDirectory, locale.code)),
  ]
    .map((directory) => resolve(projectRoot, directory));

  if (filteredRoots.length === 0) return pages;

  return pages.filter((page) => !filteredRoots.some((root) => isInside(page.sourcePath, root)));
}

function isInside(filePath: string, directory: string): boolean {
  const path = relative(directory, filePath);
  return path !== "" && !path.startsWith("..") && !isAbsolute(path);
}

function joinRoutes(...parts: string[]): string {
  const segments = parts.flatMap((part) => part.split("/").filter(Boolean));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

async function directoryExists(directory: string): Promise<boolean> {
  try {
    return (await stat(directory)).isDirectory();
  } catch {
    return false;
  }
}
