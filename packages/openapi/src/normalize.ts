import type { ApiCodeSample, ApiExample, ApiOperation, ApiParameter, ApiPlayground, ApiRequestBody, ApiResponse, ApiSchemaField, ApiSchemaSummary, ApiServerUrl, OpenApiDocument, OpenApiOperation } from "./types.js";

const METHODS = new Set(["get", "put", "post", "delete", "patch", "options", "head", "trace"]);
const MAX_SCHEMA_DEPTH = 4;
const MAX_EXAMPLE_LENGTH = 2000;

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
        auth: normalizeAuth(normalized.security ?? spec.security),
        parameters: normalizeParameters(normalized.parameters, spec),
        requestBody: normalizeRequestBody(normalized.requestBody, spec),
        responses: normalizeResponses(normalized.responses, spec),
        codeSamples: normalizeCodeSamples(normalized["x-codeSamples"]),
        serverUrl: firstServerUrl(spec),
        serverUrls: normalizeServerUrls(spec),
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

function normalizeParameters(parameters: unknown, spec: OpenApiDocument): ApiParameter[] {
  if (!Array.isArray(parameters)) return [];

  return parameters.filter(isRecord).map((parameter) => {
    const resolved = resolveLocalRef(parameter, spec) ?? parameter;
    const schema = isRecord(resolved.schema) ? (resolveLocalRef(resolved.schema, spec) ?? resolved.schema) : undefined;
    const description = stringValue(resolved.description);
    const schemaType = schema ? schemaTypeFromValue(schema, spec) : undefined;
    const schemaFormat = schema ? schemaFormatFromValue(schema, spec) : undefined;
    const enumValues = schema ? enumValuesFromSchema(schema) : undefined;
    return {
      name: stringValue(resolved.name) ?? "parameter",
      location: stringValue(resolved.in) ?? "query",
      required: resolved.required === true,
      schemaRef: schemaRefFromValue(resolved.schema),
      ...(description ? { description } : {}),
      ...(schemaType ? { schemaType } : {}),
      ...(schemaFormat ? { schemaFormat } : {}),
      ...(enumValues ? { enumValues } : {}),
    };
  });
}

function normalizeRequestBody(requestBody: unknown, spec: OpenApiDocument): ApiRequestBody | undefined {
  if (!isRecord(requestBody)) return undefined;
  const resolved = resolveLocalRef(requestBody, spec) ?? requestBody;
  const content = isRecord(resolved.content) ? resolved.content : {};
  const mediaTypes = Object.keys(content).sort();
  const schemaRefs = unique(mediaTypes.flatMap((mediaType) => schemaRefsFromMedia(content[mediaType])));
  const fields = uniqueFields(mediaTypes.flatMap((mediaType) => schemaFieldsFromMedia(content[mediaType], spec)));
  const examples = uniqueExamples(mediaTypes.flatMap((mediaType) => examplesFromMedia(content[mediaType], spec)));

  return {
    required: resolved.required === true,
    mediaTypes,
    schemaRefs,
    ...(fields.length > 0 ? { fields } : {}),
    ...(examples.length > 0 ? { examples } : {}),
  };
}

function normalizeResponses(responses: unknown, spec: OpenApiDocument): ApiResponse[] {
  if (!isRecord(responses)) return [];

  return Object.entries(responses)
    .map(([status, response]) => {
      const record = isRecord(response) ? (resolveLocalRef(response, spec) ?? response) : {};
      const content = isRecord(record.content) ? record.content : {};
      const mediaTypes = Object.keys(content).sort();
      const fields = uniqueFields(mediaTypes.flatMap((mediaType) => responseFieldsFromMedia(content[mediaType], spec)));
      const examples = uniqueExamples(mediaTypes.flatMap((mediaType) => examplesFromMedia(content[mediaType], spec)));
      return {
        status,
        description: stringValue(record.description) ?? "",
        mediaTypes,
        schemaRefs: unique(mediaTypes.flatMap((mediaType) => schemaRefsFromMedia(content[mediaType]))),
        ...(fields.length > 0 ? { fields } : {}),
        ...(examples.length > 0 ? { examples } : {}),
      };
    })
    .sort((a, b) => a.status.localeCompare(b.status));
}

function schemaRefsFromMedia(media: unknown): string[] {
  if (!isRecord(media)) return [];
  return schemaRefFromValue(media.schema) ? [schemaRefFromValue(media.schema)!] : [];
}

