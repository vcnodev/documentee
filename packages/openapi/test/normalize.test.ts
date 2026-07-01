import { describe, expect, it } from "vitest";
import { normalizeOperations } from "../src/normalize.js";
import type { OpenApiDocument } from "../src/types.js";

describe("normalizeOperations", () => {
  it("extracts operations and stable routes without inlining schemas", () => {
    const spec: OpenApiDocument = {
      openapi: "3.1.0",
      info: { title: "Acme", version: "1.0.0" },
      paths: {
        "/messages": {
          get: {
            operationId: "listMessages",
            summary: "List messages",
            tags: ["Messages"],
            responses: { "200": { description: "OK" } },
          },
        },
        "/messages/{id}": {
          post: {
            summary: "Update message",
            tags: ["Messages"],
            responses: { "200": { description: "OK" } },
          },
        },
      },
      components: {
        schemas: {
          Message: {
            type: "object",
            properties: { id: { type: "string" } },
          },
        },
      },
    };

    const operations = normalizeOperations("core", "/api-reference", spec);

    expect(operations).toHaveLength(2);
    expect(operations[0]).toMatchObject({
      method: "GET",
      path: "/messages",
      slug: "list-messages",
      route: "/api-reference/list-messages",
      summary: "List messages",
    });
    expect(JSON.stringify(operations)).not.toContain("properties");
  });

  it("normalizes auth, parameters, request body, responses, and schema references compactly", () => {
    const spec: OpenApiDocument = {
      openapi: "3.1.0",
      info: { title: "Acme", version: "1.0.0" },
      paths: {
        "/messages/{id}": {
          patch: {
            operationId: "updateMessage",
            summary: "Update a message",
            tags: ["Messages"],
            parameters: [
              { name: "id", in: "path", required: true, schema: { type: "string" } },
              { name: "preview", in: "query", schema: { type: "boolean" } },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UpdateMessageRequest" },
                },
              },
            },
            responses: {
              "200": {
                description: "Updated",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Message" },
                  },
                },
              },
              "404": { description: "Missing" },
            },
            security: [{ bearerAuth: [] }],
            "x-beta": true,
            "x-codeSamples": [
              { lang: "curl", source: "curl https://api.acme.test/messages/id" },
            ],
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
        },
        schemas: {
          UpdateMessageRequest: { type: "object", properties: { text: { type: "string" } } },
          Message: { type: "object", properties: { id: { type: "string" } } },
        },
      },
    };

    const [operation] = normalizeOperations("core", "/api-reference", spec);

    expect(operation.auth).toEqual(["bearerAuth"]);
    expect(operation.parameters).toEqual([
      { name: "id", location: "path", required: true, schemaRef: undefined },
      { name: "preview", location: "query", required: false, schemaRef: undefined },
    ]);
    expect(operation.requestBody).toEqual({
      required: false,
      mediaTypes: ["application/json"],
      schemaRefs: ["UpdateMessageRequest"],
    });
    expect(operation.responses).toEqual([
      { status: "200", description: "Updated", mediaTypes: ["application/json"], schemaRefs: ["Message"] },
      { status: "404", description: "Missing", mediaTypes: [], schemaRefs: [] },
    ]);
    expect(operation.beta).toBe(true);
    expect(operation.codeSamples).toEqual([{ lang: "curl", source: "curl https://api.acme.test/messages/id" }]);
    expect(JSON.stringify(operation)).not.toContain("properties");
  });

  it("attaches enabled playground metadata with configured base URL", () => {
    const spec: OpenApiDocument = {
      openapi: "3.1.0",
      info: { title: "Acme", version: "1.0.0" },
      servers: [{ url: "https://fallback.acme.test" }],
      paths: {
        "/messages/{id}": {
          post: {
            operationId: "createMessage",
            parameters: [
              { name: "id", in: "path", required: true, schema: { type: "string" } },
              { name: "preview", in: "query", schema: { type: "boolean" } },
              { name: "x-trace-id", in: "header", schema: { type: "string" } },
            ],
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object" } } },
            },
            responses: { "201": { description: "Created" } },
          },
        },
      },
    };

    const [operation] = normalizeOperations("core", "/api-reference", spec, {
      playground: {
        enabled: true,
        baseUrl: "https://api.acme.test",
        auth: "bearer",
        apiKeyLocation: "header",
      },
    });

    expect(operation.playground).toEqual({
      enabled: true,
      baseUrl: "https://api.acme.test",
      auth: "bearer",
      apiKeyLocation: "header",
    });
    expect(operation.parameters).toContainEqual({ name: "x-trace-id", location: "header", required: false, schemaRef: undefined });
    expect(operation.requestBody?.required).toBe(true);
  });

  it("uses the first OpenAPI server URL as playground base URL when no override is configured", () => {
    const spec: OpenApiDocument = {
      openapi: "3.1.0",
      info: { title: "Acme", version: "1.0.0" },
      servers: [{ url: "https://api.acme.test" }],
      paths: {
        "/messages": {
          get: {
            operationId: "listMessages",
            responses: { "200": { description: "OK" } },
          },
        },
      },
    };

    const [operation] = normalizeOperations("core", "/api-reference", spec, {
      playground: {
        enabled: true,
        auth: "none",
        apiKeyLocation: "header",
      },
    });

    expect(operation.playground?.baseUrl).toBe("https://api.acme.test");
  });

  it("normalizes OpenAPI 3.0 component refs and root security compactly", () => {
    const spec: OpenApiDocument = {
      openapi: "3.0.3",
      info: { title: "Acme", version: "1.0.0" },
      security: [{ apiKeyAuth: [] }],
      paths: {
        "/messages": {
          post: {
            operationId: "createMessage",
            parameters: [{ $ref: "#/components/parameters/TraceId" }],
            requestBody: { $ref: "#/components/requestBodies/CreateMessageBody" },
            responses: {
              "201": { $ref: "#/components/responses/MessageCreated" },
            },
            "x-codeSamples": [
              { language: "JavaScript", code: "fetch('/messages')" },
            ],
          },
        },
      },
      components: {
        parameters: {
          TraceId: {
            name: "traceId",
            in: "header",
            schema: { $ref: "#/components/schemas/TraceId" },
          },
        },
        requestBodies: {
          CreateMessageBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CreateMessage" } },
              "application/xml": { schema: { $ref: "#/components/schemas/CreateMessage" } },
            },
          },
        },
        responses: {
          MessageCreated: {
            description: "Created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Message" } },
            },
          },
        },
        schemas: {
          TraceId: { type: "string", nullable: true },
          CreateMessage: { type: "object" },
          Message: { type: "object" },
        },
        securitySchemes: {
          apiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
        },
      },
    };

    const [operation] = normalizeOperations("core", "/api-reference", spec);

    expect(operation.auth).toEqual(["apiKeyAuth"]);
    expect(operation.parameters).toEqual([
      { name: "traceId", location: "header", required: false, schemaRef: "TraceId" },
    ]);
    expect(operation.requestBody).toEqual({
      required: true,
      mediaTypes: ["application/json", "application/xml"],
      schemaRefs: ["CreateMessage"],
    });
    expect(operation.responses).toEqual([
      { status: "201", description: "Created", mediaTypes: ["application/json"], schemaRefs: ["Message"] },
    ]);
    expect(operation.codeSamples).toEqual([{ lang: "JavaScript", source: "fetch('/messages')" }]);
    expect(JSON.stringify(operation)).not.toContain("nullable");
  });

  it("normalizes OpenAPI 3.1 composed schemas by reference name", () => {
    const spec: OpenApiDocument = {
      openapi: "3.1.0",
      info: { title: "Acme", version: "1.0.0" },
      paths: {
        "/search": {
          get: {
            operationId: "search",
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/SearchResult" },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          SearchResult: {
            oneOf: [
              { $ref: "#/components/schemas/UserResult" },
              { $ref: "#/components/schemas/MessageResult" },
            ],
          },
          UserResult: { type: "object", properties: { kind: { const: "user" } } },
          MessageResult: { type: "object", properties: { kind: { const: "message" } } },
        },
      },
    };

    const [operation] = normalizeOperations("core", "/api-reference", spec);

    expect(operation.responses[0].schemaRefs).toEqual(["SearchResult"]);
    expect(JSON.stringify(operation)).not.toContain("oneOf");
    expect(JSON.stringify(operation)).not.toContain("const");
  });
});
