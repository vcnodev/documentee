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
      { name: "id", location: "path", required: true, schemaRef: undefined, schemaType: "string" },
      { name: "preview", location: "query", required: false, schemaRef: undefined, schemaType: "boolean" },
    ]);
    expect(operation.requestBody).toEqual({
      required: false,
      mediaTypes: ["application/json"],
      schemaRefs: ["UpdateMessageRequest"],
      fields: [{ name: "text", required: false, schemaType: "string" }],
    });
    expect(operation.responses).toEqual([
      {
        status: "200",
        description: "Updated",
        mediaTypes: ["application/json"],
        schemaRefs: ["Message"],
        fields: [{ name: "id", required: false, schemaType: "string" }],
      },
      { status: "404", description: "Missing", mediaTypes: [], schemaRefs: [] },
    ]);
    expect(operation.beta).toBe(true);
    expect(operation.codeSamples).toEqual([{ lang: "curl", source: "curl https://api.acme.test/messages/id" }]);
    expect(JSON.stringify(operation)).not.toContain("properties");
  });

  it("normalizes compact display metadata for parameters and multipart request fields", () => {
    const spec: OpenApiDocument = {
      openapi: "3.0.0",
      info: { title: "SwingSwap Backend API", version: "1.0.0" },
      paths: {
        "/products/upload": {
          post: {
            operationId: "uploadProduct",
            summary: "Create product with file upload",
            tags: ["Products"],
            parameters: [
              {
                name: "condition",
                in: "query",
                description: "Product condition filter.",
                schema: { type: "string", enum: ["new", "used"] },
              },
            ],
            requestBody: {
              required: true,
              content: {
                "multipart/form-data": {
                  schema: { $ref: "#/components/schemas/ProductUploadRequest" },
                },
              },
            },
            responses: {
              "201": { description: "Product created with images" },
            },
          },
        },
      },
      components: {
        schemas: {
          ProductUploadRequest: {
            type: "object",
            required: ["images", "title"],
            properties: {
              images: {
                type: "array",
                description: "Product images.",
                items: { type: "string", format: "binary" },
              },
              title: {
                type: "string",
                description: "Product title.",
              },
              price: {
                type: "number",
                format: "float",
                description: "Asking price.",
              },
            },
          },
        },
      },
    };

    const [operation] = normalizeOperations("core", "/api-reference", spec);

    expect(operation.parameters).toContainEqual({
      name: "condition",
      location: "query",
      required: false,
      description: "Product condition filter.",
      schemaRef: undefined,
      schemaType: "string",
      enumValues: ["new", "used"],
    });
    expect(operation.requestBody).toEqual({
      required: true,
      mediaTypes: ["multipart/form-data"],
      schemaRefs: ["ProductUploadRequest"],
      fields: [
        {
          name: "images",
          required: true,
          description: "Product images.",
          schemaType: "array",
          schemaFormat: "binary",
          items: {
            schemaType: "string",
            schemaFormat: "binary",
          },
        },
        {
          name: "price",
          required: false,
          description: "Asking price.",
          schemaType: "number",
          schemaFormat: "float",
        },
        {
          name: "title",
          required: true,
          description: "Product title.",
          schemaType: "string",
        },
      ],
    });
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
    expect(operation.parameters).toContainEqual({ name: "x-trace-id", location: "header", required: false, schemaRef: undefined, schemaType: "string" });
    expect(operation.requestBody?.required).toBe(true);
  });

  it("uses the first OpenAPI server URL as playground base URL when no override is configured", () => {
    const spec: OpenApiDocument = {
      openapi: "3.1.0",
      info: { title: "Acme", version: "1.0.0" },
      servers: [
        { url: "https://api.acme.test", description: "Production" },
        { url: "https://sandbox.acme.test", description: "Sandbox" },
      ],
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
    expect(operation.serverUrl).toBe("https://api.acme.test");
    expect(operation.serverUrls).toEqual([
      { url: "https://api.acme.test", description: "Production" },
      { url: "https://sandbox.acme.test", description: "Sandbox" },
    ]);
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
      { name: "traceId", location: "header", required: false, schemaRef: "TraceId", schemaType: "string" },
    ]);
    expect(operation.requestBody).toEqual({
      required: true,
      mediaTypes: ["application/json", "application/xml"],
      schemaRefs: ["CreateMessage"],
    });
    expect(operation.responses).toEqual([
      {
        status: "201",
        description: "Created",
        mediaTypes: ["application/json"],
        schemaRefs: ["Message"],
        fields: [{ name: "Message", required: false, schemaRef: "Message", schemaType: "object" }],
      },
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
    expect(operation.responses[0].fields).toEqual([
      {
        name: "SearchResult",
        required: false,
        schemaRef: "SearchResult",
        schemaType: "oneOf",
        oneOf: [
          { schemaRef: "UserResult", schemaType: "object", fields: [{ name: "kind", required: false }] },
          { schemaRef: "MessageResult", schemaType: "object", fields: [{ name: "kind", required: false }] },
        ],
      },
    ]);
    expect(JSON.stringify(operation)).not.toContain("properties");
    expect(JSON.stringify(operation)).not.toContain("const");
  });

  it("normalizes rich request and response schema metadata compactly", () => {
    const spec: OpenApiDocument = {
      openapi: "3.1.0",
      info: { title: "Acme", version: "1.0.0" },
      paths: {
        "/messages": {
          post: {
            operationId: "createMessage",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateMessageRequest" },
                  examples: {
                    queued: {
                      summary: "Queued message",
                      value: { status: "queued", profile: { displayName: "Ada" } },
                    },
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Created",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Message" },
                    example: { id: "msg_123", status: "queued" },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          CreateMessageRequest: {
            type: "object",
            required: ["status", "profile", "attachments", "target"],
            properties: {
              status: {
                type: "string",
                description: "Current message status.",
                enum: ["queued", "sent", "failed"],
                default: "queued",
              },
              profile: {
                type: "object",
                description: "Sender profile.",
                required: ["displayName"],
                properties: {
                  displayName: { type: "string", example: "Ada" },
                  timezone: { type: ["string", "null"], nullable: true },
                },
              },
              attachments: {
                type: "array",
                description: "Files to include.",
                items: { $ref: "#/components/schemas/Attachment" },
              },
              target: {
                oneOf: [
                  { $ref: "#/components/schemas/UserTarget" },
                  { $ref: "#/components/schemas/ChannelTarget" },
                ],
              },
              legacyId: {
                type: "string",
                deprecated: true,
                nullable: true,
              },
              tags: {
                type: "array",
                items: { type: "string", enum: ["urgent", "internal"] },
              },
            },
          },
          Attachment: {
            type: "object",
            required: ["url"],
            properties: {
              url: { type: "string", format: "uri" },
            },
          },
          UserTarget: { type: "object", properties: { userId: { type: "string" } } },
          ChannelTarget: { type: "object", properties: { channelId: { type: "string" } } },
          Message: {
            allOf: [
              { $ref: "#/components/schemas/MessageBase" },
              {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["queued", "sent", "failed"] },
                },
              },
            ],
          },
          MessageBase: {
            type: "object",
            properties: {
              id: { type: "string" },
            },
          },
        },
      },
    };

    const [operation] = normalizeOperations("core", "/api-reference", spec);

    expect(operation.requestBody).toMatchObject({
      required: true,
      mediaTypes: ["application/json"],
      schemaRefs: ["CreateMessageRequest"],
      examples: [
        {
          name: "queued",
          summary: "Queued message",
          value: '{\n  "status": "queued",\n  "profile": {\n    "displayName": "Ada"\n  }\n}',
        },
      ],
    });
    expect(operation.requestBody?.fields).toContainEqual({
      name: "status",
      required: true,
      description: "Current message status.",
      schemaType: "string",
      enumValues: ["queued", "sent", "failed"],
      defaultValue: "queued",
    });
    expect(operation.requestBody?.fields).toContainEqual({
      name: "legacyId",
      required: false,
      schemaType: "string",
      nullable: true,
      deprecated: true,
    });
    expect(operation.requestBody?.fields).toContainEqual({
      name: "profile",
      required: true,
      description: "Sender profile.",
      schemaType: "object",
      fields: [
        { name: "displayName", required: true, schemaType: "string", exampleValue: "Ada" },
        { name: "timezone", required: false, schemaType: "string", nullable: true },
      ],
    });
    expect(operation.requestBody?.fields).toContainEqual({
      name: "attachments",
      required: true,
      description: "Files to include.",
      schemaType: "array",
      items: {
        schemaRef: "Attachment",
        schemaType: "object",
        fields: [{ name: "url", required: true, schemaType: "string", schemaFormat: "uri" }],
      },
    });
    expect(operation.requestBody?.fields).toContainEqual({
      name: "target",
      required: true,
      schemaType: "oneOf",
      oneOf: [
        { schemaRef: "UserTarget", schemaType: "object", fields: [{ name: "userId", required: false, schemaType: "string" }] },
        { schemaRef: "ChannelTarget", schemaType: "object", fields: [{ name: "channelId", required: false, schemaType: "string" }] },
      ],
    });
    expect(operation.requestBody?.fields).toContainEqual({
      name: "tags",
      required: false,
      schemaType: "array",
      items: {
        schemaType: "string",
        enumValues: ["urgent", "internal"],
      },
    });
    expect(operation.responses[0]).toMatchObject({
      status: "201",
      examples: [{ value: '{\n  "id": "msg_123",\n  "status": "queued"\n}' }],
      fields: [
        {
          name: "Message",
          required: false,
          schemaRef: "Message",
          schemaType: "allOf",
          allOf: [
            { schemaRef: "MessageBase", schemaType: "object", fields: [{ name: "id", required: false, schemaType: "string" }] },
            { schemaType: "object", fields: [{ name: "status", required: false, schemaType: "string", enumValues: ["queued", "sent", "failed"] }] },
          ],
        },
      ],
    });
    expect(JSON.stringify(operation)).not.toContain("properties");
    expect(JSON.stringify(operation)).not.toContain("components");
  });
});