function schemaFieldsFromMedia(media: unknown, spec: OpenApiDocument): ApiSchemaField[] {
  if (!isRecord(media) || !isRecord(media.schema)) return [];
  const schema = resolveLocalRef(media.schema, spec) ?? media.schema;
  return schemaFieldsFromSchema(schema, spec, 0);
}

function responseFieldsFromMedia(media: unknown, spec: OpenApiDocument): ApiSchemaField[] {
  if (!isRecord(media) || !isRecord(media.schema)) return [];
  const schema = resolveLocalRef(media.schema, spec) ?? media.schema;
  const fields = schemaFieldsFromSchema(schema, spec, 0);
  if (fields.length > 0) return fields;

  const schemaRef = schemaRefFromValue(media.schema);
  if (!schemaRef) return [];

  const summary = schemaSummaryFromSchema(media.schema, spec, 0);
  const hasSummary = summary.schemaType || summary.oneOf || summary.anyOf || summary.allOf || summary.items;
  return hasSummary ? [{ name: schemaRef, required: false, ...summary }] : [];
}

function schemaFieldsFromSchema(schema: Record<string, unknown>, spec: OpenApiDocument, depth: number): ApiSchemaField[] {
  if (depth > MAX_SCHEMA_DEPTH) return [];
  const resolved = resolveLocalRef(schema, spec) ?? schema;
  const properties = isRecord(resolved.properties) ? resolved.properties : {};
  const required = new Set(Array.isArray(resolved.required) ? resolved.required.filter((item): item is string => typeof item === "string") : []);

  return Object.entries(properties)
    .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]))
    .map(([name, value]) => schemaFieldFromSchema(name, value, required.has(name), spec, depth + 1))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function schemaFieldFromSchema(
  name: string,
  schema: Record<string, unknown>,
  required: boolean,
  spec: OpenApiDocument,
  depth: number,
): ApiSchemaField {
  return {
    name,
    required,
    ...schemaSummaryFromSchema(schema, spec, depth),
  };
}

function schemaSummaryFromSchema(schema: Record<string, unknown>, spec: OpenApiDocument, depth: number): ApiSchemaSummary {
  const resolved = resolveLocalRef(schema, spec) ?? schema;
  const description = stringValue(resolved.description);
  const schemaRef = schemaRefFromValue(schema);
  const schemaType = schemaTypeFromValue(schema, spec);
  const schemaFormat = schemaFormatFromValue(schema, spec);
  const enumValues = enumValuesFromSchema(resolved);
  const defaultValue = compactValue(resolved.default);
  const exampleValue = compactValue(resolved.example);
  const nullable = schemaNullable(resolved);
  const deprecated = resolved.deprecated === true;
  const fields = depth < MAX_SCHEMA_DEPTH ? schemaFieldsFromSchema(resolved, spec, depth) : [];
  const items = depth < MAX_SCHEMA_DEPTH && isRecord(resolved.items)
    ? schemaSummaryFromSchema(resolved.items, spec, depth + 1)
    : undefined;
  const oneOf = compositionSummaries(resolved.oneOf, spec, depth);
  const anyOf = compositionSummaries(resolved.anyOf, spec, depth);
  const allOf = compositionSummaries(resolved.allOf, spec, depth);

  return {
    ...(description ? { description } : {}),
    ...(schemaRef ? { schemaRef } : {}),
    ...(schemaType ? { schemaType } : {}),
    ...(schemaFormat ? { schemaFormat } : {}),
    ...(enumValues ? { enumValues } : {}),
    ...(nullable ? { nullable } : {}),
    ...(deprecated ? { deprecated } : {}),
    ...(defaultValue ? { defaultValue } : {}),
    ...(exampleValue ? { exampleValue } : {}),
    ...(fields.length > 0 ? { fields } : {}),
    ...(items && Object.keys(items).length > 0 ? { items } : {}),
    ...(oneOf ? { oneOf } : {}),
    ...(anyOf ? { anyOf } : {}),
    ...(allOf ? { allOf } : {}),
  };
}

function compositionSummaries(value: unknown, spec: OpenApiDocument, depth: number): ApiSchemaSummary[] | undefined {
  if (depth >= MAX_SCHEMA_DEPTH || !Array.isArray(value)) return undefined;
  const summaries = value
    .filter(isRecord)
    .map((schema) => schemaSummaryFromSchema(schema, spec, depth + 1))
    .filter((summary) => Object.keys(summary).length > 0);
  return summaries.length > 0 ? summaries : undefined;
}

