export interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, OpenApiOperation | unknown>>;
  components?: Record<string, unknown>;
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  security?: Array<Record<string, unknown>>;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
  security?: Array<Record<string, unknown>>;
  deprecated?: boolean;
  "x-beta"?: boolean;
  "x-codeSamples"?: unknown[];
}

export interface ApiParameter {
  name: string;
  location: string;
  required: boolean;
  description?: string;
  schemaRef?: string;
  schemaType?: string;
  schemaFormat?: string;
  enumValues?: string[];
}

export type ApiPlaygroundAuth = "none" | "bearer" | "apiKey";
export type ApiPlaygroundApiKeyLocation = "header" | "query";

export interface ApiServerUrl {
  url: string;
  description?: string;
}

export interface ApiPlaygroundEnvironment {
  name: string;
  baseUrl: string;
}

export interface ApiPlayground {
  enabled: boolean;
  baseUrl?: string;
  auth: ApiPlaygroundAuth;
  apiKeyName?: string;
  apiKeyLocation: ApiPlaygroundApiKeyLocation;
  environments?: ApiPlaygroundEnvironment[];
}

export interface ApiRequestBody {
  required: boolean;
  mediaTypes: string[];
  schemaRefs: string[];
  fields?: ApiSchemaField[];
  examples?: ApiExample[];
}

export interface ApiSchemaSummary {
  description?: string;
  schemaRef?: string;
  schemaType?: string;
  schemaFormat?: string;
  enumValues?: string[];
  nullable?: boolean;
  deprecated?: boolean;
  defaultValue?: string;
  exampleValue?: string;
  fields?: ApiSchemaField[];
  items?: ApiSchemaSummary;
  oneOf?: ApiSchemaSummary[];
  anyOf?: ApiSchemaSummary[];
  allOf?: ApiSchemaSummary[];
}

export interface ApiSchemaField extends ApiSchemaSummary {
  name: string;
  required: boolean;
}

export interface ApiResponse {
  status: string;
  description: string;
  mediaTypes: string[];
  schemaRefs: string[];
  fields?: ApiSchemaField[];
  examples?: ApiExample[];
}

export interface ApiCodeSample {
  lang: string;
  source: string;
}

export interface ApiExample {
  name?: string;
  summary?: string;
  description?: string;
  value: string;
}

export interface ApiOperation {
  specId: string;
  method: string;
  path: string;
  slug: string;
  route: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  deprecated: boolean;
  beta: boolean;
  auth: string[];
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
  codeSamples: ApiCodeSample[];
  serverUrl?: string;
  serverUrls?: ApiServerUrl[];
  playground?: ApiPlayground;
}
