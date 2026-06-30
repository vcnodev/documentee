import type { ApiCodeSample, ApiOperation, ApiParameter, ApiPlayground, ApiRequestBody, ApiResponse, OpenApiDocument, OpenApiOperation } from "./types.js";

const METHODS = new Set(["get", "put", "post", "delete", "patch", "options", "head", "trace"]);

export interface NormalizeOperationOptions {
  playground?: ApiPlayground;
}

export function normalizeOperations(
  specId: string,
  routeBase: string,
  spec: OpenApiDocument,
  options: NormalizeOperationOptions = {},
): ApiOperation[] {
  const operations: ApiOperation[] = [];
  const playground = normalizePlayground(options.playground, spec);

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!isRecord(pathItem)) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!METHODS.has(method.toLowerCase()) || !isRecord(operation)) continue;

      const normalized = operation as OpenApiOperation;
      const slug = createOperationSlug(method, path, normalized.operationId);

      operations.push({
        specId,
        method: method.toUpperCase(),
        path,
        slug,
        route: joinRoute(routeBase, slug),
        operationId: normalized.operationId,
        summary: normalized.summary,
        description: normalized.description,
        tags: Array.isArray(normalized.tags) ? normalized.tags.filter((tag): tag is string => typeof tag === "string") : [],
        deprecated: normalized.deprecated === true,
        beta: normalized["x-beta"] === true,
        auth: normalizeAuth(normalized.security),
        parameters: normalizeParameters(normalized.parameters),
        requestBody: normalizeRequestBody(normalized.requestBody),
        responses: normalizeResponses(normalized.responses),
        codeSamples: normalizeCodeSamples(normalized["x-codeSamples"]),
        playground,
      });
    }
  }

  return operations.sort((a, b) => a.route.localeCompare(b.route));
}

function normalizePlayground(playground: ApiPlayground | undefined, spec: OpenApiDocument): ApiPlayground | undefined {
  if (!playground?.enabled) return undefined;
  return {
    ...playground,
    baseUrl: playground.baseUrl ?? firstServerUrl(spec),
  };
}

function normalizeCodeSamples(samples: unknown): ApiCodeSample[] {
  if (!Array.isArray(samples)) return [];
  return samples.filter(isRecord).flatMap((sample) => {
    const lang = stringValue(sample.lang) ?? stringValue(sample.language);
    const source = stringValue(sample.source) ?? stringValue(sample.code);
    return lang && source ? [{ lang, source }] : [];
  });
}

function normalizeAuth(security: OpenApiOperation["security"]): string[] {
  if (!Array.isArray(security)) return [];
  return [...new Set(security.flatMap((entry) => Object.keys(entry)))].sort();
}

function normalizeParameters(parameters: unknown): ApiParameter[] {
  if (!Array.isArray(parameters)) return [];

  return parameters.filter(isRecord).map((parameter) => ({
    name: stringValue(parameter.name) ?? "parameter",
    location: stringValue(parameter.in) ?? "query",
    required: parameter.required === true,
    schemaRef: schemaRefFromValue(parameter.schema),
  }));
}

function normalizeRequestBody(requestBody: unknown): ApiRequestBody | undefined {
  if (!isRecord(requestBody)) return undefined;
  const content = isRecord(requestBody.content) ? requestBody.content : {};
  const mediaTypes = Object.keys(content).sort();
  const schemaRefs = unique(mediaTypes.flatMap((mediaType) => schemaRefsFromMedia(content[mediaType])));

  return {
    required: requestBody.required === true,
    mediaTypes,
    schemaRefs,
  };
}

function normalizeResponses(responses: unknown): ApiResponse[] {
  if (!isRecord(responses)) return [];

  return Object.entries(responses)
    .map(([status, response]) => {
      const record = isRecord(response) ? response : {};
      const content = isRecord(record.content) ? record.content : {};
      const mediaTypes = Object.keys(content).sort();
      return {
        status,
        description: stringValue(record.description) ?? "",
        mediaTypes,
        schemaRefs: unique(mediaTypes.flatMap((mediaType) => schemaRefsFromMedia(content[mediaType]))),
      };
    })
    .sort((a, b) => a.status.localeCompare(b.status));
}

function schemaRefsFromMedia(media: unknown): string[] {
  if (!isRecord(media)) return [];
  return schemaRefFromValue(media.schema) ? [schemaRefFromValue(media.schema)!] : [];
}

function schemaRefFromValue(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const ref = stringValue(value.$ref);
  if (!ref) return undefined;
  return ref.split("/").filter(Boolean).at(-1);
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function firstServerUrl(spec: OpenApiDocument): string | undefined {
  return spec.servers?.find((server) => typeof server.url === "string" && server.url.length > 0)?.url;
}

export function createOperationSlug(method: string, path: string, operationId?: string): string {
  const base = operationId && operationId.trim().length > 0 ? operationId : `${method}-${path}`;
  return base
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function joinRoute(base: string, slug: string): string {
  return `/${[base, slug]
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