function uniqueFields(fields: ApiSchemaField[]): ApiSchemaField[] {
  const seen = new Set<string>();
  const result: ApiSchemaField[] = [];
  for (const field of fields) {
    if (seen.has(field.name)) continue;
    seen.add(field.name);
    result.push(field);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function examplesFromMedia(media: unknown, spec: OpenApiDocument): ApiExample[] {
  if (!isRecord(media)) return [];
  const examples: ApiExample[] = [];
  const directExample = compactValue(media.example);
  if (directExample) examples.push({ value: directExample });

  if (isRecord(media.examples)) {
    for (const [name, example] of Object.entries(media.examples)) {
      const resolved = isRecord(example) ? (resolveLocalRef(example, spec) ?? example) : example;
      const exampleValue = isRecord(resolved) && "value" in resolved ? resolved.value : resolved;
      const value = compactValue(exampleValue);
      if (!value) continue;
      const summary = isRecord(resolved) ? stringValue(resolved.summary) : undefined;
      const description = isRecord(resolved) ? stringValue(resolved.description) : undefined;
      examples.push({
        name,
        ...(summary ? { summary } : {}),
        ...(description ? { description } : {}),
        value,
      });
    }
  }

  return examples;
}

function uniqueExamples(examples: ApiExample[]): ApiExample[] {
  const seen = new Set<string>();
  const result: ApiExample[] = [];
  for (const example of examples) {
    const key = `${example.name ?? ""}:${example.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(example);
  }
  return result;
}

function schemaRefFromValue(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const ref = stringValue(value.$ref);
  if (!ref) return undefined;
  return ref.split("/").filter(Boolean).at(-1);
}

function schemaTypeFromValue(value: Record<string, unknown>, spec: OpenApiDocument): string | undefined {
  const resolved = resolveLocalRef(value, spec) ?? value;
  const type = schemaTypeName(resolved.type);
  if (type) return type;
  if (Array.isArray(resolved.oneOf)) return "oneOf";
  if (Array.isArray(resolved.anyOf)) return "anyOf";
  if (Array.isArray(resolved.allOf)) return "allOf";
  const ref = schemaRefFromValue(value);
  if (ref) return ref;
  return undefined;
}

function schemaFormatFromValue(value: Record<string, unknown>, spec: OpenApiDocument): string | undefined {
  const resolved = resolveLocalRef(value, spec) ?? value;
  const format = stringValue(resolved.format);
  if (format) return format;
  if (schemaTypeName(resolved.type) === "array" && isRecord(resolved.items)) {
    return schemaFormatFromValue(resolved.items, spec);
  }
  return undefined;
}

function enumValuesFromSchema(schema: Record<string, unknown>): string[] | undefined {
  if (!Array.isArray(schema.enum)) return undefined;
  const values = schema.enum
    .filter((value): value is string | number | boolean => ["string", "number", "boolean"].includes(typeof value))
    .map(String);
  return values.length > 0 ? values : undefined;
}

function schemaNullable(schema: Record<string, unknown>): boolean {
  return schema.nullable === true || (Array.isArray(schema.type) && schema.type.includes("null"));
}

function schemaTypeName(type: unknown): string | undefined {
  if (typeof type === "string") return type;
  if (!Array.isArray(type)) return undefined;
  return type.find((item): item is string => typeof item === "string" && item !== "null");
}

function compactValue(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const output = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!output) return undefined;
  return output.length > MAX_EXAMPLE_LENGTH ? `${output.slice(0, MAX_EXAMPLE_LENGTH)}...` : output;
}

function resolveLocalRef(value: Record<string, unknown>, spec: OpenApiDocument): Record<string, unknown> | undefined {
  const ref = stringValue(value.$ref);
  if (!ref?.startsWith("#/")) return undefined;
  const resolved = ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce<unknown>((current, part) => isRecord(current) ? current[part] : undefined, spec);
  return isRecord(resolved) ? resolved : undefined;
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

function normalizeServerUrls(spec: OpenApiDocument): ApiServerUrl[] | undefined {
  const servers = spec.servers
    ?.filter((server) => typeof server.url === "string" && server.url.length > 0)
    .map((server) => ({
      url: server.url,
      ...(typeof server.description === "string" && server.description.length > 0 ? { description: server.description } : {}),
    }));
  return servers && servers.length > 0 ? servers : undefined;
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
